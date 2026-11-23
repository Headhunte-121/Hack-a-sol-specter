"""Small helpers shared by the content authoring files (content_source.py, content_cards.py, content_lessons_v2.py, content_quiz_v2.py)."""


def L(en, hi, cg):
    """One piece of text in the three languages."""
    return {"en": en, "hi": hi, "cg": cg}


TRUE, FALSE = L("True", "सही", "सही"), L("False", "गलत", "गलत")


def Q(id, topic, diff, kind, q, opts, ans, exp):
    """One quiz question. diff 1, 2 or 3 is the difficulty weight class (see src/learn/score.ts); kind is mcq, tf or scenario."""
    return dict(id=id, topic=topic, difficulty=diff, type=kind, question=q, options=opts, answer=ans, explanation=exp)
