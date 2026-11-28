import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const config = read("next.config.ts");
const workflow = read(".github/workflows/pages.yml");

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("Next.js is configured for a GitHub Pages static export", () => {
  for (const setting of [
    'output: "export"',
    'basePath: "/instagram-social"',
    "trailingSlash: true",
    'pageExtensions: ["tsx", "page.ts"]',
    "unoptimized: true",
  ]) {
    assert.ok(config.includes(setting), setting);
  }
  assert.equal(config.includes("assetPrefix"), false);
  assert.equal(existsSync("public/.nojekyll"), true);
});

test("Pages workflow validates, exports, and uploads only out/", () => {
  for (const line of [
    'branches: ["main"]',
    "workflow_dispatch:",
    "npm ci",
    "npm run check",
    "npm test",
    "npm run build",
    "test -f out/index.html",
    "path: out",
    "actions/upload-pages-artifact@v3",
    "actions/deploy-pages@v5",
  ]) {
    assert.ok(workflow.includes(line), line);
  }
  assert.equal(read(".github/workflows/ci.yml").includes("npm run build"), true);
  assert.equal(existsSync(".github/workflows/static.yml"), false);
});

test("static graph excludes server actions, API routes, and request APIs", () => {
  const sources = [...walk("app"), ...walk("components")].filter((path) =>
    /\.(ts|tsx)$/.test(path),
  );
  for (const path of sources) {
    const source = read(path);
    if (!path.startsWith("app/actions/") && !path.startsWith("app/api/")) {
      assert.equal(source.includes('from "@/app/actions/'), false, path);
      assert.equal(/await (searchParams|cookies\(\)|headers\(\))/.test(source), false, path);
    }
  }
  const stubs = read("lib/static/actions.ts");
  assert.match(stubs, /needs a server backend and is unavailable on GitHub Pages/);
});

test("every dynamic page has static params and a closed param set", () => {
  const pages = walk("app").filter(
    (path) => path.includes("[") && path.endsWith("page.tsx"),
  );
  assert.equal(pages.length >= 10, true);
  for (const path of pages) {
    const source = read(path);
    assert.match(source, /export function generateStaticParams\(\)/, path);
    assert.match(source, /export const dynamicParams = false/, path);
  }
});
