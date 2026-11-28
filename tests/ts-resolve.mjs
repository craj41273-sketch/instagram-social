import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/** Test-only resolver for extensionless relative imports and the `@/` alias. */
const projectRoot = new URL("../", import.meta.url);

function firstExisting(candidates) {
  return candidates.find((candidate) => existsSync(fileURLToPath(candidate)));
}

export async function resolve(specifier, context, nextResolve) {
  const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
  let candidates = [];

  if (specifier.startsWith("@/")) {
    const target = new URL(specifier.slice(2), projectRoot);
    candidates = hasExtension
      ? [target]
      : [new URL(`${target.href}.ts`), new URL(`${target.href}.tsx`)];
  } else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL &&
    !hasExtension
  ) {
    const target = new URL(specifier, context.parentURL);
    candidates = [new URL(`${target.href}.ts`), new URL(`${target.href}.tsx`)];
  }

  const existing = firstExisting(candidates);
  if (existing) return { url: existing.href, shortCircuit: true };

  return nextResolve(specifier, context);
}

/** Transpile TypeScript for Node versions without native type stripping. */
export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: url,
    });
    return { format: "module", source: outputText, shortCircuit: true };
  }

  return nextLoad(url, context);
}
