import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(fileURLToPath(import.meta.url), "../..");

let tracked = [];
try {
  tracked = execFileSync("git", ["ls-files"], { cwd: ROOT_DIR, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
} catch {
  tracked = [];
}

const forbiddenNames = tracked.filter(file => existsSync(resolve(ROOT_DIR, file)) &&
  /(^|\/)(client_secret[^/]*\.json|\.env(?:\.|$)|[^/]*\.(?:ovpn|p12|pem)|\.webhook_secret)$/i.test(file)
);
const findings = forbiddenNames.map(file => `${file}: nome de arquivo sensível que não deve ser versionado`);

const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /"client_secret"\s*:\s*"[^"]+"/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgh[pousr]_[0-9A-Za-z]{30,}\b/
];

for (const file of tracked.filter(file => existsSync(resolve(ROOT_DIR, file)) && !file.startsWith(".git/") && file !== "scripts/scan-secrets.mjs")) {
  let source;
  try {
    source = await readFile(resolve(ROOT_DIR, file), "utf8");
  } catch {
    continue;
  }
  if (patterns.some(pattern => pattern.test(source))) {
    findings.push(`${file}: possível segredo exposto`);
  }
}

if (findings.length) {
  console.error("FALHA NA VARREDURA DE CREDENCIAIS:\n" + findings.join("\n"));
  process.exit(1);
}
console.log(`Varredura de credenciais concluída: ${tracked.length} arquivo(s) verificados sem segredos.`);
