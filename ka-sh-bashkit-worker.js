import { createKaShBashkit } from "./ka-sh-bashkit.js";

const encoder = new TextEncoder();
const pendingHost = new Map();
let hostRequestId = 0;
let runtime = null;

function askPage(payload) {
  const id = ++hostRequestId;
  return new Promise((resolve, reject) => {
    pendingHost.set(id, { resolve, reject });
    self.postMessage({ type: "ka-command", id, ...payload });
  });
}

const appCommands = [
  "nano", "write", "append", "download", "calc",
  "js", "run", "python", "py", "pip", "preview", "image",
  "nodejs", "npm", "github", "git", "korona", "server", "node",
  "apt", "apt-get", "sudo", "proxy", "curl", "wget", "fetch",
  "json", "url", "upload", "open", "storage", "db",
  "version", "about", "reset", "exit", "history", "man",
  "which", "hostname", "id", "uptime", "free", "tree",
  "whoami", "uname", "clear", "help"
];

const commands = Object.fromEntries(appCommands.map(name => [name, async ctx => {
  const response = await askPage({
    name: ctx.name || name,
    argv: ctx.argv || [],
    cwd: ctx.cwd || "/",
    stdin: null
  });
  if (response.stdout) await ctx.stdout.write(encoder.encode(response.stdout));
  if (response.stderr) await ctx.stderr.write(encoder.encode(response.stderr));
  return { exitCode: Number.isInteger(response.exitCode) ? response.exitCode : 0 };
}]));

self.addEventListener("message", async event => {
  const message = event.data || {};

  if (message.type === "host-response") {
    const pending = pendingHost.get(message.id);
    if (!pending) return;
    pendingHost.delete(message.id);
    pending.resolve(message.result || {});
    return;
  }

  if (message.type === "host-error") {
    const pending = pendingHost.get(message.id);
    if (!pending) return;
    pendingHost.delete(message.id);
    pending.reject(new Error(message.error || "KA-SH command failed."));
    return;
  }

  if (message.type === "init") {
    try {
      runtime = await createKaShBashkit({
        username: message.username,
        commands
      });
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "init-error",
        error: error && error.message ? error.message : String(error)
      });
    }
    return;
  }

  if (message.type === "execute") {
    if (!runtime) {
      self.postMessage({ type: "result", id: message.id, error: "Bash runtime is not initialized." });
      return;
    }
    try {
      const result = await runtime.execute(message.command, message.cwd);
      self.postMessage({ type: "result", id: message.id, result });
    } catch (error) {
      self.postMessage({
        type: "result",
        id: message.id,
        error: error && error.message ? error.message : String(error)
      });
    }
    return;
  }

  if (message.type === "cancel") {
    runtime?.cancel();
    return;
  }

  if (message.type === "clear-cancel") {
    runtime?.clearCancel();
  }
});
