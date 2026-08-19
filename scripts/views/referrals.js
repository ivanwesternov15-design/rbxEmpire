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
    const sp = sec && sec.querySelector(".spinner");
    if (sp) sp.classList.add("hidden");
  }

  async function doRefresh() {
    if (refreshing) return;
    refreshing = true;
    const sec = document.getElementById("sec-referrals");
    const sp = sec && sec.querySelector(".spinner");
    if (sp) sp.classList.remove("hidden");
    await State.flushPendingReferral();
    const ok = await State.syncFriends();
    refreshing = false;
    stopSpin(sec);
    if (ok && Nav.currentSection() === "referrals") Views.render("referrals");
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

  Views.referrals = function () {
    stopTimers();
    const s = State.get();
    const sec = document.getElementById("sec-referrals");
    const count = s.referrals.length;
    const link = State.referralLink();

    let friendsHtml;
    if (count === 0) {
      friendsHtml = `
        <div class="empty-state">
          ${Icons.get("gift")}
          <div class="empty-title">${I18N.t("ref.empty.title")}</div>
          <div class="empty-sub">${I18N.t("ref.empty.sub")}</div>
        </div>`;
    } else {
      friendsHtml = s.referrals.map(friendRowHtml).join("");
    }

    sec.innerHTML = `
      <div class="panel glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("referrals")}${I18N.t("ref.title")}</h2>
          <button class="icon-btn spinner" id="ref-refresh" title="${I18N.t("ref.refresh")}">${Icons.get("refresh")}</button>
        </div>
        <div class="text-dim" style="font-size:13px;margin-bottom:14px">${count} ${I18N.t("ref.count")}</div>

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
        ${friendsHtml}
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