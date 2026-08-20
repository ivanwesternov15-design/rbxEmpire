/**
 * Раздел «Профиль»: карточка профиля, квадратные табы (Настройки/История/Поддержка/О приложении),
 * открывающиеся в отдельных окнах, админ-панель — отдельная страница admin.html.
 */
(function () {
  let bio = "";

  function fetchBio() {
    const uid = TG.getUser().id;
    API.bio(uid).then((res) => {
      if (res && res.ok && res.bio) {
        bio = res.bio;
        if (Nav.currentSection() === "profile") Views.render("profile");
      }
    });
  }

  function profileHtml() {
    const s = State.get();
    const user = TG.getUser();
    const owner = State.isOwner();
    const name = ((user.firstName || "") + " " + (user.lastName || "")).trim() || "User";
    const handle = user.username ? "@" + user.username : "";
    const bioHtml = bio
      ? `<div class="profile-bio">${bio}</div>`
      : `<div class="profile-bio text-dim">${I18N.t("profile.bio.none")}</div>`;
    return `
      <div class="panel glass-panel profile-card">
        ${UI.avatarHtml(user, 88)}
        <div class="profile-name-row">
          ${owner ? `<span class="badge badge-gold owner-badge">${Icons.get("shield")}${I18N.t("profile.owner")}</span>` : ""}
          <div class="profile-username">${name}</div>
        </div>
        <div class="profile-meta">
          ${handle ? `<span class="profile-handle">${handle}</span>` : ""}
          <span class="profile-id">ID: ${user.id}</span>
        </div>
        ${bioHtml}
        <div class="profile-first">${Icons.get("history")}${I18N.t("profile.first")}: ${UI.fmtFullDate(new Date(s.firstLogin || Date.now()).getTime())}</div>
      </div>
      <div class="profile-tabs-grid">
        <button class="profile-tab" data-tab="settings">${Icons.get("settings")}<span>${I18N.t("profile.tabs.settings")}</span></button>
        <button class="profile-tab" data-tab="history">${Icons.get("history")}<span>${I18N.t("profile.tabs.history")}</span></button>
        <button class="profile-tab" data-tab="support">${Icons.get("support")}<span>${I18N.t("profile.tabs.support")}</span></button>
        <button class="profile-tab" data-tab="about">${Icons.get("about")}<span>${I18N.t("profile.tabs.about")}</span></button>
      </div>
      ${owner ? `
        <button class="btn btn-gold admin-link-btn" id="admin-open">
          ${Icons.get("shield")}${I18N.t("profile.admin")}
        </button>` : ""}`;
  }

  /* ---------- содержимое окон ---------- */
  function settingsHtml() {
    const s = State.get();
    return `
      <div class="panel glass-panel" style="padding:14px">
        <div class="setting-row">
          <div>
            <div class="set-title">${I18N.t("profile.settings.lang")}</div>
            <div class="set-sub">${I18N.t("profile.settings.lang.sub")}</div>
          </div>
          <div class="lang-pills">
            <button class="lang-pill ${s.lang === "ru" ? "active" : ""}" data-lang="ru">RU</button>
            <button class="lang-pill ${s.lang === "en" ? "active" : ""}" data-lang="en">EN</button>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <div class="set-title">${I18N.t("profile.settings.haptics")}</div>
            <div class="set-sub">${I18N.t("profile.settings.haptics.sub")}</div>
          </div>
          <button class="toggle ${s.haptics ? "on" : ""}" id="haptics-toggle"></button>
        </div>
        <div class="setting-row">
          <div>
            <div class="set-title">${I18N.t("profile.settings.id")}</div>
            <div class="set-sub mono">${TG.getUser().id}</div>
          </div>
        </div>
      </div>`;
  }

  function supportHtml() {
    return `
      <div class="panel glass-panel" style="padding:14px">
        <div class="text-soft" style="font-size:13px;margin-bottom:12px">${I18N.t("profile.support.sub")}</div>
        <button class="list-row" id="support-owner" style="width:100%;text-align:left">
          <span class="row-icon">${Icons.get("support")}</span>
          <span><span class="row-title" style="display:block">${I18N.t("profile.support.owner")}</span><span class="row-sub">@darkgeniy</span></span>
        </button>
      </div>`;
  }

  function aboutHtml() {
    const feats = [
      { n: 1, icon: "daily", key: "about.feature.1", c: "var(--accent-gold)" },
      { n: 2, icon: "tasks", key: "about.feature.2", c: "var(--accent-green)" },
      { n: 3, icon: "shop", key: "about.feature.3", c: "var(--rarity-color-diamond)" },
      { n: 4, icon: "clock", key: "about.feature.4", c: "#ffb800" },
      { n: 5, icon: "wallet", key: "about.feature.5", c: "var(--text-main)" },
    ];
    const list = feats
      .map(
        (f) => `
        <div class="about-feature">
          <span class="about-num">${f.n}</span>
          <span class="about-feat-icon" style="color:${f.c};border-color:${f.c}44">${Icons.get(f.icon)}</span>
          <span class="about-feat-text">${I18N.t(f.key)}</span>
          <span class="about-feat-glow" style="background:${f.c}"></span>
        </div>`
      )
      .join("");
    return `
      <div class="panel glass-panel" style="padding:14px">
        <div class="about-list">${list}</div>
      </div>
      <div class="about-desc">
        <span class="about-desc-icon">${Icons.get("sparkles")}</span>
        <div>
          <p class="about-save">${Icons.get("check")}${I18N.t("about.save")}</p>
        </div>
      </div>
      <div class="about-footer">
        <span class="badge">${I18N.t("profile.about.version")}: v1.2.0</span>
      </div>`;
  }

  /* ---------- привязки внутри окон ---------- */
  function bindSettings(root) {
    root.querySelectorAll(".lang-pill").forEach((p) => {
      p.addEventListener("click", () => {
        UI.haptic("light");
        State.setLang(p.getAttribute("data-lang"));
      });
    });
    const hapticBtn = root.querySelector("#haptics-toggle");
    if (hapticBtn) {
      hapticBtn.addEventListener("click", () => {
        UI.haptic("light");
        State.setHaptics(!State.get().haptics);
      });
    }
  }

  function bindSupport(root) {
    const ownerBtn = root.querySelector("#support-owner");
    if (ownerBtn) ownerBtn.addEventListener("click", () => TG.openTelegramLink("https://t.me/darkgeniy"));
  }

  /* ---------- открытие таба в отдельном окне ---------- */
  function openTabModal(tab) {
    UI.haptic("light");
    const icons = { settings: "settings", history: "history", support: "support", about: "about" };
    let body;
    if (tab === "settings") body = settingsHtml();
    else if (tab === "history") body = UI.historyRowsHtml();
    else if (tab === "support") body = supportHtml();
    else body = aboutHtml();
    const m = UI.modal({ title: I18N.t("profile.tabs." + tab), icon: icons[tab] || "info", body });
    m.onSwipeDown(() => {});
    if (tab === "settings") bindSettings(m.bodyEl);
    else if (tab === "support") bindSupport(m.bodyEl);
    else if (tab === "history") State.markHistorySeen();
  }

  Views.profile = function () {
    const sec = document.getElementById("sec-profile");
    sec.innerHTML = profileHtml();

    sec.querySelectorAll(".profile-tab").forEach((tab) => {
      tab.addEventListener("click", () => openTabModal(tab.getAttribute("data-tab")));
    });

    const adminBtn = sec.querySelector("#admin-open");
    if (adminBtn) {
      adminBtn.addEventListener("click", () => {
        UI.haptic("light");
        window.location.href = "admin.html";
      });
    }
  };

  // подгрузка bio вызывается из app.js после TG.init()
  Views.fetchBio = fetchBio;
})();