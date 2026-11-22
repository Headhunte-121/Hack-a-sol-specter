import os
import sys
from pathlib import Path

os.environ.setdefault("ASR_AUTOSTART", "0")  # do not build the real model while importing app.main in tests
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
