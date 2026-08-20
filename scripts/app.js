/**
 * Точка входа: инициализация, глобальные слушатели, рендер-диспетчер.
 */
if (typeof window === "undefined") {
  // Бот-хостинг запускает проект через node (start command: scripts/app.js).
  // Настоящий бэкенд — Python: поднимаем его через общий лаунчер.
  require("./node-launcher.js")(__dirname + "/..");
} else {
(function () {
  const user = TG.init();
  State.load();

  function hideSplash() {
    const sp = document.getElementById("splash");
    if (sp) sp.classList.add("splash-hide");
  }

  /* ---------------- история: бейдж + окно ---------------- */
  function renderHistoryBadge() {
    const badge = document.getElementById("hist-badge");
    if (!badge) return;
    const n = State.unreadHistoryCount();
    badge.hidden = n <= 0;
  }

  /* ---------------- предупреждение о данных Telegram (без баннера: только тихий ретрай) ---------------- */
  function checkTelegramData() {
    let tries = 0;
    const iv = setInterval(() => {
      if (TG.hasUserData() || TG.retryUser()) {
        State.upsertUser(TG.getUser());
        State.pingNow();
        renderTopbar();
        if (Nav.currentSection() === "profile") Views.render("profile");
        clearInterval(iv);
        return;
      }
      tries += 1;
      if (tries > 90) clearInterval(iv); // максимум ~54 сек фоновых проверок
    }, 600);
    // при возврате в окно мини-аппа — мгновенно перепроверяем
    window.addEventListener("focus", () => {
      if (TG.hasUserData() || TG.retryUser()) {
        State.upsertUser(TG.getUser());
        State.pingNow();
        renderTopbar();
        if (Nav.currentSection() === "profile") Views.render("profile");
        clearInterval(iv);
      }
    });
  }

  function openHistoryModal() {
    UI.haptic("light");
    State.markHistorySeen();
    renderHistoryBadge();
    const m = UI.modal({ title: I18N.t("profile.history.title"), icon: "history", body: UI.historyRowsHtml() });
    m.onSwipeDown(() => {});
  }

  /* ---------------- диспетчер рендера ---------------- */
  function renderTopbar() {
    const tb = document.getElementById("topbar");
    const inner = tb.querySelector(".topbar-inner");
    const isHome = Nav.currentSection() === "home";
    inner.classList.toggle("compact", !isHome);
    const name = ((user.firstName || "") + " " + (user.lastName || "")).trim() || "User";
    document.getElementById("topbar-avatar").innerHTML =
      `<span class="avatar-ring">${UI.avatarHtml(user, isHome ? 46 : 38)}</span>`;
    // NickName + галочка верификации: владелец — жёлтая, админ — красная
    let verified = "";
    if (State.isOwner()) verified = `<span class="topbar-verified owner" title="Owner">${Icons.get("verified")}</span>`;
    else if (State.isAdmin()) verified = `<span class="topbar-verified admin" title="Admin">${Icons.get("verified")}</span>`;
    document.getElementById("topbar-name").innerHTML = name + verified;
    // под именем только @username (без ID)
    const unameEl = document.getElementById("topbar-username");
    unameEl.textContent = user.username ? "@" + user.username : "";
    unameEl.hidden = !user.username;
    // справа: балансы Robux и Coins
    const s = State.get();
    const bals = document.getElementById("topbar-bals");
    bals.innerHTML = `
      <span class="topbar-bal bal-robux"><img src="assets/icons/robux.png" alt="Robux"><b>${UI.fmt(s.balances.robux)}</b></span>
      <span class="topbar-bal bal-coins"><img src="assets/icons/coins.png" alt="Coins"><b>${UI.fmt(s.balances.coins)}</b></span>`;
    const iconEl = document.getElementById("hist-btn-icon");
    if (iconEl && !iconEl.dataset.ready) {
      iconEl.dataset.ready = "1";
      iconEl.innerHTML = Icons.get("bell");
    }
    renderHistoryBadge();
  }

  Views.render = function (name) {
    renderTopbar();
    const fn = Views[name];
    if (typeof fn === "function") fn();
  };

  /* ---------------- глобальный слушатель состояния ---------------- */
  State.on(function () {
    I18N.setLang(State.get().lang);
    I18N.applyDOM();
    const completed = State.checkTasks();
    completed.forEach((c) => {
      UI.haptic("success");
      if (c.granted.card) {
        UI.popup(I18N.t("r." + c.granted.card.rarity) + "!", "cards");
      } else {
        const amt = c.granted.coins || c.granted.robux;
        UI.popup("+" + UI.fmt(amt) + (c.granted.coins ? " " + I18N.t("stats.coins") : " " + I18N.t("stats.robux")), c.granted.coins ? "coin" : "robux");
      }
    });
    renderHistoryBadge();
    // один рендер за переход: если секцию только что отрисовал switchTo — пропускаем
    if (!Nav.shouldSkipRender() && Nav.currentSection()) Views.render(Nav.currentSection());
    Nav.renderNav();
  });

  /* ---------------- boot ---------------- */
  try {
    I18N.setLang(State.get().lang);
    State.updateStreak();
    Nav.renderNav();
    Nav.switchTo("home", { force: true });
    requestAnimationFrame(() => setTimeout(hideSplash, 180));
    checkTelegramData();
  } catch (err) {
    console.error("[rbxflare] boot error:", err);
    hideSplash();
  }

  // start-параметр реферальной ссылки (ref_123)
  if (State.handleStartParam()) {
    UI.toast(I18N.t("ref.welcome"), "gift");
  }

  // bio пользователя через Bot API getChat (если бэкенд доступен)
  if (Views.fetchBio) Views.fetchBio();
  // отправка отложенного реферала на бэкенд (если пользователь зашёл по ref-ссылке)
  setInterval(() => {
    State.flushPendingReferral();
  }, 20000);

  // валидация initData на бэкенде (best effort — без влияния на UI)
  if (TG.isTelegram() && TG.getInitData()) {
    API.validate(TG.getInitData()).then((res) => {
      if (!res || !res.ok) console.warn("[rbxflare] initData validation failed");
    });
  }

  // стрик-окно: раз в 24 часа при входе в мини-апп
  setTimeout(() => {
    if (State.shouldShowStreakPopup() && typeof Views.streakPopup === "function") {
      Views.streakPopup();
    }
  }, 1200);

  const histBtn = document.getElementById("topbar-history");
  if (histBtn) histBtn.addEventListener("click", openHistoryModal);

  window.addEventListener("resize", () => Nav.updateIndicator());
})();
}