"""BotHost entry: HTTP-сервер (статический фронтенд + JSON API) + поллинг бота.

Отвечает на /start приветствием с кнопкой открытия Mini App, при старте вешает
кнопку меню (setChatMenuButton). Только стандартная библиотека Python.
Start command для BotHost: `cd backend && python main.py` (файл-обёртка в корне репо).
"""
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import app as rbx

BOT_TOKEN = rbx.env("BOT_TOKEN")
APP_URL = rbx.env("APP_URL").strip() or ("https://" + rbx.env("DOMAIN").strip().rstrip("/"))
APP_URL = APP_URL.rstrip("/") + "/"

REF_RE = re.compile(r"^ref_(\d+)$")

WELCOME_TEXT = (
    "Добро пожаловать в Rbx Game! 🎴\n"
    "Открывай ежедневные карточки, собирай коллекцию, "
    "стейкай и выполняй задания — получай Robux."
)
REF_WELCOME_TEXT = (
    "Тебя пригласили в Rbx Game! 🎁\n"
    "Открывай ежедневные карточки, собирай коллекцию, "
    "стейкай и выполняй задания — получай Robux."
)


# ---------------------------------------------------------------- бот
def set_menu_button():
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
    print("[bot] setChatMenuButton ->", bool(res and res.get("ok")), flush=True)


def handle_update(upd):
    msg = upd.get("message") or {}
    text = (msg.get("text") or "").strip()
    if not text:
        return
    chat_id = msg.get("chat", {}).get("id")
    if not chat_id:
        return
    reply = WELCOME_TEXT
    web_url = APP_URL
    if text.startswith("/start"):
        # игрок сразу попадает в список (players.json) — ещё до открытия WebApp
        chat = rbx.tg_api("getChat", params={"chat_id": chat_id})
        pl_name = ""
        pl_username = ""
        if chat and chat.get("ok"):
            r = chat.get("result", {})
            pl_name = ((r.get("first_name") or "") + " " + (r.get("last_name") or "")).strip()
            pl_username = r.get("username") or ""
        rbx.save_player_seen(chat_id, pl_name, pl_username)
        payload = text.split(" ", 1)[1] if " " in text else ""
        m = REF_RE.match(payload) if payload else None
        if m:
            ref_id = int(m.group(1))
            if ref_id != chat_id:
                rbx.save_referral(ref_id, chat_id)
                reply = REF_WELCOME_TEXT
            # startapp в URL кнопки — WebApp получит start_param и продублирует запись
            web_url = APP_URL + "?startapp=ref_" + str(ref_id)
        elif payload:
            reply = "Скоро будет готово! 🔨\n\n" + reply
    rbx.tg_api(
        "sendMessage",
        payload={
            "chat_id": chat_id,
            "text": reply,
            "reply_markup": {
                "inline_keyboard": [
                    [{"text": "🎴 Открыть Rbx Game", "web_app": {"url": web_url}}]
                ]
            },
        },
    )


def poll_loop():
    set_menu_button()
    offset = 0
    while True:
        data = rbx.tg_api("getUpdates", params={"offset": offset, "timeout": 25})
        if not data:
            time.sleep(5)
            continue
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


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print("[http]", fmt % args, flush=True)

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _file(self, status, body, ctype):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.startswith("/api/"):
            status, payload = rbx.handle_api("GET", path, b"")
            self._json(status, payload)
            return
        status, body, ctype = rbx.serve_static(path)
        if status != 200:
            self._json(status, {"ok": False, "error": "not found"})
            return
        self._file(status, body, ctype)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""
        status, payload = rbx.handle_api("POST", path, body)
        self._json(status, payload)


def main():
    if not BOT_TOKEN:
        print("BOT_TOKEN не задан (переменная окружения или backend/.env) — останов.", flush=True)
        return
    threading.Thread(target=poll_loop, daemon=True).start()
    port = int(rbx.env("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"[rbxflare] HTTP on :{port}, frontend: {APP_URL}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()