"""Crude Devanagari -> Latin romanisation to imitate Hinglish spelling (e.g. 'आपका खाता' -> 'aapka khata').
Rule-based with schwa deletion; deliberately approximate. Latin text (English loanwords) passes through unchanged."""
import re

V = {"अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o"}
M = {"ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ं": "n", "ँ": "n", "ः": "h"}
C = {"क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n", "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh",
     "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p", "फ": "f", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l",
     "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h", "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f"}
VIRAMA, NUKTA = "्", "़"
PUNCT = {"।": ".", "॥": "."}


def _word(w: str) -> str:
    out, i, n = [], 0, len(w)
    while i < n:
        ch = w[i]
        if i + 1 < n and w[i + 1] == NUKTA and (ch + NUKTA) in C:
            ch, i = ch + NUKTA, i + 1
        if ch in C:
            base = C[ch]
            nxt = w[i + 1] if i + 1 < n else ""
            if nxt == VIRAMA:
                out.append(base); i += 2; continue
            if nxt in M and nxt not in "ंँः":
                out.append(base + M[nxt]); i += 2; continue
            out.append(base + "ª")      # inherent vowel marker; resolved below
            i += 1
        elif ch in V: out.append(V[ch]); i += 1
        elif ch in M: out.append(M[ch]); i += 1
        else: out.append(PUNCT.get(ch, ch)); i += 1
    s = "".join(out)
    res = []
    for k, c in enumerate(s):
        if c != "ª":
            res.append(c); continue
        rest = s[k + 1:]
        keep = bool(rest) and not (any(x in "aeiou" for x in s[:k]) and re.match(r"[^aeiouª]+[aeiouª]", rest))
        if rest and keep: res.append("a")
    s = "".join(res)
    return s.replace("aa", "a").replace("ee", "i").replace("oo", "u")


def to_latin(text: str) -> str:
    return re.sub(r"[ऀ-ॿ]+", lambda m: _word(m.group(0)), text).replace("।", ".")


if __name__ == "__main__":
    for t in ["आपका बैंक खाता आज बंद हो जाएगा।", "तुरंत अपना केवाईसी अपडेट करें", "OTP किसी को न बताएं"]:
        print(t, "->", to_latin(t))
