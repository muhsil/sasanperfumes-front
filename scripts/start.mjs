import { spawn } from "node:child_process";

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || "3000";
const command = process.platform === "win32" ? "cmd.exe" : "next";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "next", "start", "-H", host, "-p", port]
    : ["start", "-H", host, "-p", port];

const child = spawn(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
