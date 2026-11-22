import os
import sys
from pathlib import Path

os.environ.setdefault("API_AUTOSTART", "0")  # importing app.main must not create a database file during tests
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
