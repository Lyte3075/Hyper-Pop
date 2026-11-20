const encoder = new TextEncoder();
const decoder = new TextDecoder();

function fsError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanUsername(value) {
  const name = String(value || "guest").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(name) ? name : "guest";
}

function normalizePath(value) {
  const parts = [];
  for (const part of String(value || "/").replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return "/" + parts.join("/");
}

async function getDirectory(root, parts, create = false) {
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

function mapPath(path, username) {
  const normalized = normalizePath(path);
  const home = "/home/" + username;

  if (normalized === "/") return { kind: "root" };
  if (normalized === "/home") return { kind: "home" };
  if (normalized === "/dev") return { kind: "dev" };
  if (normalized === "/dev/null") return { kind: "null" };
  if (["/bin", "/usr", "/usr/bin", "/usr/local", "/usr/local/bin", "/etc"].includes(normalized)) return { kind: "system-dir" };
  if (normalized === "/tmp" || normalized.startsWith("/tmp/")) {
    const suffix = normalized === "/tmp" ? [] : normalized.slice(5).split("/");
    return { kind: "physical", parts: ["home", username, ".ka-sh-tmp", ...suffix] };
  }
  if (normalized === home || normalized.startsWith(home + "/")) {
    const suffix = normalized === home ? [] : normalized.slice(home.length + 1).split("/");
    return { kind: "physical", parts: ["home", username, ...suffix] };
  }
  throw fsError("EACCES", "Permission denied: " + normalized);
}

function mapDomError(error, path) {
  if (error && error.code) return error;
  const name = error && error.name;
  if (name === "NotFoundError") return fsError("ENOENT", "No such file or directory: " + path);
  if (name === "TypeMismatchError") return fsError("EISDIR", "Path has the wrong type: " + path);
  if (name === "InvalidModificationError") return fsError("ENOTEMPTY", "Directory is not empty: " + path);
  if (name === "SecurityError") return fsError("EACCES", "Permission denied: " + path);
  return fsError("EIO", (error && error.message) || ("Filesystem error: " + path));
}

class KaShOpfsHost {
  constructor(root, username) {
    this.root = root;
    this.username = username;
    this.home = "/home/" + username;
  }

  async prepare() {
    await getDirectory(this.root, ["home", this.username], true);
    await getDirectory(this.root, ["home", this.username, ".ka-sh-tmp"], true);
  }

  async physicalHandle(parts) {
    if (!parts.length) return { kind: "directory", handle: this.root };
    const parent = await getDirectory(this.root, parts.slice(0, -1));
    const name = parts[parts.length - 1];
    try {
      return { kind: "directory", handle: await parent.getDirectoryHandle(name) };
    } catch (error) {
      if (error.name !== "TypeMismatchError" && error.name !== "NotFoundError") throw error;
    }
    try {
      return { kind: "file", handle: await parent.getFileHandle(name) };
    } catch (error) {
      throw mapDomError(error, "/" + parts.join("/"));
    }
  }

  async read(path) {
    const mapped = mapPath(path, this.username);
    if (mapped.kind === "null") return new Uint8Array();
    if (mapped.kind !== "physical") throw fsError("EISDIR", "Is a directory: " + path);
    try {
      const item = await this.physicalHandle(mapped.parts);
      if (item.kind !== "file") throw fsError("EISDIR", "Is a directory: " + path);
      return new Uint8Array(await (await item.handle.getFile()).arrayBuffer());
    } catch (error) {
      throw mapDomError(error, path);
    }
  }

  async write(path, content) {
    const mapped = mapPath(path, this.username);
    if (mapped.kind === "null") return;
    if (mapped.kind !== "physical" || !mapped.parts.length) throw fsError("EPERM", "Cannot write to " + path);
    try {
      const parent = await getDirectory(this.root, mapped.parts.slice(0, -1));
      const handle = await parent.getFileHandle(mapped.parts[mapped.parts.length - 1], { create: true });
      const writer = await handle.createWritable();
      await writer.write(content);
      await writer.close();
    } catch (error) {
      throw mapDomError(error, path);
    }
  }

  async append(path, content) {
    const mapped = mapPath(path, this.username);
    if (mapped.kind === "null") return;
    if (mapped.kind !== "physical" || !mapped.parts.length) throw fsError("EPERM", "Cannot append to " + path);
    try {
      const parent = await getDirectory(this.root, mapped.parts.slice(0, -1));
      const handle = await parent.getFileHandle(mapped.parts[mapped.parts.length - 1], { create: true });
      const file = await handle.getFile();
      const writer = await handle.createWritable({ keepExistingData: true });
      await writer.seek(file.size);
      await writer.write(content);
      await writer.close();
    } catch (error) {
      throw mapDomError(error, path);
    }
  }

  async mkdir(path, recursive = false) {
    const mapped = mapPath(path, this.username);
    if (mapped.kind !== "physical" || !mapped.parts.length) {
      if (recursive && ["root", "home", "dev"].includes(mapped.kind)) return;
      throw fsError("EPERM", "Cannot create directory: " + path);
    }
    try {
      if (recursive) await getDirectory(this.root, mapped.parts, true);
      else {
        const parent = await getDirectory(this.root, mapped.parts.slice(0, -1));
        await parent.getDirectoryHandle(mapped.parts[mapped.parts.length - 1], { create: true });
      }
    } catch (error) {
      throw mapDomError(error, path);
    }
  }

  async remove(path, recursive = false) {
    const mapped = mapPath(path, this.username);
    if (mapped.kind !== "physical" || !mapped.parts.length) throw fsError("EPERM", "Cannot remove protected path: " + path);
    try {
      const parent = await getDirectory(this.root, mapped.parts.slice(0, -1));
      await parent.removeEntry(mapped.parts[mapped.parts.length - 1], { recursive: !!recursive });
    } catch (error) {
      throw mapDomError(error, path);
    }
  }

  async stat(path) {
    const mapped = mapPath(path, this.username);
    if (["root", "home", "dev", "system-dir"].includes(mapped.kind)) {
      return { type: "dir", size: 0, mode: 0o755, mtimeMs: 0 };
    }
    if (mapped.kind === "null") return { type: "file", size: 0, mode: 0o666, mtimeMs: 0 };
    try {
      const item = await this.physicalHandle(mapped.parts);
      if (item.kind === "directory") return { type: "dir", size: 0, mode: 0o755, mtimeMs: 0 };
      const file = await item.handle.getFile();
      return { type: "file", size: file.size, mode: 0o644, mtimeMs: file.lastModified || 0 };
    } catch (error) {
      throw mapDomError(error, path);
    }
  }

  async readDir(path) {
    const mapped = mapPath(path, this.username);
    if (mapped.kind === "root") return [
      { name: "dev", type: "dir", mode: 0o755 },
      { name: "home", type: "dir", mode: 0o755 },
      { name: "tmp", type: "dir", mode: 0o777 }
    ];
    if (mapped.kind === "home") return [{ name: this.username, type: "dir", mode: 0o755 }];
    if (mapped.kind === "dev") return [{ name: "null", type: "file", size: 0, mode: 0o666 }];
    if (mapped.kind === "system-dir") return [];
    if (mapped.kind === "null") throw fsError("ENOTDIR", "Not a directory: " + path);
    try {
      const directory = await getDirectory(this.root, mapped.parts);
      const entries = [];
      for await (const [name, handle] of directory.entries()) {
        if (mapped.parts.join("/") === ["home", this.username].join("/") && name === ".ka-sh-tmp") continue;
        if (handle.kind === "directory") entries.push({ name, type: "dir", mode: 0o755, size: 0 });
        else {
          const file = await handle.getFile();
          entries.push({ name, type: "file", mode: 0o644, size: file.size, mtimeMs: file.lastModified || 0 });
        }
      }
      return entries;
    } catch (error) {
      throw mapDomError(error, path);
    }
  }

  async exists(path) {
    try { await this.stat(path); return true; }
    catch (error) { if (error.code === "ENOENT") return false; throw error; }
  }

  async copy(from, to) {
    const source = mapPath(from, this.username);
    const target = mapPath(to, this.username);
    if (source.kind !== "physical" || target.kind !== "physical" || !target.parts.length) {
      throw fsError("EPERM", "Copy is limited to your home directory.");
    }
    const sourceStat = await this.stat(from);
    if (sourceStat.type === "file") {
      await this.write(to, await this.read(from));
      return;
    }
    await this.mkdir(to, true);
    for (const entry of await this.readDir(from)) {
      await this.copy(normalizePath(from + "/" + entry.name), normalizePath(to + "/" + entry.name));
    }
  }

  async rename(from, to) {
    await this.copy(from, to);
    await this.remove(from, true);
  }

  async chmod() {
    // OPFS does not expose Unix permission bits. Bashkit may accept chmod,
    // but the browser storage layer remains private to this user's sandbox.
  }
}

export async function createKaShBashkit(options = {}) {
  const username = cleanUsername(options.username);
  const home = "/home/" + username;
  const root = await navigator.storage.getDirectory();
  const fs = new KaShOpfsHost(root, username);
  await fs.prepare();

  const { initBashkit, Bash } = await import("https://esm.sh/@everruns/bashkit-wasm@0.21.1");
  await initBashkit();

  const bash = new Bash({
    profile: "standard",
    username,
    hostname: "hyper-pop",
    cwd: home,
    env: {
      HOME: home,
      USER: username,
      LOGNAME: username,
      SHELL: "/bin/bash",
      TERM: "xterm-256color",
      PATH: "/usr/local/bin:/usr/bin:/bin"
    },
    fs,
    maxCommands: 1200,
    maxLoopIterations: 10000,
    timeoutMs: 15000,
    maxMemory: 96 * 1024 * 1024,
    commands: options.commands || {}
  });

  const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";

  return {
    async execute(command, syncCwd) {
      if (syncCwd) {
        const sync = await bash.execute("cd " + quote(syncCwd));
        if (sync.exitCode !== 0) return { stdout: "", stderr: sync.stderr, exitCode: sync.exitCode, cwd: await this.getCwd() };
      }
      const result = await bash.execute(String(command || ""), { capture: 2 * 1024 * 1024 });
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        stdoutTruncated: result.stdoutTruncated,
        stderrTruncated: result.stderrTruncated,
        cwd: await this.getCwd()
      };
    },
    async getCwd() {
      const result = await bash.execute("pwd", { capture: 4096 });
      return result.stdout.trim() || home;
    },
    cancel() { bash.cancel(); },
    clearCancel() { bash.clearCancel(); }
  };
}
