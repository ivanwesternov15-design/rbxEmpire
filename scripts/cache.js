/**
 * Кэш-слой приложения.
 * localStorage-обёртка с TTL. На дизайн-этапе храним всё в одном ключе состояния;
 * структура готова к расширению (IndexedDB) при подключении бэкенда.
 * TODO(backend): при появлении сервера перевести большие коллекции (история, инвентарь) на IndexedDB.
 */
const Cache = (function () {
  const PREFIX = "rbxflare_";
  const listeners = {};

  function get(key, def = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return def;
      const obj = JSON.parse(raw);
      if (obj.ttl && obj.ts && Date.now() - obj.ts > obj.ttl * 1000) {
        localStorage.removeItem(PREFIX + key);
        return def;
      }
      return obj.v;
    } catch (e) {
      return def;
    }
  }

  function set(key, val, ttl = null) {
    const obj = { v: val, ts: Date.now() };
    if (ttl) obj.ttl = ttl;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(obj));
      notify(key);
    } catch (e) {
      /* квота / приватный режим — игнорируем */
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      notify(key);
    } catch (e) {}
  }

  function notify(key) {
    (listeners[key] || []).slice().forEach((fn) => fn(get(key)));
  }

  function subscribe(key, fn) {
    (listeners[key] = listeners[key] || []).push(fn);
    return function unsubscribe() {
      listeners[key] = (listeners[key] || []).filter((f) => f !== fn);
    };
  }

  return { get, set, remove, subscribe, prefix: PREFIX };
})();