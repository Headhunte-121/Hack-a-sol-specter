"""The text pipeline's defences against tricks that used to break every word list. apps/web/src/detector/pipeline_robust.test.ts holds the same
cases and expected values for the TypeScript side; the two files must agree."""
import textpipe as tp


def words(t: str) -> str:
    return " ".join(x["t"] for x in tp.tokenize(t))


def test_spelled_out_letters_are_joined():
    assert words("Share your O T P now") == "share your otp now"
    assert words("Share your O.T.P now, K Y C pending") == "share your otp now kyc pending"


def test_fancy_fonts_and_cyrillic_lookalikes_fold():
    assert words("Your 𝐊𝐘𝐂 is pending. Click now") == "your kyc is pending click now"
    assert words("pay now at аmazon (cyrillic a)") == "pay now at amazon cyrillic a"


def test_leetspeak_only_becomes_a_known_word():
    assert words("Your bl0ck notice: verify your acc0unt, 0tp, c1ick v3rify") == "your block notice verify your account otp click verify"
    assert tp.unleet("5g") == "5g"
    assert words("Call 10am or 24hr or 5g plan") == "call 10am or 24hr or 5g plan"


def test_indian_comma_numbers_are_one_number():
    assert words("निवेश करें 10,000 और 7 दिन में पाएं 50,000, गारंटीड") == "निवेश करें numtok और 7 दिन में पाएं numtok गारंटीड"
    assert words("You won 25,00,000 in lottery") == "you won numtok in lottery"
    assert words("Rs 4,500 fee") == "amounttok fee"


def test_hinglish_currency_words_are_amounts():
    assert words("Maine tumhe 500 rupaye UPI se bhej diye, 50 rupiya aur 2 lakh rupaye") == "maine tumhe amounttok upi se bhej diye amounttok aur amounttok rupaye"


def test_chandrabindu_is_unified_and_plain_text_is_left_alone():
    assert words("आपका ओटीपी 482913 है, अकाउंट ब्लॉक हँ") == "आपका ओटीपी numtok है अकाउंट ब्लॉक हं"
    assert words("Call 10am or 24hr or 5g plan, A B C, J. K. Rowling, u.s.a trip") == "call 10am or 24hr or 5g plan abc j k rowling usa trip"


def test_loanword_and_latin_spelling_share_a_shadow_feature():
    assert tp.shadow("ओटीपी") == "otp"
    assert tp.shadow("otp") == "otp"
    assert tp.shadow("घर") is None
    f = tp.text_features([t["t"] for t in tp.tokenize("आपका ओटीपी भेजें otp")])
    assert f["x:otp"] == 2


def test_highlight_span_covers_the_original_letters():
    t = tp.tokenize("Share your O T P now")
    otp = next(x for x in t if x["t"] == "otp")
    assert "Share your O T P now"[otp["s"]:otp["e"]] == "O T P"


def test_new_signals_fire_on_the_tricks_they_were_added_for():
    sg = tp.load_signals()

    def fired(t):
        return {s["id"] for s in tp.analyse(t, sg)[3]}

    assert "qr_receive_trick" in fired("Scan this QR to receive Rs 8,000 payment and enter your UPI PIN")
    assert "qr_receive_trick" not in fired("Never scan a QR code to receive money")
    assert "refund_trick" in fired("Sorry I accidentally sent Rs 5000 to you, please return it and approve the collect request")
    assert "easy_money" in fired("पाएं 50,000 गारंटीड रिटर्न")
    assert "secrecy_or_isolation" in fired("कृपया कॉल मत काटिए")
    assert "kyc_demand" in fired("Aadhaar verification expire ho gaya hai")
