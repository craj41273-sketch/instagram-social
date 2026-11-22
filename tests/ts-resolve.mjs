import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Test-only resolver that appends `.ts` to extensionless relative imports. */
export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = /\.[a-z0-9]+$/i.test(specifier);

  if (isRelative && !hasExtension && context.parentURL) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) {
      return { url: candidate.href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
