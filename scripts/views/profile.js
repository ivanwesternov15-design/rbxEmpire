/**
 * Раздел «Профиль»: карточка профиля, вкладки (Настройки/История/Поддержка/О приложении), админ-вход.
 */
(function () {
  let currentTab = "settings";
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
        ${owner ? `<span class="badge badge-gold" style="margin-top:4px">${Icons.get("shield")}${I18N.t("profile.owner")}</span>` : ""}
        <div class="profile-username">${name}</div>
        <div class="profile-meta">
          ${handle ? `<span class="profile-handle">${handle}</span>` : ""}
          <span class="profile-id">ID: ${user.id}</span>
        </div>
        ${bioHtml}
        <div class="profile-first">${Icons.get("history")}${I18N.t("profile.first")}: ${UI.fmtFullDate(new Date(s.firstLogin || Date.now()).getTime())}</div>
      </div>
      <div class="profile-tabs">
        <button class="profile-tab ${currentTab === "settings" ? "active" : ""}" data-tab="settings">${Icons.get("settings")}${I18N.t("profile.tabs.settings")}</button>
        <button class="profile-tab ${currentTab === "history" ? "active" : ""}" data-tab="history">${Icons.get("history")}${I18N.t("profile.tabs.history")}</button>
        <button class="profile-tab ${currentTab === "support" ? "active" : ""}" data-tab="support">${Icons.get("support")}${I18N.t("profile.tabs.support")}</button>
        <button class="profile-tab ${currentTab === "about" ? "active" : ""}" data-tab="about">${Icons.get("about")}${I18N.t("profile.tabs.about")}</button>
      </div>
      <div id="profile-sub"></div>
      ${owner ? `
        <button class="btn btn-gold" id="admin-open" style="width:100%;margin-top:4px">
          ${Icons.get("shield")}${I18N.t("profile.admin")}
          <span class="text-dim" style="font-size:12px;font-weight:600">· ${I18N.t("profile.admin.sub")}</span>
        </button>` : ""}`;
  }

  /* ---------- вкладки ---------- */
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
        <div class="setting-row">
          <div>
            <div class="set-title" style="color:var(--accent-red)">${I18N.t("profile.settings.reset")}</div>
            <div class="set-sub">${I18N.t("profile.settings.reset.sub")}</div>
          </div>
          <button class="btn btn-danger" id="reset-btn">${Icons.get("trash")}</button>
        </div>
      </div>`;
  }

  function historyHtml() {
    const s = State.get();
    if (!s.history.length) {
      return `<div class="panel glass-panel"><div class="empty-state">${Icons.get("history")}<div class="empty-title">${I18N.t("profile.history.empty")}</div></div></div>`;
    }
    const iconMap = { card: "cards", stake: "coin", buy: "shop", task: "medal", daily: "daily" };
    const rows = s.history
      .map((h) => {
        const icon = iconMap[h.icon] || "info";
        const amount =
          h.amountType === "coins"
            ? `<span class="hist-amount" style="color:var(--accent-gold)">+${UI.fmt(h.amount)} C</span>`
            : h.amountType === "robux"
            ? `<span class="hist-amount" style="color:var(--text-main)">+${UI.fmt(h.amount)} R</span>`
            : "";
        return `
          <div class="list-row history-row">
            <span class="hist-icon">${Icons.get(icon)}</span>
            <span style="flex:1;min-width:0">
              <div class="hist-text">${I18N.t(h.text)}</div>
              <div class="hist-date">${new Date(h.ts).toLocaleDateString("ru-RU")} ${new Date(h.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
            </span>
            ${amount}
          </div>`;
      })
      .join("");
    return `<div class="panel glass-panel" style="padding:12px">${rows}</div>`;
  }

  function supportHtml() {
    return `
      <div class="panel glass-panel" style="padding:14px">
        <div class="text-soft" style="font-size:13px;margin-bottom:12px">${I18N.t("profile.support.sub")}</div>
        <button class="list-row" id="support-bot" style="width:100%;text-align:left">
          <span class="row-icon">${Icons.get("send")}</span>
          <span><span class="row-title" style="display:block">${I18N.t("profile.support.bot")}</span><span class="row-sub">@rxgame_bot</span></span>
        </button>
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
      <div class="about-hero">
        <div class="about-logo">rbx<span>flare</span></div>
      </div>
      <div class="panel glass-panel">
        <h2 class="panel-title" style="margin-bottom:14px">${Icons.get("about")}${I18N.t("profile.tabs.about")}</h2>
        <div class="about-list">${list}</div>
      </div>
      <div class="about-desc">
        <span class="about-desc-icon">${Icons.get("sparkles")}</span>
        <div>
          <p>${I18N.t("about.desc")}</p>
          <p class="about-save">${Icons.get("check")}${I18N.t("about.save")}</p>
        </div>
      </div>
      <div class="about-footer">
        <span class="badge">${I18N.t("profile.about.version")}: v1.1.2</span>
      </div>`;
  }

  function renderSub() {
    const sub = document.getElementById("profile-sub");
    if (!sub) return;
    sub.innerHTML = currentTab === "settings" ? settingsHtml() : currentTab === "history" ? historyHtml() : currentTab === "support" ? supportHtml() : aboutHtml();

    // привязки
    sub.querySelectorAll(".lang-pill").forEach((p) => {
      p.addEventListener("click", () => {
        UI.haptic("light");
        State.setLang(p.getAttribute("data-lang"));
      });
    });
    const hapticBtn = sub.querySelector("#haptics-toggle");
    if (hapticBtn) {
      hapticBtn.addEventListener("click", () => {
        UI.haptic("light");
        State.setHaptics(!State.get().haptics);
      });
    }
    const resetBtn = sub.querySelector("#reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        UI.haptic("warning");
        const m = UI.modal({
          title: I18N.t("profile.settings.reset"),
          icon: "trash",
          body: `<p class="text-soft" style="margin-bottom:14px">${I18N.t("profile.settings.reset.confirm")}</p>
            <div class="row">
              <button class="btn btn-ghost grow" id="reset-no">${I18N.t("common.cancel")}</button>
              <button class="btn btn-danger grow" id="reset-yes">${I18N.t("profile.settings.reset")}</button>
            </div>`,
        });
        m.bodyEl.querySelector("#reset-no").addEventListener("click", () => m.close());
        m.bodyEl.querySelector("#reset-yes").addEventListener("click", () => {
          m.close();
          State.reset();
          UI.toast(I18N.t("profile.settings.reset.done"), "check");
        });
      });
    }
    const botBtn = sub.querySelector("#support-bot");
    if (botBtn) botBtn.addEventListener("click", () => TG.openTelegramLink("https://t.me/rxgame_bot"));
    const ownerBtn = sub.querySelector("#support-owner");
    if (ownerBtn) ownerBtn.addEventListener("click", () => TG.openTelegramLink("https://t.me/darkgeniy"));
  }

  Views.profile = function () {
    if (window.ADMIN_OPEN) {
      Views.admin();
      return;
    }
    const sec = document.getElementById("sec-profile");
    sec.innerHTML = profileHtml();

    sec.querySelectorAll(".profile-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        currentTab = tab.getAttribute("data-tab");
        UI.haptic("light");
        sec.querySelectorAll(".profile-tab").forEach((t) => t.classList.toggle("active", t === tab));
        renderSub();
      });
    });

    const adminBtn = sec.querySelector("#admin-open");
    if (adminBtn) {
      adminBtn.addEventListener("click", () => {
        UI.haptic("light");
        window.ADMIN_OPEN = true;
        Views.admin();
      });
    }
    renderSub();
  };

  // подгрузка bio вызывается из app.js после TG.init()
  Views.fetchBio = fetchBio;
})();