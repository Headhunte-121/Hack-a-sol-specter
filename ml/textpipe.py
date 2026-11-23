"""Reference text pipeline for the on-device scam detector (Python side).

The TypeScript implementation in apps/web/src/detector mirrors this file exactly; `parity.py` proves it.
Rules of the game (keep both sides identical):
  - normalise: Unicode NFKC per character (fancy fonts, full-width letters), Cyrillic look-alike letters -> Latin, chandrabindu -> anusvara,
    lowercase ASCII, Devanagari digits -> ASCII digits, collapse spaces and 3+ repeated letters, join spelled-out letters ("O T P" -> "otp")
  - mask: links / phone numbers / amounts / long digit runs become placeholder tokens
  - tokens: runs of [a-z0-9] and Devanagari (U+0900-0963, U+0966-097F); everything else separates tokens; a token that mixes letters and digits
    ("bl0ck", "0tp") is un-leeted only when the result is a word of canon.json's leet_vocab
  - features: char n-grams inside words (with space padding), word unigrams and bigrams, one shadow feature "x:<latin>" for every Devanagari
    loanword in canon.json (so ओटीपी and otp share evidence), signal flags
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from pathlib import Path

HERE = Path(__file__).parent
ENTITY_TOKENS = {"urltok", "urlshorttok", "urlsusptok", "urlgovtok", "urlbrandtok", "phonetok", "amounttok", "numtok"}
SHORTENERS = ("bit.ly", "tinyurl.com", "rb.gy", "cutt.ly", "t.co", "goo.gl", "is.gd", "tiny.cc", "shorturl.at")
SUSPICIOUS_TLDS = ("top", "xyz", "cc", "win", "info", "help", "club", "click", "online", "site", "link")

_dom_path = HERE / "domains.json"
if _dom_path.exists():
    with open(_dom_path, encoding="utf-8") as _df:
        _dom_data = json.load(_df)
        GOV_SUFFIXES = tuple(_dom_data.get("gov_suffixes", ["gov.in", "nic.in"]))
        OFFICIAL_DOMAINS = tuple(_dom_data.get("official", []))
else:
    GOV_SUFFIXES = ("gov.in", "nic.in")
    OFFICIAL_DOMAINS = ()

NUKTA_MAP = {
    "\u0958": "\u0915",  # क़ -> क
    "\u0959": "\u0916",  # ख़ -> ख
    "\u095a": "\u0917",  # ग़ -> ग
    "\u095b": "\u091c",  # ज़ -> ज
    "\u095c": "\u0921",  # ड़ -> ड
    "\u095d": "\u0922",  # ढ़ -> ढ
    "\u095e": "\u092b",  # फ़ -> फ
    "\u095f": "\u092f",  # य़ -> य
}

# canon.json is shared with apps/web/src/detector/canon.json (kept identical by parity.test.ts): Devanagari loanwords -> Latin canon, and the
# words a leetspeak token ("bl0ck") may be turned back into.
with open(HERE / "canon.json", encoding="utf-8") as _cf:
    _canon_data = json.load(_cf)
CANON: dict[str, str] = {k.replace("\u093c", "").replace("\u0901", "\u0902"): v for k, v in _canon_data["canon"].items()}
CANON_LATIN = frozenset(CANON.values())
LEET_VOCAB = frozenset(_canon_data["leet_vocab"])
LEET_MAP = {"0": "o", "1": "il", "3": "e", "4": "a", "5": "s"}

# Cyrillic letters that look like Latin ones (used to dodge word lists): folded to the Latin letter
CYRILLIC_FOLD = {
    "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c", "\u0445": "x", "\u0443": "y", "\u0456": "i", "\u0455": "s", "\u0458": "j",
    "\u0410": "a", "\u0412": "b", "\u0415": "e", "\u041a": "k", "\u041c": "m", "\u041d": "h", "\u041e": "o", "\u0420": "p", "\u0421": "c", "\u0422": "t",
    "\u0425": "x", "\u0423": "y", "\u0406": "i",
}
# "O T P", "O.T.P", "o-t-p", "K Y C": three or more single letters joined by one space, dot, dash or underscore
JOIN_RE = re.compile(r"(?<![a-z0-9@/._-])(?:[a-z][ ._-]){2,}[a-z](?![a-z0-9])")

URL_RE = re.compile(
    r"(?:https?://|www\.)[^ ]+"
    r"|(?<![a-z0-9@.-])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|in|net|org|co|io|me|xyz|top|info|help|cc|win|club|online|site|link|app|ly|gl|gov|edu|apk)(?:/[^ ]*)?(?![a-z0-9])"
)
PHONE_RE = re.compile(r"(?<![0-9])(?:\+?91[- ]?)?[6-9][0-9]{4}[ -]?[0-9]{5}(?![0-9])")
AMOUNT_RE = re.compile(
    r"(?<![a-z])(?:₹|rs\.?|inr|रु\.?|रुपये|रुपए|rupees?) ?[0-9][0-9,]*(?:\.[0-9]+)?"
    r"|[0-9][0-9,]*(?:\.[0-9]+)? ?(?:₹|rs|inr|rupees?|(?:rupaye|rupaiye|rupiye|rupiya|rupaiya|rupaya|rupya|rupay)|रुपये|रुपए|रुपया|रुपयों|lakhs?|लाख|crore|करोड़|करोड)(?![a-z])"
)
NUMBER_RE = re.compile(r"[0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{4,}")  # 10,000 and 25,00,000 are one number, not "10" and "000"
TRAIL = ".,;:!?)]}\"'"


def normalize_text(raw: str) -> tuple[str, list[int]]:
    """Return clean text and, for every clean char, the index of the original char it came from."""
    out: list[str] = []
    idx: list[int] = []
    for i, ch0 in enumerate(raw):
        for ch in unicodedata.normalize("NFKC", ch0):  # per character, so every output char still maps to input char i
            if ch in NUKTA_MAP:
                ch = NUKTA_MAP[ch]
            elif ch == "\u093c":
                continue
            elif ch == "\u0901":
                ch = "\u0902"  # chandrabindu -> anusvara
            ch = CYRILLIC_FOLD.get(ch, ch)
            o = ord(ch)
            if 0x966 <= o <= 0x96F:
                ch = chr(48 + o - 0x966)
            elif 65 <= o <= 90:
                ch = chr(o + 32)
            elif ch in "\u200b\u200c\u200d\ufeff":
                continue
            elif ch in " \t\n\r\u00a0":
                ch = " "
            if ch == " ":
                if not out or out[-1] == " ":
                    continue
            elif "a" <= ch <= "z" and len(out) >= 2 and out[-1] == ch and out[-2] == ch:
                continue  # collapse 3+ repeated letters to 2
            out.append(ch)
            idx.append(i)
    if out and out[-1] == " ":
        out.pop(); idx.pop()
    # join letters that were spelled out one by one ("o t p" -> "otp"), keeping the span of the original letters
    text = "".join(out)
    if JOIN_RE.search(text):
        keep = [True] * len(out)
        for m in JOIN_RE.finditer(text):
            for k in range(m.start(), m.end()):
                if not ("a" <= out[k] <= "z"):
                    keep[k] = False
        out = [c for c, k in zip(out, keep) if k]
        idx = [x for x, k in zip(idx, keep) if k]
    return "".join(out), idx


def unleet(w: str) -> str:
    """"bl0ck" -> "block", "0tp" -> "otp": only for a token that mixes ASCII letters and digits, is at least 3 long and becomes a word of LEET_VOCAB."""
    if len(w) < 3 or not w.isascii() or not any("a" <= c <= "z" for c in w) or not any("0" <= c <= "9" for c in w):
        return w
    digits = [k for k, c in enumerate(w) if c in LEET_MAP]
    if not digits or len(digits) > 4:
        return w
    cands = [""]
    last = 0
    for k in digits:
        opts = LEET_MAP[w[k]]
        cands = [c + w[last:k] + o for c in cands for o in opts]
        last = k + 1
    for c in cands:
        cand = c + w[last:]
        if cand in LEET_VOCAB:
            return cand
    return w


def shadow(w: str) -> str | None:
    """The canonical Latin form of a word that has one (Devanagari loanword, or the Latin word itself), else None."""
    c = CANON.get(w)
    if c is not None:
        return c
    return w if w in CANON_LATIN else None


def _link_token(url: str) -> str:
    u = url
    for p in ("https://", "http://"):
        if u.startswith(p):
            u = u[len(p):]
    host = u.split("/")[0]
    if any(host == s or host.endswith("." + s) for s in SHORTENERS):
        return "urlshorttok"
    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    if tld in SUSPICIOUS_TLDS or host.endswith(".in.net"):
        return "urlsusptok"
    if any(host == s or host.endswith("." + s) for s in GOV_SUFFIXES):
        return "urlgovtok"
    if any(host == s or host.endswith("." + s) for s in OFFICIAL_DOMAINS):
        return "urlbrandtok"
    return "urltok"


def _find_entities(s: str) -> list[tuple[int, int, str]]:
    taken: list[tuple[int, int, str]] = []

    def free(a: int, b: int) -> bool:
        return all(b <= x or a >= y for x, y, _ in taken)

    for m in URL_RE.finditer(s):
        a, b = m.start(), m.end()
        while b > a and s[b - 1] in TRAIL:
            b -= 1
        if b > a and free(a, b):
            taken.append((a, b, _link_token(s[a:b])))
    for rx, tok in ((PHONE_RE, "phonetok"), (AMOUNT_RE, "amounttok"), (NUMBER_RE, "numtok")):
        for m in rx.finditer(s):
            if free(m.start(), m.end()):
                taken.append((m.start(), m.end(), tok))
    taken.sort()
    return taken


def _allowed(c: str) -> bool:
    return ("a" <= c <= "z") or ("0" <= c <= "9") or ("ऀ" <= c <= "ॣ") or ("०" <= c <= "ॿ")


def tokenize(raw: str) -> list[dict]:
    """Full pipeline: normalise, mask, tokenise. Each token: text + [start, end) span in the ORIGINAL string."""
    s, idx = normalize_text(raw)
    ents = _find_entities(s)
    tokens: list[dict] = []
    cur: list[str] = []
    cstart = cend = -1

    def flush():
        nonlocal cur, cstart, cend
        if cur:
            tokens.append({"t": unleet("".join(cur)), "s": cstart, "e": cend})
        cur, cstart, cend = [], -1, -1

    i, n, k = 0, len(s), 0
    while i < n:
        if k < len(ents) and ents[k][0] == i:
            a, b, tok = ents[k]
            flush()
            tokens.append({"t": tok, "s": idx[a], "e": idx[b - 1] + 1})
            i, k = b, k + 1
            continue
        c = s[i]
        if _allowed(c):
            if not cur:
                cstart = idx[i]
            cur.append(c)
            cend = idx[i] + 1
        else:
            flush()
        i += 1
    flush()
    return tokens


# ---------------------------------------------------------------- signals
def load_signals(path: Path | None = None) -> dict:
    return json.loads((path or HERE / "signals.json").read_text(encoding="utf-8"))


def _phrase_hits(words: list[str], phrase: str) -> list[tuple[int, int]]:
    toks = phrase.split(" ")
    last_prefix = toks[-1].endswith("*")
    if last_prefix:
        toks[-1] = toks[-1][:-1]
    hits = []
    for i in range(len(words) - len(toks) + 1):
        ok = True
        for j, t in enumerate(toks):
            w = words[i + j]
            if not (w.startswith(t) if (last_prefix and j == len(toks) - 1) else w == t):
                ok = False
                break
        if ok:
            hits.append((i, i + len(toks)))
    return hits


def extract_signals(words: list[str], signals: dict) -> list[dict]:
    fired = []
    for sig in signals["signals"]:
        spans: list[tuple[int, int]] = []
        ok = True
        for group in sig["groups"]:
            gh = [h for p in group for h in _phrase_hits(words, p)]
            if not gh:
                ok = False
                break
            spans += gh
        if ok and sig.get("none"):
            if any(_phrase_hits(words, p) for p in sig["none"]):
                ok = False
        if ok:
            fired.append({"id": sig["id"], "kind": sig["kind"], "spans": sorted(set(spans))})
    return fired


# ---------------------------------------------------------------- features
def char_ngrams(word: str, lo: int, hi: int):
    p = " " + word + " "
    for n in range(lo, hi + 1):
        for i in range(len(p) - n + 1):
            yield p[i:i + n]


def text_features(words: list[str], ngram_range=(2, 5)) -> dict[str, int]:
    f: dict[str, int] = {}
    for w in words:
        if w not in ENTITY_TOKENS:
            for g in char_ngrams(w, *ngram_range):
                k = "c:" + g
                f[k] = f.get(k, 0) + 1
        k = "w:" + w
        f[k] = f.get(k, 0) + 1
        sh = None if w in ENTITY_TOKENS else shadow(w)
        if sh is not None:
            k = "x:" + sh
            f[k] = f.get(k, 0) + 1
    for a, b in zip(words, words[1:]):
        k = "b:" + a + " " + b
        f[k] = f.get(k, 0) + 1
    return f


def analyse(raw: str, signals: dict, ngram_range=(2, 5)):
    toks = tokenize(raw)
    words = [t["t"] for t in toks]
    return toks, words, text_features(words, ngram_range), extract_signals(words, signals)


# ---------------------------------------------------------------- model scoring (reads the exported JSON)
class Model:
    def __init__(self, data: dict):
        self.d = data
        self.idx = {f: i for i, f in enumerate(data["features"])}
        self.idf = data["idf"]
        self.coef = data["coef"]
        self.sig_coef = data["signal_coef"]
        self.ngram = tuple(data["char_ngrams"])
        self.signals = None

    @staticmethod
    def load(path: Path) -> "Model":
        return Model(json.loads(Path(path).read_text(encoding="utf-8")))

    def score(self, raw: str, signals: dict | None = None):
        sg = signals or self.signals or load_signals()
        toks, words, feats, fired = analyse(raw, sg, self.ngram)
        vals: dict[int, float] = {}
        for k, c in feats.items():
            i = self.idx.get(k)
            if i is not None:
                vals[i] = (1.0 + math.log(c)) * self.idf[i]
        norm = math.sqrt(sum(v * v for v in vals.values()))
        z = self.d["intercept"]
        if norm > 0:
            z += sum(self.coef[i] * v / norm for i, v in vals.items())
        for s in fired:
            z += self.sig_coef.get(s["id"], 0.0) * self.d["sig_scale"]
        a, b = self.d["calibration"]["a"], self.d["calibration"]["b"]
        p = 1.0 / (1.0 + math.exp(-(a * z + b)))
        return {"z": z, "p": p, "signals": [s["id"] for s in fired], "words": words}
