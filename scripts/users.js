/**
 * UsersStore — локальное хранилище ВСЕХ пользователей мини-аппа и их данных.
 * Каждый клиент сохраняет себя при входе и при каждом изменении балансов,
 * серверные игроки (API.players) мёржатся сюда же — список не теряется
 * и не зависит от того, кто и когда открывал админку.
 */
const UsersStore = (function () {
  const KEY = "users_v1";
  let map = null;

  function load() {
    if (map) return map;
    const raw = Cache.get(KEY, null);
    map = raw && typeof raw === "object" ? raw : {};
    return map;
  }
  function persist() {
    Cache.set(KEY, map);
  }

  function makeRec(id, info) {
    const name =
      ((info.firstName || "") + " " + (info.lastName || "")).trim() || info.name || "User " + id;
    return {
      id: Number(id),
      name,
      username: info.username || "",
      photoUrl: info.photoUrl || info.photo_url || "",
      role: info.role || "user",
      coins: Number(info.coins) || 0,
      robux: Number(info.robux) || 0,
      streak: Number(info.streak) || 0,
      firstLogin: info.firstLogin ? Number(info.firstLogin) : Date.now(),
      lastLogin: Date.now(),
    };
  }

  /* сохранить/обновить пользователя (полная запись) */
  function saveUser(info) {
    if (!info || info.id == null) return null;
    const m = load();
    const key = String(info.id);
    const prev = m[key] || {};
    const rec = makeRec(Number(info.id), info);
    rec.firstLogin = prev.firstLogin || rec.firstLogin;
    m[key] = rec;
    persist();
    return rec;
  }

  /* текущий игрок: ТГ-профиль + балансы из State */
  function saveCurrent() {
    if (!window.TG || !TG.hasUserData()) return null;
    const u = TG.getUser() || {};
    const s = window.State && State.get ? State.get() : null;
    const info = Object.assign({}, u, s ? { coins: s.balances.coins, robux: s.balances.robux, streak: s.balances.streak } : {});
    return saveUser(info);
  }

  /* частичное обновление записи (например, балансы) */
  function update(id, patch) {
    const m = load();
    const rec = m[String(id)];
    if (!rec) return null;
    Object.assign(rec, patch || {});
    persist();
    return rec;
  }

  /* слить серверных игроков (не затирая локальные данные админа) */
  function mergeServer(list) {
    if (!Array.isArray(list)) return 0;
    const m = load();
    let added = 0;
    list.forEach((p) => {
      if (!p || p.id == null) return;
      const key = String(p.id);
      const prev = m[key];
      const rec = {
        id: Number(p.id),
        name: p.name || (prev && prev.name) || "User " + p.id,
        username: p.username || (prev && prev.username) || "",
        photoUrl: (prev && prev.photoUrl) || "",
        role: (prev && prev.role) || "user",
        coins: Number(p.coins) || (prev && prev.coins) || 0,
        robux: Number(p.robux) || (prev && prev.robux) || 0,
        streak: Number(p.streak) || (prev && prev.streak) || 0,
        firstLogin: (prev && prev.firstLogin) || (p.firstSeen ? Number(p.firstSeen) * 1000 : Date.now()),
        lastLogin: (prev && prev.lastLogin) || (p.lastSeen ? Number(p.lastSeen) * 1000 : Date.now()),
      };
      if (!prev) added++;
      m[key] = rec;
    });
    persist();
    return added;
  }

  function all() {
    return Object.values(load()).sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
  }
  function get(id) {
    return load()[String(id)] || null;
  }
  function count() {
    return Object.keys(load()).length;
  }
  function remove(id) {
    const m = load();
    delete m[String(id)];
    persist();
  }
  function reset() {
    map = {};
    persist();
  }

  return { saveUser, saveCurrent, update, mergeServer, all, get, count, remove, reset };
})();

window.UsersStore = UsersStore;