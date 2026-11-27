import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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
const siteUrl = `https://${config.hosting.site}.web.app`;
const publicPages = [
  ["/", "index.html", "Dados claros"],
  ["/projetos", "projetos/index.html", "Nexus Workspace"],
  ["/sobre", "sobre/index.html", "Jhonatas"],
  ["/contato", "contato/index.html", "Prepare seu pedido"],
];

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(filename)));
    else files.push(filename);
  }
  return files;
}

async function appRoutes() {
  const routes = new Set();
  for (const file of await readdir("src/routes")) {
    if (!/\.tsx?$/.test(file)) continue;
    const source = await readFile(path.join("src/routes", file), "utf8");
    for (const [, route] of source.matchAll(/createFileRoute\(\s*["']([^"']+)["']/g)) {
      routes.add(route);
    }
  }
  return routes;
}

const files = await listFiles(root);
const routes = await appRoutes();

const shell = await readFile(path.join(root, "_shell.html"), "utf8");
assert.ok(shell.includes("<html"), "SPA fallback is missing.");
assert.ok(
  shell.includes("Nexo Empresarial"),
  "SPA fallback must render the /app (Nexo Empresarial) head.",
);
assert.ok(
  /<script[^>]+type="module"[^>]+src="\/assets\/[^"]+\.js"/.test(shell),
  "SPA fallback must load the client entry script.",
);
assert.ok(
  routes.has("/app") && routes.has("/dashboard"),
  "SPA routes /app and /dashboard missing.",
);

for (const [, page, text] of publicPages) {
  const html = await readFile(path.join(root, page), "utf8");
  assert.ok(html.includes(text), `Prerendered content missing in ${page}.`);
}

for (const file of files) {
  const name = path.basename(file);
  assert.ok(!/^\.env/.test(name), `Environment file in public output: ${file}.`);
  if (!/\.(html|js|css|json|xml|txt)$/.test(name)) continue;
  const contents = await readFile(file, "utf8");
  assert.ok(
    !/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{10,}/.test(contents),
    `Private credential in public output: ${file}.`,
  );
  if (name.endsWith(".html")) {
    assert.ok(
      !contents.includes("lovable.js") && !contents.includes("__lovableEvents"),
      `Editor scripts in ${file}.`,
    );
  }
}

async function resolvesLocally(reference) {
  const pathname = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (pathname === "/") return exists(path.join(root, "index.html"));
  const target = path.join(root, pathname);
  if (path.extname(pathname)) return exists(target);
  const route = pathname.replace(/\/$/, "");
  return (
    (await exists(path.join(target, "index.html"))) ||
    (await exists(`${target}.html`)) ||
    routes.has(route)
  );
}

const broken = [];
for (const file of files) {
  const extension = path.extname(file);
  if (![".html", ".js", ".css"].includes(extension)) continue;
  const contents = await readFile(file, "utf8");
  const references = new Set();
  if (extension === ".html") {
    for (const [, value] of contents.matchAll(/\s(?:href|src)="([^"]+)"/g)) references.add(value);
    for (const [, value] of contents.matchAll(/\ssrcset="([^"]+)"/g)) {
      for (const candidate of value.split(",")) references.add(candidate.trim().split(/\s+/)[0]);
    }
  } else {
    for (const [value] of contents.matchAll(/\/(?:assets|images)\/[\w.-]+\.\w+/g))
      references.add(value);
  }
  if (extension === ".css") {
    for (const [, value] of contents.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      if (!value.startsWith("/") && !/^(?:[a-z]+:|#)/i.test(value)) {
        references.add(path.posix.join("/", path.relative(root, path.dirname(file)), value));
      }
    }
  }
  for (const reference of references) {
    if (!reference.startsWith("/") || reference.startsWith("//")) continue;
    if (!(await resolvesLocally(reference)))
      broken.push(`${path.relative(root, file)} -> ${reference}`);
  }
}
assert.deepEqual(broken, [], `Broken internal links or assets:\n${broken.join("\n")}`);

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
const locations = [...sitemap.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, loc]) => loc.trim(),
);
for (const loc of locations) {
  assert.ok(loc.startsWith(`${siteUrl}/`), `Sitemap entry outside ${siteUrl}: ${loc}.`);
  const route = loc.slice(siteUrl.length);
  assert.ok(
    publicPages.some(([pageRoute]) => pageRoute === route),
    `Sitemap lists a non-public page: ${loc}.`,
  );
}
for (const [route] of publicPages) {
  assert.ok(locations.includes(`${siteUrl}${route}`), `Sitemap is missing ${route}.`);
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
assert.ok(
  robots.split(/\r?\n/).some((line) => line.trim() === `Sitemap: ${siteUrl}/sitemap.xml`),
  "robots.txt must reference the portfolio sitemap.",
);
const robotsGroups = [];
let readingAgents = false;
for (const rawLine of robots.split(/\r?\n/)) {
  const line = rawLine.replace(/#.*/, "").trim();
  const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
  if (!match) continue;
  const [, field, value] = match;
  if (/^user-agent$/i.test(field)) {
    if (!readingAgents) robotsGroups.push({ agents: [], rules: [] });
    robotsGroups.at(-1).agents.push(value);
    readingAgents = true;
    continue;
  }
  readingAgents = false;
  if (/^(?:allow|disallow)$/i.test(field) && value && robotsGroups.length) {
    robotsGroups.at(-1).rules.push({ allow: /^allow$/i.test(field), path: value });
  }
}
function robotsPattern(rulePath) {
  const anchored = rulePath.endsWith("$");
  const body = (anchored ? rulePath.slice(0, -1) : rulePath)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}
const blockedRoutes = [];
for (const { agents, rules } of robotsGroups) {
  for (const [route] of publicPages) {
    const matching = rules.filter((rule) => robotsPattern(rule.path).test(route));
    const longest = Math.max(0, ...matching.map((rule) => rule.path.length));
    const decisive = matching.filter((rule) => rule.path.length === longest);
    if (decisive.length && decisive.every((rule) => !rule.allow)) {
      blockedRoutes.push(`${agents.join(", ")}: ${route}`);
    }
  }
}
assert.deepEqual(blockedRoutes, [], `robots.txt blocks public pages:\n${blockedRoutes.join("\n")}`);

console.log(
  "Static portfolio verified: public pages, /app fallback, internal links and assets, sitemap, robots, hosting target and credential checks.",
);
