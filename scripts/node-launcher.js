/**
 * Общий лаунчер для Node-запуска (BotHost исполняет start command через node).
 * Бэкенд использует только стандартную библиотеку Python — запускаем напрямую.
 * @param {string} rootDir - корень репозитория (для вычисления backend/)
 */
module.exports = function launch(rootDir) {
  const { spawn, spawnSync } = require("child_process");
  const path = require("path");
  const backendDir = path.join(rootDir, "backend");
  const py = process.env.PYTHON || (spawnSync("python3", ["--version"]).error ? "python" : "python3");

  const child = spawn(py, ["main.py"], { cwd: backendDir, stdio: "inherit" });
  child.on("error", (e) => {
    process.stderr.write("[rbxflare] не удалось запустить python: " + e.message + "\n");
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code == null ? 0 : code));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
};