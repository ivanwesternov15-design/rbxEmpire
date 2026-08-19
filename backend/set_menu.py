"""Одноразовая установка кнопки меню у бота (необязательно: main.py делает это сам)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import app as rbx  # noqa: E402

APP_URL = rbx.env("APP_URL").strip() or ("https://" + rbx.env("DOMAIN").strip().rstrip("/"))
APP_URL = APP_URL.rstrip("/") + "/"

res = rbx.tg_api(
    "setChatMenuButton",
    payload={
        "menu_button": {
            "type": "web_app",
            "text": "🎴 Rbx Game",
            "web_app": {"url": APP_URL},
        }
    },
)
print("setChatMenuButton ->", bool(res and res.get("ok")), "|", APP_URL)