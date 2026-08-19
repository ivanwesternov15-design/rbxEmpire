"""BotHost entry: Flask (статический фронтенд + API) + поллинг бота.

Отвечает на /start приветствием с кнопкой открытия Mini App,
при старте вешает кнопку меню (setChatMenuButton).
Start command для BotHost: `python main.py` (рабочая директория: backend/).
"""
import os
import threading
import time

import requests
from dotenv import load_dotenv

from app import app as flask_app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
APP_URL = os.getenv("APP_URL", "").strip().rstrip("/") + "/"
API_URL = "https://api.telegram.org/bot" + BOT_TOKEN

WELCOME_TEXT = (
    "Добро пожаловать в rbxflare! 🎴\n"
    "Открывай ежедневные карточки, собирай коллекцию, "
    "стейкай и выполняй задания — получай Robux."
)


def api(method, **params):
    try:
        r = requests.post(API_URL + "/" + method, json=params, timeout=25)
        return r.json()
    except Exception as exc:
        print(f"[bot] {method} error: {exc}", flush=True)
        return {"ok": False}


def set_menu_button():
    res = api(
        "setChatMenuButton",
        menu_button={
            "type": "web_app",
            "text": "🎴 rbxflare",
            "web_app": {"url": APP_URL},
        },
    )
    print("[bot] setChatMenuButton ->", res.get("ok"), flush=True)


def handle_update(upd):
    msg = upd.get("message") or {}
    text = (msg.get("text") or "").strip()
    if not text:
        return
    chat_id = msg.get("chat", {}).get("id")
    if not chat_id:
        return
    reply = WELCOME_TEXT
    if text.startswith("/start"):
        payload = text.split(" ", 1)[1] if " " in text else ""
        if payload and not payload.startswith("ref_"):
            reply = "Скоро будет готово! 🔨\n\n" + reply
    api(
        "sendMessage",
        chat_id=chat_id,
        text=reply,
        reply_markup={
            "inline_keyboard": [
                [{"text": "🎴 Открыть rbxflare", "web_app": {"url": APP_URL}}]
            ]
        },
    )


def poll_loop():
    set_menu_button()
    offset = 0
    while True:
        try:
            r = requests.get(
                API_URL + "/getUpdates",
                params={"offset": offset, "timeout": 25},
                timeout=35,
            )
            data = r.json()
            if not data.get("ok"):
                print("[bot] getUpdates not ok:", data, flush=True)
                time.sleep(5)
                continue
            for upd in data.get("result", []):
                offset = upd["update_id"] + 1
                try:
                    handle_update(upd)
                except Exception as exc:
                    print("[bot] update error:", exc, flush=True)
        except Exception as exc:
            print("[bot] polling error:", exc, flush=True)
            time.sleep(3)


def main():
    if not BOT_TOKEN:
        print("BOT_TOKEN не задан в backend/.env — останов.", flush=True)
        return
    threading.Thread(target=poll_loop, daemon=True).start()
    port = int(os.getenv("PORT", "8080"))
    print(f"[rbxflare] Flask on :{port}, frontend: {APP_URL}", flush=True)
    flask_app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()