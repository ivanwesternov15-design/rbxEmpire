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
    badge.textContent = n > 9 ? "9+" : String(n);
  }

  /* ---------------- предупреждение о данных Telegram ---------------- */
  function showTelegramWarn(mode) {
    const box = document.getElementById("tg-warn");
    if (!box) return;
    const icon = document.getElementById("tg-warn-icon");
    const text = document.getElementById("tg-warn-text");
    const btn = document.getElementById("tg-warn-btn");
    box.hidden = false;
    if (mode === "outside") {
      icon.innerHTML = Icons.get("send");
      text.textContent = I18N.t("tg.warn.outside");
      btn.textContent = I18N.t("tg.warn.open");
      btn.onclick = () => TG.openTelegramLink("https://t.me/" + I18N.t("tg.botname"));
    } else {
      icon.innerHTML = Icons.get("settings");
      text.textContent = I18N.t("tg.warn.nodata");
      btn.textContent = I18N.t("tg.warn.refresh");
      btn.onclick = () => window.location.reload();
    }
  }

  function hideTelegramWarn() {
    const box = document.getElementById("tg-warn");
    if (box) box.hidden = true;
  }

  function checkTelegramData() {
    // плашка показывается только если данные не пришли долго, и скрывается сразу при появлении
    let tries = 0;
    let shown = false;
    const tryResolve = () => {
      if (TG.hasUserData() || TG.retryUser()) {
        hideTelegramWarn();
        renderTopbar();
        if (Nav.currentSection() === "profile") Views.render("profile");
        return true;
      }
      return false;
    };
    const iv = setInterval(() => {
      if (tryResolve()) {
        clearInterval(iv);
        return;
      }
      tries += 1;
      const webAppOk = TG.isTelegram();
      if (tries >= 12 && !shown) {
        shown = true;
        showTelegramWarn(webAppOk ? "nodata" : "outside");
      } else if (shown && webAppOk) {
        // плашка «вне Telegram» показана, а WebApp появился позже — убираем её
        hideTelegramWarn();
      }
      if (tries > 90) clearInterval(iv); // максимум ~54 сек фоновых проверок
    }, 600);
    // при возврате в окно мини-аппа — мгновенно перепроверяем и прячем плашку
    window.addEventListener("focus", () => {
      if (tryResolve()) clearInterval(iv);
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
    document.getElementById("topbar-avatar").innerHTML = UI.avatarHtml(user, isHome ? 46 : 38);
    // NickName + галочка верификации: владелец — жёлтая, админ — красная
    let verified = "";
    if (State.isOwner()) verified = `<span class="topbar-verified owner" title="Owner">${Icons.get("verified")}</span>`;
    else if (State.isAdmin()) verified = `<span class="topbar-verified admin" title="Admin">${Icons.get("verified")}</span>`;
    document.getElementById("topbar-name").innerHTML = name + verified;
    // внизу: ID: ... затем @username
    document.getElementById("topbar-id").textContent = "ID: " + user.id + (user.username ? " @" + user.username : "");
    const iconEl = document.getElementById("hist-btn-icon");
    if (iconEl && !iconEl.dataset.ready) {
      iconEl.dataset.ready = "1";
      iconEl.innerHTML = Icons.get("history");
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

  const histBtn = document.getElementById("topbar-history");
  if (histBtn) histBtn.addEventListener("click", openHistoryModal);

  window.addEventListener("resize", () => Nav.updateIndicator());
})();
}