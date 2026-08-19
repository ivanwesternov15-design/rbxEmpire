/**
 * Состояние приложения + вся клиентская игровая логика.
 * Всё сохраняется в локальном кэше (localStorage). При подключении бэкенда
 * эти же данные будут зеркалироваться на сервер.
 */
const State = (function () {
  const KEY = "state_v1";
  const RARITIES = ["basic", "silver", "gold", "diamond", "mythic"];
  const DURATIONS = {
    "12h": { ms: 12 * 3600 * 1000, labelKey: "dur.12h" },
    "24h": { ms: 24 * 3600 * 1000, labelKey: "dur.24h" },
    "3d": { ms: 3 * 24 * 3600 * 1000, labelKey: "dur.3d" },
    "7d": { ms: 7 * 24 * 3600 * 1000, labelKey: "dur.7d" },
  };

  let data = null;
  const listeners = [];

  function emit() {
    listeners.slice().forEach((fn) => fn(data));
  }
  function on(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function save() {
    Cache.set(KEY, data);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function dayKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function addDays(d, n) {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  }
  function todayKey() {
    return dayKey(new Date());
  }

  function defaultTasks() {
    const mk = (id, type, titleKey, descKey, target, reward, cat) => ({ id, type, titleKey, descKey, title: "", desc: "", target, reward, done: false, progress: 0, cat: cat || "ach" });
    return [
      mk("t1", "collect", "task.t.collect", "task.d.collect", 1, { type: "coins", amount: 100 }, "ach"),
      mk("t2", "collect5", "task.t.collect5", "task.d.collect5", 5, { type: "coins", amount: 500 }, "ach"),
      mk("t3", "streak", "task.t.streak3", "task.d.streak3", 3, { type: "coins", amount: 150 }, "ach"),
      mk("t4", "staking", "task.t.staking1", "task.d.staking1", 1, { type: "coins", amount: 200 }, "ach"),
      mk("t5", "invite", "task.t.invite", "task.d.invite", 1, { type: "coins", amount: 300 }, "friends"),
      mk("t6", "robux", "task.t.robux500", "task.d.robux500", 500, { type: "coins", amount: 250 }, "ach"),
      mk("t7", "daily", "task.t.daily", "task.d.daily", 1, { type: "coins", amount: 100 }, "ach"),
      mk("t8", "custom", "task.t.custom", "task.d.custom", 1, { type: "coins", amount: 200 }, "subs"),
    ];
  }

  function defaults() {
    return {
      version: 1,
      lang: "ru",
      haptics: true,
      firstLogin: null,
      balances: { robux: 0, coins: 100, streak: 0, lastVisit: null },
      daily: { lastPick: null, lastReward: null },
      totalCollected: 0,
      stakingCompleted: 0,
      stakesStarted: 0,
      inventory: [],
      shop: [],
      referrals: [],
      referrer: null,
      pendingReferral: null,
      tasks: defaultTasks(),
      history: [],
      lastSeenHistoryTs: 0,
      admin: {
        staking: {
          "12h": { pct: 0.5, bonus: 0 },
          "24h": { pct: 1, bonus: 0 },
          "3d": { pct: 3, bonus: 1 },
          "7d": { pct: 7, bonus: 3 },
        },
        chances: { basic: 40, silver: 30, gold: 17, diamond: 9, mythic: 4 },
        values: { basic: [40, 80], silver: [120, 200], gold: [300, 500], diamond: [800, 1200], mythic: [2000, 3500] },
      },
    };
  }

  function load() {
    data = Cache.get(KEY, null);
    if (!data) {
      data = defaults();
      data.firstLogin = todayKey();
      save();
    }
    // merge-страховка от отсутствующих полей при обновлении версии
    const d = defaults();
    data.version = d.version;
    data.admin = Object.assign({}, d.admin, data.admin || {});
    data.admin.staking = Object.assign({}, d.admin.staking, (data.admin && data.admin.staking) || {});
    data.admin.chances = Object.assign({}, d.admin.chances, (data.admin && data.admin.chances) || {});
    data.admin.values = Object.assign({}, d.admin.values, (data.admin && data.admin.values) || {});
    data.balances = Object.assign({}, d.balances, data.balances || {});
    data.daily = Object.assign({}, d.daily, data.daily || {});
    data.tasks = Array.isArray(data.tasks) && data.tasks.length ? data.tasks : d.tasks;
    data.tasks.forEach((t) => { if (!t.cat) t.cat = "ach"; });
    data.shop = Array.isArray(data.shop) ? data.shop : [];
    data.stakesStarted = data.stakesStarted || 0;
    data.totalCollected = data.totalCollected || 0;
    data.stakingCompleted = data.stakingCompleted || 0;
    data.lastSeenHistoryTs = data.lastSeenHistoryTs || 0;
    save();
  }

  /* ---------------- профиль / язык ---------------- */
  function setLang(l) {
    data.lang = l === "en" ? "en" : "ru";
    save();
    emit();
  }
  function setHaptics(v) {
    data.haptics = !!v;
    save();
    emit();
  }

  /* ---------------- streak ---------------- */
  function updateStreak() {
    const today = todayKey();
    if (data.balances.lastVisit === today) return;
    const yesterday = dayKey(addDays(new Date(), -1));
    data.balances.streak = data.balances.lastVisit === yesterday ? data.balances.streak + 1 : 1;
    data.balances.lastVisit = today;
    save();
  }

  /* ---------------- награды / история ---------------- */
  function grant(reward) {
    const out = { coins: 0, robux: 0, card: null };
    if (!reward) return out;
    if (reward.type === "coins" && reward.amount > 0) {
      data.balances.coins += reward.amount;
      out.coins = reward.amount;
    } else if (reward.type === "robux" && reward.amount > 0) {
      data.balances.robux += reward.amount;
      out.robux = reward.amount;
    } else if (reward.type === "card") {
      const roll = rollRarity();
      const value = rollValue(roll.rarity);
      const card = addCard(roll.rarity, value, "task");
      out.card = card;
    }
    return out;
  }

  function log(type, icon, text, amount, amountType) {
    data.history.unshift({
      ts: Date.now(),
      type,
      icon,
      text,
      amount: amount || 0,
      amountType: amountType || "",
    });
    if (data.history.length > 200) data.history.length = 200;
  }

  /* ---------------- история / уведомления ---------------- */
  function unreadHistoryCount() {
    return data.history.filter((h) => h.ts > (data.lastSeenHistoryTs || 0)).length;
  }
  function markHistorySeen() {
    if (!data.history.length) return;
    data.lastSeenHistoryTs = data.history[0].ts;
    save();
  }

  /* ---------------- ежедневные карточки (лотерея) ---------------- */
  function canPickDaily() {
    return data.daily.lastPick !== todayKey();
  }
  function timeToNextDaily() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    return next - now;
  }

  function rollRarity() {
    const c = data.admin.chances;
    const total = RARITIES.reduce((s, r) => s + (Number(c[r]) || 0), 0);
    let r = Math.random() * (total || 100);
    for (const rarity of RARITIES) {
      r -= Number(c[rarity]) || 0;
      if (r <= 0) return { rarity };
    }
    return { rarity: "basic" };
  }

  function rollValue(rarity) {
    const [min, max] = data.admin.values[rarity] || [40, 80];
    return Math.round(min + Math.random() * (max - min));
  }

  function pickDaily(slot) {
    if (!canPickDaily()) return null;
    const { rarity } = rollRarity();
    const value = rollValue(rarity);
    const card = addCard(rarity, value, "daily");
    data.daily.lastPick = todayKey();
    data.daily.lastReward = { rarity, value };
    data.daily.pickedSlot = slot == null ? 0 : slot;
    log("daily", "daily", "hist.daily", 0, "");
    save();
    emit();
    return card;
  }

  /* ---------------- карточки ---------------- */
  function addCard(rarity, value, source) {
    const card = {
      id: uid(),
      rarity,
      value,
      obtainedAt: Date.now(),
      source: source || "daily",
      status: "idle",
      stake: null,
    };
    data.inventory.unshift(card);
    data.totalCollected++;
    return card;
  }

  function cardById(id) {
    return data.inventory.find((c) => c.id === id) || null;
  }

  function stakeInfo(card) {
    if (!card || card.status !== "staking" || !card.stake) return null;
    const total = card.stake.endsAt - card.stake.startedAt;
    const left = Math.max(0, card.stake.endsAt - Date.now());
    const done = left <= 0;
    const progress = total > 0 ? Math.min(1, 1 - left / total) : 1;
    return { total, left, done, progress };
  }

  function startStake(cardId, durationKey) {
    const card = cardById(cardId);
    if (!card || card.status !== "idle") return false;
    const cfg = data.admin.staking[durationKey] || { pct: 0, bonus: 0 };
    const dur = DURATIONS[durationKey];
    if (!dur) return false;
    card.status = "staking";
    card.stake = {
      durationKey,
      startedAt: Date.now(),
      endsAt: Date.now() + dur.ms,
      pct: Number(cfg.pct) || 0,
      bonus: Number(cfg.bonus) || 0,
    };
    data.stakesStarted++;
    log("stake", "clock", "cards.stake.duration", 0, "");
    save();
    emit();
    return true;
  }

  function claimStake(cardId) {
    const card = cardById(cardId);
    if (!card || card.status !== "staking") return 0;
    const info = stakeInfo(card);
    if (!info || !info.done) return 0;
    const base = card.value || 0;
    const reward = Math.round(base * (1 + (card.stake.pct || 0) / 100)) + (card.stake.bonus || 0);
    data.balances.robux += reward;
    data.stakingCompleted++;
    data.inventory = data.inventory.filter((c) => c.id !== cardId);
    log("stake", "coin", "hist.stake", reward, "robux");
    save();
    emit();
    return reward;
  }

  function readyToClaimCount() {
    return data.inventory.filter((c) => c.status === "staking" && stakeInfo(c) && stakeInfo(c).done).length;
  }

  /* ---------------- магазин ---------------- */
  function buyOffer(offerId) {
    const offer = data.shop.find((o) => o.id === offerId);
    if (!offer) return { ok: false, reason: "nofound" };
    if (offer.sold >= offer.qty) return { ok: false, reason: "sold" };
    if (data.balances.coins < offer.price) return { ok: false, reason: "coins" };
    data.balances.coins -= offer.price;
    offer.sold++;
    addCard(offer.rarity, offer.price, "shop");
    log("buy", "shop", "hist.buy", offer.price, "coins");
    save();
    emit();
    return { ok: true };
  }

  /* ---------------- рефералы ---------------- */
  function referralLink() {
    const id = TG.getUser().id;
    return "https://t.me/rxgame_bot?start=ref_" + id;
  }
  function referralText() {
    return I18N.t("ref.shared.text") + " " + referralLink();
  }

  function handleStartParam() {
    const param = (TG.getUser() && TG.getUser().startParam) || "";
    const m = param.match(/^ref_(\d+)$/);
    if (!m) return false;
    const referrerId = Number(m[1]);
    const me = TG.getUser();
    if (referrerId === me.id) return false;
    data.referrer = referrerId;
    const friend = { id: me.id, name: me.username || me.firstName, avatar: me.photoUrl || "" };
    if (data.pendingReferral && data.pendingReferral.referrerId === referrerId) return true;
    data.pendingReferral = { referrerId, friend };
    save();
    emit();
    return true;
  }

  async function flushPendingReferral() {
    if (!data.pendingReferral) return;
    const p = data.pendingReferral;
    const res = await API.addReferral({ referrerId: p.referrerId, friend: p.friend });
    if (res && res.ok) {
      data.pendingReferral = null;
      save();
      return true;
    }
    return false;
  }

  async function syncFriends() {
    const me = TG.getUser();
    const res = await API.friends(me.id);
    if (res && res.ok && Array.isArray(res.friends)) {
      const byId = {};
      let changed = false;
      data.referrals.forEach((f) => (byId[f.id] = f));
      res.friends.forEach((f) => {
        if (byId[f.id]) {
          if ((f.progress || 0) !== (byId[f.id].progress || 0)) {
            byId[f.id].progress = f.progress || 0;
            changed = true;
          }
        } else {
          const nf = { id: f.id, name: f.name || "Friend", avatar: f.avatar || "", joinedAt: f.joinedAt || Date.now(), progress: f.progress || 0 };
          data.referrals.unshift(nf);
          byId[f.id] = nf;
          changed = true;
        }
      });
      if (changed) {
        save();
        emit();
      }
      return true;
    }
    return false;
  }

  function addTestFriend() {
    const n = data.referrals.length + 1;
    data.referrals.unshift({
      id: "test-" + n,
      name: "TestUser" + n,
      avatar: "",
      joinedAt: Date.now() - 6 * 86400000,
      progress: 0,
      demo: true,
    });
    save();
    emit();
  }

  /* ---------------- задания ---------------- */
  function taskProgress(task) {
    switch (task.type) {
      case "collect":
      case "collect5":
        return data.totalCollected;
      case "streak":
        return data.balances.streak;
      case "staking":
        return data.stakesStarted;
      case "invite":
        return data.referrals.length;
      case "robux":
        return data.balances.robux;
      case "daily":
        return data.daily.lastPick === todayKey() ? 1 : 0;
      case "custom":
        return task.progress || 0;
      default:
        return 0;
    }
  }

  function checkTasks() {
    const completed = [];
    data.tasks.forEach((task) => {
      const p = taskProgress(task);
      task.progress = p;
      if (!task.done && p >= task.target) {
        task.done = true;
        const granted = grant(task.reward);
        completed.push({ task, granted });
        log("task", "medal", "hist.task", granted.coins || granted.robux || 0, granted.coins ? "coins" : granted.robux ? "robux" : "");
      }
    });
    if (completed.length) {
      save();
      emit();
    }
    return completed;
  }

  function addTask(t) {
    data.tasks.push(Object.assign({ id: uid(), done: false, progress: 0, cat: t.cat || "ach" }, t));
    save();
    emit();
  }
  function removeTask(id) {
    data.tasks = data.tasks.filter((t) => t.id !== id);
    save();
    emit();
  }
  function setTaskProgress(id, p) {
    const t = data.tasks.find((x) => x.id === id);
    if (!t) return;
    t.progress = Math.max(0, Number(p) || 0);
    if (t.type === "custom") {
      if (t.progress >= t.target) {
        t.done = true;
        const granted = grant(t.reward);
        log("task", "medal", "hist.task", granted.coins || granted.robux || 0, granted.coins ? "coins" : granted.robux ? "robux" : "");
        save();
        emit();
        return { done: true, granted };
      }
      if (t.done && t.progress < t.target) t.done = false;
    }
    save();
    emit();
  }
  function forceTask(id, done) {
    const t = data.tasks.find((x) => x.id === id);
    if (!t) return null;
    t.done = !!done;
    if (t.done) t.progress = Math.max(t.progress, t.target);
    let granted = null;
    if (t.done) {
      granted = grant(t.reward);
      log("task", "medal", "hist.task", granted.coins || granted.robux || 0, granted.coins ? "coins" : granted.robux ? "robux" : "");
    }
    save();
    emit();
    return granted;
  }

  /* ---------------- админ ---------------- */
  function setAdmin(patch) {
    data.admin = Object.assign({}, data.admin, patch || {});
    save();
    emit();
  }
  function addShopOffer(o) {
    data.shop.unshift(Object.assign({ id: uid(), sold: 0 }, o));
    save();
    emit();
  }
  function removeShopOffer(id) {
    data.shop = data.shop.filter((o) => o.id !== id);
    save();
    emit();
  }
  function addTestCoins() {
    data.balances.coins += 1000;
    save();
    emit();
  }
  function addTestRobux() {
    data.balances.robux += 500;
    save();
    emit();
  }

  function reset() {
    const fresh = defaults();
    fresh.firstLogin = todayKey();
    fresh.lang = data.lang;
    fresh.haptics = data.haptics;
    data = fresh;
    save();
    emit();
  }

  /* ---------------- доступ ---------------- */
  return {
    load,
    on,
    emit,
    save,
    get: () => data,
    isOwner: () => TG.getUser().id === TG.OWNER_ID,
    canPickDaily,
    timeToNextDaily,
    pickDaily,
    rollRarity,
    rollValue,
    startStake,
    stakeInfo,
    claimStake,
    readyToClaimCount,
    cardById,
    buyOffer,
    referralLink,
    referralText,
    handleStartParam,
    flushPendingReferral,
    syncFriends,
    unreadHistoryCount,
    markHistorySeen,
    addTestFriend,
    taskProgress,
    checkTasks,
    addTask,
    removeTask,
    setTaskProgress,
    forceTask,
    setAdmin,
    addShopOffer,
    removeShopOffer,
    addTestCoins,
    addTestRobux,
    setLang,
    setHaptics,
    updateStreak,
    reset,
    RARITIES,
    DURATIONS,
  };
})();