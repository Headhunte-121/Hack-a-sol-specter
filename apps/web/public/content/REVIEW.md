# Content review status

| Content | English | Hindi | Chhattisgarhi |
|---|---|---|---|
| UI strings (`src/i18n`) | written | written (drafted with Claude Code) | **draft, needs native-speaker review** |
| Lessons and quiz (this folder) | written | written (drafted with Claude Code) | **draft, needs native-speaker review** |

Rules for reviewers: keep wording simple; never change the meaning of a safety instruction; numbers (1930), website names and
the words OTP / PIN / UPI stay as people say them locally. Mark reviewed rows here with name and date.
Source files: `scripts/content_source.py` (lessons, quiz) and `scripts/strings_*.py` (UI). Regenerate with
`python scripts/content_source.py` and `python scripts/i18n_add.py scripts/strings_<module>.py`.
