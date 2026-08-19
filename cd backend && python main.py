/**
 * BotHost исполняет start command как `node "<start command>"`.
 * Start command на платформе: `cd backend && python main.py`,
 * поэтому node ищет модуль /app/cd backend && python main.py.
 * Этот файл существует ровно с таким именем — node находит его и запускает
 * Python-бэкенд через общий лаунчер.
 */
require("./scripts/node-launcher.js")(__dirname);