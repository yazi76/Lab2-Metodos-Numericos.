"use strict";

// Servidor local sin dependencias: compila y ejecuta el C++ original.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");

const port = Number(process.env.LAB2_PORT || 8765);
const host = "127.0.0.1";
const root = __dirname;
const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "lab2-cpp-"));
function removeBuild() {
  const resolved = path.resolve(buildDir);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("lab2-cpp-")) {
    throw new Error("La carpeta temporal no es válida.");
  }
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
const executable = path.join(buildDir, process.platform === "win32" ? "sistemas_lineales.exe" : "sistemas_lineales");
const compilation = spawnSync("g++", ["-std=c++17", "-O2", path.join(root, "sistemas_lineales.cpp"), "-o", executable], { encoding: "utf8", windowsHide: true, timeout: 60000 });
if (compilation.error || compilation.status !== 0) {
  console.error("No se pudo compilar sistemas_lineales.cpp. Comprueba que g++ esté instalado y disponible.");
  console.error(compilation.error?.message || compilation.stderr);
  removeBuild();
  process.exit(1);
}

const sessions = new Map();
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/logo.png", ["logo.png", "image/png"]],
  ["/sistemas_lineales.cpp", ["sistemas_lineales.cpp", "text/plain; charset=utf-8"]]
]);
function reply(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}
function emit(session, type, data) {
  const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  if (session.stream) session.stream.write(event);
  else session.pending.push(event);
}
function output(session, chunk) {
  session.outputBytes += Buffer.byteLength(chunk);
  if (session.outputBytes > 4 * 1024 * 1024) {
    if (!session.limited) {
      session.limited = true;
      emit(session, "output", { text: "\nLímite de salida alcanzado. Reinicia con un máximo de iteraciones menor.\n" });
      session.process.kill();
    }
    return;
  }
  emit(session, "output", { text: chunk });
}
async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk.toString();
    if (Buffer.byteLength(data) > 8192) throw new Error("Entrada demasiado larga.");
  }
  return data ? JSON.parse(data) : {};
}

const server = http.createServer(async (req, res) => {
  const allowedHosts = new Set([`${host}:${port}`, `localhost:${port}`]);
  const allowedOrigins = new Set([`http://${host}:${port}`, `http://localhost:${port}`, "null"]);
  if (!allowedHosts.has(req.headers.host) || (req.headers.origin && !allowedOrigins.has(req.headers.origin))) {
    reply(res, 403, { error: "Esta terminal solo admite conexiones locales." });
    return;
  }
  if (req.headers.origin) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${host}:${port}`);
  try {
    if (req.method === "GET" && staticFiles.has(url.pathname)) {
      const [file, contentType] = staticFiles.get(url.pathname);
      const filename = path.join(root, file);
      if (!fs.existsSync(filename)) { reply(res, 404, { error: "Archivo no encontrado." }); return; }
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
      fs.createReadStream(filename).on("error", () => res.destroy()).pipe(res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/start") {
      if ([...sessions.values()].filter((s) => !s.closed).length >= 4) {
        reply(res, 429, { error: "Hay cuatro sesiones abiertas. Detén una antes de iniciar otra." }); return;
      }
      const id = crypto.randomUUID();
      const child = spawn(executable, [], { cwd: root, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      const session = { process: child, stream: null, pending: [], closed: false, outputBytes: 0, lastInput: Date.now() };
      sessions.set(id, session);
      child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => output(session, chunk));
      child.stderr.on("data", (chunk) => output(session, chunk));
      child.stdin.on("error", () => {});
      child.on("error", (error) => output(session, `\nNo se pudo ejecutar C++: ${error.message}\n`));
      child.on("close", (code, signal) => {
        session.closed = true;
        session.exit = { code, signal };
        emit(session, "exit", session.exit);
        session.stream?.end();
        const cleanup = setTimeout(() => sessions.delete(id), 30000);
        cleanup.unref();
      });
      reply(res, 201, { session: id }); return;
    }
    if (req.method === "GET" && url.pathname === "/api/output") {
      const session = sessions.get(url.searchParams.get("session"));
      if (!session) { reply(res, 404, { error: "Sesión no encontrada." }); return; }
      if (session.stream) { reply(res, 409, { error: "La sesión ya está conectada." }); return; }
      res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", "Connection": "keep-alive" });
      res.flushHeaders();
      session.stream = res;
      res.write(": conectado\n\n");
      session.pending.splice(0).forEach((event) => res.write(event));
      if (session.closed) { res.end(); return; }
      const heartbeat = setInterval(() => res.write(": activo\n\n"), 15000);
      res.on("close", () => {
        clearInterval(heartbeat);
        if (session.stream === res) session.stream = null;
        if (!session.closed) session.process.kill();
      });
      return;
    }
    if (req.method === "POST" && ["/api/input", "/api/stop"].includes(url.pathname)) {
      const body = await readBody(req);
      const session = sessions.get(body.session);
      if (!session) { reply(res, 404, { error: "La sesión terminó. Inicia otra." }); return; }
      if (url.pathname === "/api/stop") {
        if (!session.closed) session.process.kill();
        reply(res, 200, { stopped: true }); return;
      }
      if (session.closed) { reply(res, 409, { error: "El programa terminó. Inicia otra sesión." }); return; }
      if (typeof body.input !== "string" || body.input.length > 4096 || body.input.includes("\0")) {
        reply(res, 400, { error: "Entrada inválida." }); return;
      }
      session.lastInput = Date.now();
      session.process.stdin.write(body.input.endsWith("\n") ? body.input : `${body.input}\n`);
      reply(res, 200, { received: true }); return;
    }
    reply(res, 404, { error: "Ruta no encontrada." });
  } catch (error) {
    reply(res, 400, { error: error.message || "No se pudo procesar la solicitud." });
  }
});
const idleCheck = setInterval(() => {
  for (const session of sessions.values()) {
    if (!session.closed && Date.now() - session.lastInput > 30 * 60 * 1000) session.process.kill();
  }
}, 60000);
idleCheck.unref();
function shutdown() {
  clearInterval(idleCheck);
  for (const session of sessions.values()) {
    session.process.kill();
    session.stream?.end();
  }
  server.close();
  setTimeout(() => {
    removeBuild();
    process.exit(0);
  }, 300);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("error", (error) => {
  console.error(`No se pudo iniciar la terminal: ${error.message}`);
  shutdown();
});
server.listen(port, host, () => console.log(`C++ compilado. Abre http://${host}:${port}/\nCtrl + C para detener el servidor.`));
