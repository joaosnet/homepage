import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(fileURLToPath(import.meta.url), "../..");
const directory = resolve(ROOT_DIR, ".github/workflows");

let files = [];
try {
  files = (await readdir(directory)).filter(file => /\.ya?ml$/.test(file));
} catch {
  files = [];
}

const forbidden = [
  [/\bpull_request_target\s*:/, "pull_request_target desaconselhado"],
  [/\b(printenv|set\s+-x|curl\s+-v|lftp\s+debug)\b/i, "comando com risco de vazamento de segredos"],
  [/\$\{\{\s*secrets\.[^}]+\}\}\s*(?:\||>)/, "secret interpolado em redirecionamento"],
  [/\b(?:client_secret|password|token)\s*:\s*["']?[A-Za-z0-9_./+=-]{16,}/i, "possível credencial literal"]
];

const errors = [];
for (const file of files) {
  const source = await readFile(`${directory}/${file}`, "utf8");
  for (const [pattern, description] of forbidden) {
    if (pattern.test(source)) errors.push(`${file}: ${description}`);
  }
  for (const uses of source.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)) {
    const [, action, reference] = uses;
    if (!/^[0-9a-f]{40}$/.test(reference)) {
      errors.push(`${file}: ${action} não está fixada por SHA (referência: ${reference}).`);
    }
  }
}

if (errors.length) {
  console.error("FALHA NA AUDITORIA DE WORKFLOWS:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`Auditoria de workflows concluída: ${files.length} arquivo(s) auditados com sucesso.`);
