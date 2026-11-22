import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const config = JSON.parse(await readFile("firebase.json", "utf8"));
assert.equal(
  config.hosting.site,
  "jhonatas-castro-portfolio",
  "Deploy must target the portfolio site.",
);
assert.equal(config.hosting.public, "dist/client");
assert.ok(
  !config.firestore && !config.functions,
  "Portfolio deployment must not change data or server resources.",
);
const root = config.hosting.public;
const shell = await readFile(path.join(root, "_shell.html"), "utf8");
assert.ok(shell.includes("<html"), "SPA fallback is missing.");
for (const [route, text] of [
  ["index.html", "Dados claros"],
  ["projetos/index.html", "Nexus Workspace"],
  ["sobre/index.html", "Jhonatas"],
  ["contato/index.html", "Prepare seu pedido"],
]) {
  const html = await readFile(path.join(root, route), "utf8");
  assert.ok(html.includes(text), `Prerendered content missing in ${route}.`);
  assert.ok(
    !html.includes("lovable.js") && !html.includes("__lovableEvents"),
    `Editor scripts in ${route}.`,
  );
}
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(filename);
      continue;
    }
    assert.ok(!/^\.env/.test(entry.name), "Environment file in public output.");
    if (/\.(html|js|json)$/.test(entry.name)) {
      const contents = await readFile(filename, "utf8");
      assert.ok(
        !/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{10,}/.test(contents),
        "Private credential in public output.",
      );
    }
  }
}
await inspect(root);
console.log(
  "Static portfolio verified: public pages, fallback, hosting target and credential checks.",
);
