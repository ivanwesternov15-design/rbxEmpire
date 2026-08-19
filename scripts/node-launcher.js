/**
 * Общий лаунчер для Node-запуска (BotHost исполняет start command через node).
 * Поднимает Python-бэкенд: проверяет зависимости, запускает backend/main.py.
 * @param {string} rootDir - корень репозитория (для вычисления backend/)
 */
module.exports = function launch(rootDir) {
  const { spawn, spawnSync } = require("child_process");
  const path = require("path");
  const backendDir = path.join(rootDir, "backend");
  const py = process.env.PYTHON || (spawnSync("python3", ["--version"]).error ? "python" : "python3");

  const deps = spawnSync(py, ["-c", "import flask, requests, dotenv"], { encoding: "utf8" });
  if (deps.status !== 0) {
    process.stdout.write("[rbxflare] установка зависимостей backend/requirements.txt...\n");
    const inst = spawnSync(py, ["-m", "pip", "install", "-r", path.join(backendDir, "requirements.txt")], { stdio: "inherit" });
    if (inst.status !== 0) {
      process.stderr.write("[rbxflare] pip install завершился с ошибкой\n");
    }
  }

  const child = spawn(py, ["main.py"], { cwd: backendDir, stdio: "inherit" });
  child.on("error", (e) => {
    process.stderr.write("[rbxflare] не удалось запустить python: " + e.message + "\n");
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code == null ? 0 : code));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
};