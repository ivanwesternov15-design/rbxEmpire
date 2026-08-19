# Запустить один раз, чтобы повесить кнопку Mini App в чате с ботом:
#   cd backend && python set_menu.py
import os

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

TOKEN = os.getenv("BOT_TOKEN", "")
URL = os.getenv("APP_URL", "").rstrip("/") + "/"

if not TOKEN or URL.startswith("https://your-domain"):
    print("Сначала заполни BOT_TOKEN и APP_URL в backend/.env")
    raise SystemExit(1)

resp = requests.post(
    f"https://api.telegram.org/bot{TOKEN}/setChatMenuButton",
    json={
        "menu_button": {
            "type": "web_app",
            "text": "rbxflare",
            "web_app": {"url": URL},
        }
    },
    timeout=15,
)
print(resp.json())
