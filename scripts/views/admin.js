/**
 * Админ-панель (только для владельца, ID 8414792453).
 * Управление: конфиг стейкинга, шансы карточек, стоимость, магазин, задания, тест.
 * Рендерится как под-экран Профиля (window.ADMIN_OPEN) или как отдельная страница admin.html.
 */
const Views = window.Views || {};
window.Views = Views;

(function () {
  const DUR_KEYS = ["12h", "24h", "3d", "7d"];
  const DUR_LABELS = { "12h": "12 ч", "24h": "24 ч", "3d": "3 дн", "7d": "7 дн" };
  const CAT_KEYS = ["subs", "ach", "friends"];
  const CAT_LABELS = { subs: () => I18N.t("task.cat.subs"), ach: () => I18N.t("task.cat.ach"), friends: () => I18N.t("task.cat.friends") };
  const TASK_TYPES = [
    { v: "collect", l: "task.t.collect" },
    { v: "collect5", l: "task.t.collect5" },
    { v: "streak", l: "task.t.streak3" },
    { v: "staking", l: "task.t.staking1" },
    { v: "invite", l: "task.t.invite" },
    { v: "robux", l: "task.t.robux500" },
    { v: "daily", l: "task.t.daily" },
    { v: "custom", l: "task.t.custom" },
  ];

  function rarityOptions(sel) {
    return State.RARITIES.map((r) => `<option value="${r}" ${sel === r ? "selected" : ""}>${I18N.t("r." + r)}</option>`).join("");
  }

  /* ---------- стейкинг конфиг ---------- */
  function stakingSection() {
    const cfg = State.get().admin.staking;
    const cards = DUR_KEYS.map((k) => {
      const c = cfg[k] || { pct: 0, bonus: 0 };
      return `
        <div class="admin-card">
          <div class="ac-title">${DUR_LABELS[k]}</div>
          <div class="admin-inline">
            <span class="ai-label">%</span>
            <input type="number" step="0.1" value="${c.pct}" data-stake-pct="${k}">
          </div>
          <div class="admin-inline">
            <span class="ai-label">R</span>
            <input type="number" step="1" value="${c.bonus}" data-stake-bonus="${k}">
          </div>
        </div>`;
    }).join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("clock")}${I18N.t("admin.staking")}</h4>
        <div class="admin-grid">${cards}</div>
        <button class="btn btn-primary" id="admin-save-staking" style="width:100%;margin-top:8px">${Icons.get("check")}${I18N.t("admin.save")}</button>
      </div>`;
  }

  function saveStaking() {
    const root = document.getElementById("profile-sub");
    const cfg = {};
    DUR_KEYS.forEach((k) => {
      const pct = parseFloat(root.querySelector(`[data-stake-pct="${k}"]`).value) || 0;
      const bonus = parseInt(root.querySelector(`[data-stake-bonus="${k}"]`).value, 10) || 0;
      cfg[k] = { pct, bonus };
    });
    State.setAdmin({ staking: cfg });
    UI.haptic("success");
    UI.toast(I18N.t("admin.saved"), "check");
  }

  /* ---------- шансы ---------- */
  function chancesSection() {
    const ch = State.get().admin.chances;
    const sum = State.RARITIES.reduce((s, r) => s + (Number(ch[r]) || 0), 0);
    const rows = State.RARITIES.map(
      (r) => `
        <div class="admin-inline">
          <span class="ai-label" style="color:var(--rarity-color-${r});min-width:64px">${I18N.t("r." + r)}</span>
          <input type="number" step="1" value="${ch[r] || 0}" data-chance="${r}">
          <span class="ai-unit">%</span>
        </div>`
    ).join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("sparkles")}${I18N.t("admin.chances")}</h4>
        <div class="admin-card">
          ${rows}
          <div class="admin-sum ${sum === 100 ? "ok" : ""}" id="chance-sum">${I18N.t("admin.chances.sum")}: <b>${sum}%</b></div>
        </div>
        <button class="btn btn-primary" id="admin-save-chances" style="width:100%;margin-top:8px">${Icons.get("check")}${I18N.t("admin.save")}</button>
      </div>`;
  }

  function saveChances() {
    const root = document.getElementById("profile-sub");
    const chances = {};
    State.RARITIES.forEach((r) => {
      chances[r] = parseInt(root.querySelector(`[data-chance="${r}"]`).value, 10) || 0;
    });
    State.setAdmin({ chances });
    UI.haptic("success");
    UI.toast(I18N.t("admin.saved"), "check");
  }

  /* ---------- стоимость ---------- */
  function valuesSection() {
    const v = State.get().admin.values;
    const rows = State.RARITIES.map(
      (r) => `
        <div class="admin-inline">
          <span class="ai-label" style="color:var(--rarity-color-${r});min-width:64px">${I18N.t("r." + r)}</span>
          <input type="number" step="1" value="${v[r][0]}" data-value-min="${r}">
          <span class="ai-unit">–</span>
          <input type="number" step="1" value="${v[r][1]}" data-value-max="${r}">
          <span class="ai-unit">R</span>
        </div>`
    ).join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("robux")}${I18N.t("admin.values")}</h4>
        <div class="admin-card">${rows}</div>
        <button class="btn btn-primary" id="admin-save-values" style="width:100%;margin-top:8px">${Icons.get("check")}${I18N.t("admin.save")}</button>
      </div>`;
  }

  function saveValues() {
    const root = document.getElementById("profile-sub");
    const values = {};
    State.RARITIES.forEach((r) => {
      const min = parseInt(root.querySelector(`[data-value-min="${r}"]`).value, 10) || 0;
      const max = parseInt(root.querySelector(`[data-value-max="${r}"]`).value, 10) || min;
      values[r] = [min, Math.max(min, max)];
    });
    State.setAdmin({ values });
    UI.haptic("success");
    UI.toast(I18N.t("admin.saved"), "check");
  }

  /* ---------- магазин ---------- */
  function shopSection() {
    const s = State.get();
    const list = s.shop.length
      ? s.shop
          .map(
            (o) => `
            <div class="shop-item" style="margin-bottom:8px">
              <div class="shop-thumb rarity-bg" style="background:var(--rarity-${o.rarity})"><img src="assets/cards/${cap(o.rarity)}.png" alt=""></div>
              <div style="flex:1;min-width:0">
                <div class="shop-name" style="color:var(--rarity-color-${o.rarity})">${I18N.t("r." + o.rarity)}</div>
                <div class="shop-price">${Icons.get("coin")}${UI.fmt(o.price)}</div>
                <div class="shop-limit">${o.qty - o.sold} / ${o.qty}</div>
              </div>
              <button class="btn btn-danger" data-shop-del="${o.id}">${Icons.get("trash")}</button>
            </div>`
          )
          .join("")
      : `<div class="text-dim" style="font-size:13px;padding:8px 0">${I18N.t("cards.shop.empty")}</div>`;
    return `
      <div class="admin-section">
        <h4>${Icons.get("shop")}${I18N.t("admin.shop")}</h4>
        ${list}
        <div class="admin-card" style="margin-top:10px">
          <div class="ac-title">${I18N.t("admin.shop.add")}</div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.shop.rarity")}</span>
            <select id="shop-rarity">${rarityOptions("basic")}</select>
          </div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.shop.price")}</span>
            <input type="number" step="1" value="200" id="shop-price">
          </div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.shop.qty")}</span>
            <input type="number" step="1" value="3" id="shop-qty">
          </div>
          <button class="btn btn-gold" id="admin-shop-publish" style="width:100%">${Icons.get("plus")}${I18N.t("admin.shop.publish")}</button>
        </div>
      </div>`;
  }

  /* ---------- задания ---------- */
  function tasksSection() {
    const s = State.get();
    const list = s.tasks
      .map((t) => {
        const title = t.titleKey ? I18N.t(t.titleKey) : t.title;
        const type = t.type;
        const reward = t.reward.type === "coins" ? "+" + t.reward.amount + " C" : t.reward.type === "robux" ? "+" + t.reward.amount + " R" : t.reward.type === "card" ? "Card" : "";
        const customControls =
          type === "custom"
            ? `
              <div style="display:flex;gap:6px;margin-top:8px;align-items:center">
                <span class="ai-label">${I18N.t("admin.tasks.custom.progress")}: ${t.progress}/${t.target}</span>
                <button class="btn btn-ghost" data-task-dec="${t.id}" style="padding:4px 10px;font-size:12px">−1</button>
                <button class="btn btn-ghost" data-task-inc="${t.id}" style="padding:4px 10px;font-size:12px">+1</button>
              </div>`
            : "";
        return `
          <div class="admin-card" style="margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
              <div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <span style="font-weight:700;font-size:13.5px">${title}</span>
                  <span class="badge" style="font-size:10px;padding:2px 8px">${CAT_LABELS[t.cat] ? CAT_LABELS[t.cat]() : I18N.t("task.cat.ach")}</span>
                </div>
                <div class="text-dim" style="font-size:11.5px;margin-top:2px">${type} · ${I18N.t("admin.tasks.target")}: ${t.target} · ${reward} ${t.done ? "· ✓" : ""}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="btn ${t.done ? "btn-ghost" : "btn-green"}" data-task-force="${t.id}" style="padding:5px 10px;font-size:11.5px">
                  ${t.done ? I18N.t("admin.tasks.unforce") : I18N.t("admin.tasks.force")}
                </button>
                <button class="btn btn-danger" data-task-del="${t.id}" style="padding:5px 10px;font-size:11.5px">${Icons.get("trash")}</button>
              </div>
            </div>
            ${customControls}
          </div>`;
      })
      .join("");
    const typeOptions = TASK_TYPES.map((tt) => `<option value="${tt.v}">${I18N.t(tt.l)}</option>`).join("");
    const catOptions = CAT_KEYS.map((c) => `<option value="${c}">${CAT_LABELS[c]()}</option>`).join("");
    return `
      <div class="admin-section">
        <h4>${Icons.get("tasks")}${I18N.t("admin.tasks")}</h4>
        ${list}
        <div class="admin-card">
          <div class="ac-title">${I18N.t("admin.tasks.add")}</div>
          <div class="admin-inline" style="align-items:flex-start;flex-direction:column;gap:6px">
            <span class="ai-label">${I18N.t("admin.tasks.cat")}</span>
            <select id="task-cat" style="width:100%">${catOptions}</select>
          </div>
          <div class="field"><label>${I18N.t("admin.tasks.title")}</label><input id="task-title" type="text"></div>
          <div class="field"><label>${I18N.t("admin.tasks.desc")}</label><input id="task-desc" type="text"></div>
          <div class="admin-inline" style="align-items:flex-start;flex-direction:column;gap:6px">
            <span class="ai-label">${I18N.t("admin.tasks.type")}</span>
            <select id="task-type" style="width:100%">${typeOptions}</select>
          </div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.tasks.target")}</span>
            <input id="task-target" type="number" step="1" value="1">
          </div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.tasks.reward.type")}</span>
            <select id="task-reward-type" style="flex:1">
              <option value="coins">Coins</option>
              <option value="robux">Robux</option>
              <option value="card">Card</option>
            </select>
          </div>
          <div class="admin-inline">
            <span class="ai-label">${I18N.t("admin.tasks.reward.amount")}</span>
            <input id="task-reward-amount" type="number" step="1" value="100">
          </div>
          <button class="btn btn-primary" id="admin-task-add" style="width:100%">${Icons.get("plus")}${I18N.t("admin.tasks.add.btn")}</button>
        </div>
      </div>`;
  }

  /* ---------- тест ---------- */
  function testSection() {
    return `
      <div class="admin-section">
        <h4>${Icons.get("gamepad")}${I18N.t("admin.test")}</h4>
        <div class="admin-grid">
          <button class="btn btn-ghost" id="test-friend">${Icons.get("users")}${I18N.t("admin.test.friend")}</button>
          <button class="btn btn-ghost" id="test-coins">${Icons.get("coin")}${I18N.t("admin.test.coins")}</button>
          <button class="btn btn-ghost" id="test-robux">${Icons.get("robux")}${I18N.t("admin.test.robux")}</button>
        </div>
      </div>`;
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- биндинги ---------- */
  function bind(root) {
    const sBtn = root.querySelector("#admin-save-staking");
    if (sBtn) sBtn.addEventListener("click", saveStaking);
    const cBtn = root.querySelector("#admin-save-chances");
    if (cBtn) {
      cBtn.addEventListener("click", saveChances);
      root.querySelectorAll("[data-chance]").forEach((inp) => {
        inp.addEventListener("input", () => {
          const sum = State.RARITIES.reduce((acc, r) => {
            const el = root.querySelector(`[data-chance="${r}"]`);
            return acc + (parseInt(el.value, 10) || 0);
          }, 0);
          const el = root.querySelector("#chance-sum");
          el.innerHTML = `${I18N.t("admin.chances.sum")}: <b>${sum}%</b>`;
          el.classList.toggle("ok", sum === 100);
        });
      });
    }
    const vBtn = root.querySelector("#admin-save-values");
    if (vBtn) vBtn.addEventListener("click", saveValues);

    const publish = root.querySelector("#admin-shop-publish");
    if (publish) {
      publish.addEventListener("click", () => {
        const rarity = root.querySelector("#shop-rarity").value;
        const price = parseInt(root.querySelector("#shop-price").value, 10) || 100;
        const qty = parseInt(root.querySelector("#shop-qty").value, 10) || 1;
        State.addShopOffer({ rarity, price, qty });
        UI.haptic("success");
        UI.toast(I18N.t("admin.shop.published"), "check");
      });
    }
    root.querySelectorAll("[data-shop-del]").forEach((b) => {
      b.addEventListener("click", () => State.removeShopOffer(b.getAttribute("data-shop-del")));
    });

    const addTask = root.querySelector("#admin-task-add");
    if (addTask) {
      addTask.addEventListener("click", () => {
        const title = root.querySelector("#task-title").value.trim();
        const desc = root.querySelector("#task-desc").value.trim();
        const catEl = root.querySelector("#task-cat");
        const cat = catEl ? catEl.value : "ach";
        const type = root.querySelector("#task-type").value;
        const target = parseInt(root.querySelector("#task-target").value, 10) || 1;
        const rType = root.querySelector("#task-reward-type").value;
        const amount = parseInt(root.querySelector("#task-reward-amount").value, 10) || 0;
        State.addTask({
          type,
          title,
          desc,
          cat,
          target,
          reward: rType === "card" ? { type: "card", rarity: "gold" } : { type: rType, amount },
        });
        UI.haptic("success");
        UI.toast(I18N.t("admin.tasks.added"), "check");
      });
    }
    root.querySelectorAll("[data-task-del]").forEach((b) => {
      b.addEventListener("click", () => {
        State.removeTask(b.getAttribute("data-task-del"));
        UI.toast(I18N.t("admin.tasks.removed"), "info");
      });
    });
    root.querySelectorAll("[data-task-force]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-task-force");
        const t = State.get().tasks.find((x) => x.id === id);
        if (!t) return;
        const granted = State.forceTask(id, !t.done);
        if (granted) {
          UI.popup("+" + (granted.coins || granted.robux) + (granted.coins ? " " + I18N.t("stats.coins") : " " + I18N.t("stats.robux")), granted.coins ? "coin" : "robux");
        }
      });
    });
    root.querySelectorAll("[data-task-inc]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-task-inc");
        const t = State.get().tasks.find((x) => x.id === id);
        if (t) State.setTaskProgress(id, t.progress + 1);
      });
    });
    root.querySelectorAll("[data-task-dec]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-task-dec");
        const t = State.get().tasks.find((x) => x.id === id);
        if (t) State.setTaskProgress(id, t.progress - 1);
      });
    });

    const tf = root.querySelector("#test-friend");
    if (tf) {
      tf.addEventListener("click", () => {
        State.addTestFriend();
        UI.haptic("success");
        UI.toast(I18N.t("admin.test.friend.added"), "check");
      });
    }
    const tc = root.querySelector("#test-coins");
    if (tc) tc.addEventListener("click", () => { UI.haptic("light"); State.addTestCoins(); });
    const tr = root.querySelector("#test-robux");
    if (tr) tr.addEventListener("click", () => { UI.haptic("light"); State.addTestRobux(); });
  }

  Views.admin = function () {
    const isPage = !!document.getElementById("admin-root");
    const sub = isPage ? document.getElementById("admin-root") : document.getElementById("profile-sub");
    if (!sub) return;
    const s = State.get();
    sub.innerHTML = `
      ${isPage ? "" : `
      <div class="sub-header">
        <button class="back-btn" id="admin-back">${Icons.get("arrow")}${I18N.t("profile.title")}</button>
        <h3>${Icons.get("shield")}${I18N.t("admin.title")}</h3>
      </div>`}
      <div class="admin-stats">
        <div class="admin-stat">${Icons.get("cards")}<b>${s.inventory.length}</b><span>${I18N.t("cards.title")}</span></div>
        <div class="admin-stat">${Icons.get("users")}<b>${s.referrals.length}</b><span>${I18N.t("ref.title")}</span></div>
        <div class="admin-stat">${Icons.get("coin")}<b>${UI.fmt(s.balances.coins)}</b><span>${I18N.t("stats.coins")}</span></div>
        <div class="admin-stat">${Icons.get("robux")}<b>${UI.fmt(s.balances.robux)}</b><span>${I18N.t("stats.robux")}</span></div>
      </div>
      ${stakingSection()}
      ${chancesSection()}
      ${valuesSection()}
      ${shopSection()}
      ${tasksSection()}
      ${testSection()}`;
    const back = sub.querySelector("#admin-back");
    if (back) {
      back.addEventListener("click", () => {
        if (isPage) window.history.back();
        else {
          window.ADMIN_OPEN = false;
          Views.render("profile");
        }
      });
    }
    bind(sub);
  };
})();