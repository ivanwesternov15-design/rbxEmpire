/**
 * Раздел «Задания».
 */
(function () {
  let lastDoneIds = null;

  function taskIcon(type) {
    const map = { collect: "cards", collect5: "cards", streak: "flame", staking: "clock", invite: "referrals", robux: "robux", daily: "daily", custom: "sparkles" };
    return map[type] || "tasks";
  }

  function rewardText(task) {
    const r = task.reward;
    if (r.type === "coins") return "+" + UI.fmt(r.amount) + " " + I18N.t("stats.coins");
    if (r.type === "robux") return "+" + UI.fmt(r.amount) + " " + I18N.t("stats.robux");
    if (r.type === "card") return I18N.t("r." + (r.rarity || "gold"));
    return "";
  }

  function taskCardHtml(task, idx) {
    const title = task.titleKey ? I18N.t(task.titleKey) : task.title || I18N.t("tasks.title");
    const desc = task.descKey ? I18N.t(task.descKey) : task.desc || "";
    const pct = Math.min(100, Math.round((task.progress / task.target) * 100));
    const justDone = task.done && lastDoneIds && !lastDoneIds.includes(task.id) ? "just-done" : "";
    const progressHtml =
      task.done || task.target <= 1
        ? ""
        : `<div class="task-body">
             <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
             <div class="task-progress-num">${UI.fmt(task.progress)} / ${UI.fmt(task.target)}</div>
           </div>`;
    return `
      <div class="task-card ${task.done ? "done" : ""} ${justDone}" data-id="${task.id}">
        <div class="task-head">
          <span class="task-icon ${task.done ? "done-icon" : ""}">${Icons.get(task.done ? "check" : taskIcon(task.type))}</span>
          <span style="flex:1;min-width:0">
            <span class="task-title" style="display:block">${title}</span>
            ${desc ? `<span class="task-desc" style="display:block">${desc}</span>` : ""}
          </span>
        </div>
        <div class="task-body">
          <div class="task-reward ${task.done ? "earned" : ""}">
            ${task.done ? `<span class="tick">${Icons.get("check")}</span>` : Icons.get(task.reward.type === "coins" ? "coin" : task.reward.type === "robux" ? "robux" : "cards")}
            ${rewardText(task)} ${task.done ? "· " + I18N.t("tasks.reward.earned") : ""}
          </div>
          ${progressHtml}
        </div>
      </div>`;
  }

  Views.tasks = function () {
    const s = State.get();
    const sec = document.getElementById("sec-tasks");
    const tasks = s.tasks;
    if (!tasks.length) {
      sec.innerHTML = `<div class="panel glass-panel"><div class="empty-state">${Icons.get("tasks")}<div class="empty-title">${I18N.t("tasks.empty")}</div></div></div>`;
      return;
    }
    const active = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);

    const groupHtml = (list, labelKey, icon) =>
      list.length
        ? `<div class="task-group-title">${Icons.get(icon)}${I18N.t(labelKey)}</div>` + list.map(taskCardHtml).join("")
        : "";

    sec.innerHTML = `
      <div class="panel glass-panel" style="padding:6px 16px">
        <div class="panel-header">
          <h2 class="panel-title">${Icons.get("tasks")}${I18N.t("tasks.title")}</h2>
        </div>
      </div>
      ${groupHtml(active, "tasks.active", "bolt")}
      ${groupHtml(done, "tasks.done", "check")}`;

    // запомнить выполнившиеся для следующего рендера (анимация just-done)
    const nowDone = tasks.filter((t) => t.done).map((t) => t.id);
    const newlyDone = lastDoneIds ? tasks.filter((t) => t.done && !lastDoneIds.includes(t.id)) : [];
    lastDoneIds = nowDone;

    newlyDone.forEach(() => {
      UI.haptic("success");
    });

    if (newlyDone.length) {
      // отрисовка конфетти для свежевыполненных
      newlyDone.forEach((t) => {
        const el = sec.querySelector('.task-card[data-id="' + t.id + '"]');
        if (el) UI.confetti(el, 18);
      });
    }
  };
})();