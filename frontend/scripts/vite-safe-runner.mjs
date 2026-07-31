import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { syncBuiltinESMExports } from "node:module";

const originalExec = childProcess.exec;

childProcess.exec = function patchedExec(command, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  if (String(command).trim().toLowerCase() === "net use") {
    queueMicrotask(() => cb?.(null, "", ""));
    const subprocess = new EventEmitter();
    subprocess.kill = () => true;
    return subprocess;
  }
  return originalExec.apply(this, arguments);
};

syncBuiltinESMExports();

const mode = process.argv[2] ?? "dev";
const { build, createServer, preview } = await import("vite");

if (mode === "build") {
  await build();
} else if (mode === "preview") {
  const server = await preview({
    preview: {
      host: "127.0.0.1",
      port: 4173
    }
  });
  server.printUrls();
} else {
  const server = await createServer({
    server: {
      host: "127.0.0.1",
      port: 5173
    }
  });
  await server.listen();
  server.printUrls();
}
