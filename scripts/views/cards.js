/**
 * Раздел «Карточки»: инвентарь, индикаторы, стейкинг, магазин.
 */
(function () {
  let progressTimer = null;
  let activeProgressModal = null;

  function stopTimers() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function rarityClass(rarity) {
    const map = { basic: "", silver: "glow-silver", gold: "glow-gold shimmer", diamond: "glow-diamond sparkle", mythic: "glow-mythic shimmer sparkle ring-mythic" };
    return map[rarity] || "";
  }

  function cardArt(rarity) {
    return `<div class="card-art rarity-bg ${rarityClass(rarity)}" style="background:var(--rarity-${rarity})">
      <img src="assets/cards/${cap(rarity)}.png" alt="">
    </div>`;
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- индикаторы ---------- */
  function indicatorHtml() {
    const s = State.get();
    const ready = State.readyToClaimCount();
    const invCount = s.inventory.length;
    const stakingTip = ready > 0 ? I18N.t("cards.tip.staking").replace("N", ready) : I18N.t("cards.tip.staking0");
    const invTip = invCount > 0 ? I18N.t("cards.tip.inv").replace("N", invCount) : I18N.t("cards.tip.inv0");
    return `
      <div class="inv-indicators">
        <button class="inv-ind ${ready > 0 ? "on" : ""}" data-tip="${stakingTip}">
          ${Icons.get("clock")} ${I18N.t("cards.staking")}: ${ready}
        </button>
        <button class="inv-ind ${invCount > 0 ? "on" : ""}" data-tip="${invTip}">
          ${Icons.get("cards")} ${I18N.t("cards.count")}: ${invCount}
        </button>
      </div>`;
  }

  /* ---------- карточка инвентаря ---------- */
  function cardItemHtml(card) {
    const info = State.stakeInfo(card);
    let statusText = "";
    let statusClass = "";
    let btnHtml = "";
    if (card.status === "staking") {
      if (info && info.done) {
        statusText = I18N.t("cards.status.done");
        statusClass = "staking-done";
      } else {
        statusText = I18N.t("cards.status.staking");
      }
      btnHtml = `<button class="btn btn-primary card-btn stake-progress" data-id="${card.id}">${Icons.get("clock")}${I18N.t("cards.btn.progress")}</button>`;
    } else {
      statusText = I18N.t("cards.status.idle");
      btnHtml = `<button class="btn btn-primary card-btn stake-start" data-id="${card.id}">${Icons.get("bolt")}${I18N.t("cards.btn.stake")}</button>`;
    }
    const rarityColor = "var(--rarity-color-" + card.rarity + ")";
    return `
      <div class="card-item" data-id="${card.id}">
        ${cardArt(card.rarity)}
        <div class="card-meta">
          <div class="card-price">${Icons.get("robux")}${UI.fmt(card.value)}</div>
          <div class="card-date">${I18N.t("cards.obtained")}: ${UI.fmtDate(card.obtainedAt)}</div>
          <div class="card-rarity-name" style="color:${rarityColor}">${I18N.t("r." + card.rarity)}</div>
          <div class="card-status ${statusClass}">${statusText}</div>
          ${btnHtml}
        </div>
      </div>`;
  }

  /* ---------- модалка выбора срока стейкинга ---------- */
  function openStakeModal(card) {
    const s = State.get();
    const cfg = s.admin.staking;
    const options = Object.keys(State.DURATIONS)
      .map((key) => {
        const dur = State.DURATIONS[key];
        const c = cfg[key] || { pct: 0, bonus: 0 };
        const bonus = I18N.t("cards.stake.bonus")
          .replace("P", c.pct)
          .replace("B", c.bonus);
        return `
          <button class="stake-option" data-key="${key}">
            <span class="stake-icon" style="width:40px;height:40px;border-radius:12px;background:rgba(22,38,52,.75);border:1px solid var(--glass-border-strong);display:flex;align-items:center;justify-content:center;flex-shrink:0">${Icons.get("clock")}</span>
            <span class="stake-info">
              <span class="stake-duration" style="display:block">${dur.labelKey}</span>
              <span class="stake-bonus">${bonus}</span>
            </span>
          </button>`;
      })
      .join("");
    const m = UI.modal({ title: I18N.t("cards.stake.title"), icon: "clock", body: options });
    m.onSwipeDown(() => {});
    m.bodyEl.querySelectorAll(".stake-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const key = opt.getAttribute("data-key");
        const ok = State.startStake(card.id, key);
        if (ok) {
          UI.haptic("success");
          m.close();
          UI.toast(I18N.t("cards.status.staking"), "clock");
        }
      });
    });
  }

  /* ---------- модалка прогресса стейкинга ---------- */
  function openProgressModal(card) {
    stopTimers();
    const info = State.stakeInfo(card);
    if (!info) return;
    const cfg = State.DURATIONS[card.stake.durationKey];
    const cfgTxt = cfg ? cfg.labelKey : card.stake.durationKey;
    const circumference = 351.86;
    const base = card.value || 0;
    const minReward = base + (card.stake.bonus || 0);
    const maxReward = Math.round(base * (1 + (card.stake.pct || 0) / 100)) + (card.stake.bonus || 0);

    const body = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-weight:800;font-size:16px">${cap(card.rarity)} ${I18N.t("r." + card.rarity)}</div>
        <div class="text-dim" style="font-size:12.5px;margin-top:2px">${I18N.t("cards.stake.duration")} ${cfgTxt}</div>
      </div>
      <div class="ring-wrap">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#4ADE80"/><stop offset="100%" stop-color="#00d4ff"/>
            </linearGradient>
          </defs>
          <circle class="ring-bg" cx="65" cy="65" r="56" stroke-width="10" fill="none"/>
          <circle class="ring-fg" id="ring-fg" cx="65" cy="65" r="56" stroke-width="10" fill="none"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"/>
        </svg>
        <div class="ring-center">
          <div class="countdown-text" id="stake-cd">${UI.fmtDuration(info.left)}</div>
          <div class="text-dim" style="font-size:11.5px;margin-top:2px" id="stake-status"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;font-size:13px;color:var(--text-soft)">
        ${I18N.t("cards.stake.reward")}:
        <span class="reward-line">${Icons.get("robux")}<span id="stake-reward">${UI.fmt(minReward)}–${UI.fmt(maxReward)}</span></span>
      </div>
      <button class="btn btn-green" id="stake-claim" style="width:100%;margin-top:14px" ${info.done ? "" : "disabled"}>
        ${info.done ? I18N.t("cards.btn.claim") : I18N.t("cards.btn.claim.disabled")}
      </button>`;

    const m = UI.modal({ title: I18N.t("cards.stake.progress.title"), icon: "clock", body, center: false });
    activeProgressModal = m;
    m.onSwipeDown(() => stopTimers());
    m.overlay.addEventListener("click", () => stopTimers());

    const fg = m.bodyEl.querySelector("#ring-fg");
    const cd = m.bodyEl.querySelector("#stake-cd");
    const status = m.bodyEl.querySelector("#stake-status");
    const claimBtn = m.bodyEl.querySelector("#stake-claim");

    const renderTick = () => {
      const i = State.stakeInfo(card);
      if (!i) {
        stopTimers();
        return;
      }
      cd.textContent = UI.fmtDuration(i.left);
      status.textContent = i.done ? I18N.t("cards.stake.done") : I18N.t("cards.status.staking");
      fg.style.strokeDashoffset = (circumference * (1 - i.progress)).toFixed(2);
      if (i.done) {
        claimBtn.disabled = false;
        claimBtn.textContent = I18N.t("cards.btn.claim");
        status.style.color = "var(--accent-green)";
      }
    };
    renderTick();
    progressTimer = setInterval(renderTick, 1000);

    claimBtn.addEventListener("click", () => {
      const reward = State.claimStake(card.id);
      if (reward > 0) {
        UI.haptic("success");
        stopTimers();
        UI.confetti(claimBtn, 30);
        UI.popup("+" + UI.fmt(reward) + " " + I18N.t("stats.robux"), "robux");
        setTimeout(() => {
          m.close();
          activeProgressModal = null;
        }, 600);
      }
    });
  }

  /* ---------- магазин ---------- */
  function openShopModal() {
    const s = State.get();
    let list;
    if (!s.shop.length) {
      list = `<div class="empty-state" style="padding:28px 16px">${Icons.get("shop")}<span>${I18N.t("cards.shop.empty")}</span></div>`;
    } else {
      list = s.shop
        .map((o) => {
          const soldOut = o.sold >= o.qty;
          return `
            <div class="shop-item ${soldOut ? "sold-out" : ""}">
              <div class="shop-thumb rarity-bg" style="background:var(--rarity-${o.rarity})">
                <img src="assets/cards/${cap(o.rarity)}.png" alt="">
              </div>
              <div style="flex:1;min-width:0">
                <div class="shop-name" style="color:var(--rarity-color-${o.rarity})">${I18N.t("r." + o.rarity)}</div>
                <div class="shop-price">${Icons.get("coin")}${UI.fmt(o.price)}</div>
                <div class="shop-limit">${I18N.t("cards.shop.left")}: ${Math.max(0, o.qty - o.sold)} / ${o.qty}</div>
              </div>
              <button class="btn ${soldOut ? "btn-ghost" : "btn-gold"}" data-buy="${o.id}" ${soldOut ? "disabled" : ""}>
                ${soldOut ? I18N.t("cards.shop.sold") : I18N.t("cards.shop.buy")}
              </button>
            </div>`;
        })
        .join("");
    }
    const m = UI.modal({ title: I18N.t("cards.shop.title"), icon: "shop", body: list });
    m.onSwipeDown(() => {});
    m.bodyEl.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const res = State.buyOffer(btn.getAttribute("data-buy"));
        if (res.ok) {
          UI.haptic("success");
          UI.toast(I18N.t("cards.shop.bought"), "check");
        } else if (res.reason === "coins") {
          UI.haptic("error");
          UI.toast(I18N.t("cards.shop.noCoins"), "coin");
        } else if (res.reason === "sold") {
          UI.haptic("error");
          UI.toast(I18N.t("cards.shop.sold"), "info");
        }
      });
    });
  }

  /* ---------- тултип ---------- */
  function bindTips(root) {
    root.querySelectorAll("[data-tip]").forEach((el) => {
      let tip = null;
      const show = () => {
        if (tip) return;
        tip = document.createElement("div");
        tip.className = "tip show";
        tip.textContent = el.getAttribute("data-tip");
        el.style.position = "relative";
        el.appendChild(tip);
      };
      const hide = () => {
        if (tip) {
          tip.remove();
          tip = null;
        }
      };
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        show();
        setTimeout(hide, 2200);
      });
      el.addEventListener("mouseenter", show);
      el.addEventListener("mouseleave", hide);
    });
  }

  /* ---------- рендер ---------- */
  Views.cards = function () {
    stopTimers();
    if (activeProgressModal) {
      activeProgressModal.close(false);
      activeProgressModal = null;
    }
    const s = State.get();
    const sec = document.getElementById("sec-cards");

    let grid;
    if (!s.inventory.length) {
      grid = `
        <div class="empty-state">
          ${Icons.get("cards")}
          <div class="empty-title">${I18N.t("cards.empty.title")}</div>
          <div class="empty-sub">${I18N.t("cards.empty.sub")}</div>
        </div>`;
    } else {
      grid = `<div class="cards-grid">${s.inventory.map(cardItemHtml).join("")}</div>`;
    }

    sec.innerHTML = `
      <div class="panel glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("cards")}${I18N.t("cards.title")}</h2>
          <button class="icon-btn" id="shop-btn" title="${I18N.t("cards.shop")}">${Icons.get("shop")}</button>
        </div>
        <div style="display:flex;justify-content:flex-end;margin:-6px 0 12px">${indicatorHtml()}</div>
      </div>
      ${grid}`;

    bindTips(sec);

    sec.querySelectorAll(".stake-start").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = State.cardById(btn.getAttribute("data-id"));
        if (card) openStakeModal(card);
      });
    });
    sec.querySelectorAll(".stake-progress").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = State.cardById(btn.getAttribute("data-id"));
        if (card) openProgressModal(card);
      });
    });
    const shopBtn = sec.querySelector("#shop-btn");
    if (shopBtn) shopBtn.addEventListener("click", openShopModal);
  };
})();