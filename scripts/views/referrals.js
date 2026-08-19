/**
 * Раздел «Рефералы».
 */
(function () {
  let refreshTimer = null;
  let refreshing = false;

  function stopTimers() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function stopSpin(sec) {
    const sp = sec && sec.querySelector("#ref-refresh");
    if (sp) sp.classList.remove("spinning");
  }

  function friendRowHtml(f) {
    const progress = Math.min(f.progress || 0, 7);
    const name = f.name || "User";
    const initials = (name[0] || "?").toUpperCase();
    const avatar = f.avatar
      ? `<div class="avatar"><img src="${f.avatar}" alt="" onerror="this.parentElement.classList.add('avatar-initials');this.remove()"></div>`
      : `<div class="avatar avatar-initials">${initials}</div>`;
    return `
      <div class="list-row friend-row">
        ${avatar}
        <div class="friend-progress">
          <div class="fp-top">
            <span class="fp-name">${name}</span>
            <span class="fp-count">${progress} / 7 ${I18N.t("ref.tasks.of")}</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${(progress / 7) * 100}%"></div></div>
        </div>
        <span class="friend-days">${UI.daysAgo(f.joinedAt)} ${I18N.t("ref.days.ago")}</span>
      </div>`;
  }

  function friendsListHtml(s) {
    if (s.referrals.length === 0) {
      return `
        <div class="empty-state">
          ${Icons.get("gift")}
          <div class="empty-title">${I18N.t("ref.empty.title")}</div>
          <div class="empty-sub">${I18N.t("ref.empty.sub")}</div>
        </div>`;
    }
    return s.referrals.map(friendRowHtml).join("");
  }

  /* точечное обновление списка друзей без полного пере-рендера */
  function updateFriendsList(sec) {
    if (!sec) return;
    const list = sec.querySelector("#ref-friends-list");
    if (!list) return;
    const s = State.get();
    list.innerHTML = friendsListHtml(s);
    const count = sec.querySelector("#ref-count");
    if (count) count.textContent = String(s.referrals.length);
  }

  async function doRefresh() {
    if (refreshing) return;
    refreshing = true;
    const sec = document.getElementById("sec-referrals");
    const btn = sec && sec.querySelector("#ref-refresh");
    if (btn) btn.classList.add("spinning");
    await State.flushPendingReferral();
    const ok = await State.syncFriends();
    refreshing = false;
    if (ok && Nav.currentSection() === "referrals") {
      /* если syncFriends не эмитил (изменений нет) — обновляем список сами */
      updateFriendsList(sec);
    }
    stopSpin(sec);
  }

  function bindShareCopy(sec) {
    const link = State.referralLink();
    const text = State.referralText();
    const shareBtn = sec.querySelector("#ref-share");
    const copyBtn = sec.querySelector("#ref-copy");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        TG.shareLink(link, I18N.t("ref.shared.text"));
        shareBtn.classList.add("btn-share-bounce");
        setTimeout(() => shareBtn.classList.remove("btn-share-bounce"), 400);
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        TG.copyText(text, () => {
          UI.haptic("success");
          copyBtn.innerHTML = Icons.get("check") + I18N.t("ref.copied");
          setTimeout(() => {
            copyBtn.innerHTML = Icons.get("copy") + I18N.t("ref.copy");
          }, 1800);
        });
      });
    }
  }

  Views.referrals = function () {
    stopTimers();
    const s = State.get();
    const sec = document.getElementById("sec-referrals");
    const count = s.referrals.length;
    const link = State.referralLink();

    sec.innerHTML = `
      <div class="panel glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("referrals")}${I18N.t("ref.title")}</h2>
          <button class="icon-btn" id="ref-refresh" title="${I18N.t("ref.refresh")}">${Icons.get("refresh")}</button>
        </div>
        <div class="text-dim" style="font-size:13px;margin-bottom:14px"><span id="ref-count">${count}</span> ${I18N.t("ref.count")}</div>

        <div style="margin-bottom:14px">
          <div class="text-soft" style="font-size:13px;font-weight:700;margin-bottom:8px">${I18N.t("ref.link.title")}</div>
          <div class="ref-link-box">
            <span class="ref-link">${link}</span>
          </div>
          <div class="ref-actions">
            <button class="btn btn-primary" id="ref-share">${Icons.get("share")}${I18N.t("ref.share")}</button>
            <button class="btn btn-ghost" id="ref-copy">${Icons.get("copy")}${I18N.t("ref.copy")}</button>
          </div>
        </div>

        <div class="reward-info">
          ${Icons.get("gift")}
          <div>
            <div class="ri-title">${I18N.t("ref.cond.title")}</div>
            <div class="ri-text">${I18N.t("ref.cond.1")}</div>
            <div class="ri-text" style="margin-top:4px">${I18N.t("ref.cond.2")}</div>
          </div>
        </div>
      </div>

      <div class="panel glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("users")}${I18N.t("ref.friends")}</h2>
        </div>
        <div id="ref-friends-list">${friendsListHtml(s)}</div>
      </div>`;

    bindShareCopy(sec);
    const refreshBtn = sec.querySelector("#ref-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        UI.haptic("light");
        doRefresh();
      });
    }
    // real-time: автообновление каждые 12 секунд, пока раздел открыт
    refreshTimer = setInterval(() => {
      if (Nav.currentSection() === "referrals") doRefresh();
    }, 12000);
    doRefresh();
  };
})();