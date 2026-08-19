"""Удобный корневой entry: запускает реальный бэкенд из backend/."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
import main  # noqa: E402

if __name__ == "__main__":
    main.main()