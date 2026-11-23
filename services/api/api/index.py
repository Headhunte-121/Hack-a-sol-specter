import os
import sys

# Ensure parent directory is on sys.path so app module can be resolved
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

__all__ = ["app"]
