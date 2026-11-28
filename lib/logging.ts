/**
 * Server-only diagnostic logging. External errors frequently contain URLs,
 * tokens, or SQL details, so context values are redacted before logging.
 */
import "server-only";
import { createHash } from "node:crypto";

const REDACT_KEY = /password|secret|token|key|url|cookie|credential|authorization/i;

type LogContext = Record<string, unknown>;

function redact(context: LogContext): LogContext {
  const safe: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (REDACT_KEY.test(key)) {
      safe[key] = "[redacted]";
      continue;
    }
    safe[key] = typeof value === "string" ? value.slice(0, 200) : value;
  }

  return safe;
}

/** Stable, non-reversible handle for correlating a message without logging it. */
function reference(message: string): string {
  return createHash("sha256").update(message).digest("hex").slice(0, 12);
}

/** Logs a server error name with useful metadata and no raw error text. */
export function logServerError(
  scope: string,
  error: unknown,
  context: LogContext = {},
): void {
  const name = error instanceof Error ? error.name : "UnknownError";

  console.error(
    `[luma:${scope}]`,
    JSON.stringify({ name, ...redact(context) }),
  );
}

/** Logs a non-exception condition by reference, never its raw message. */
export function logServerWarning(scope: string, message: string, context: LogContext = {}): void {
  console.warn(
    `[luma:${scope}]`,
    JSON.stringify({ reference: reference(message), ...redact(context) }),
  );
}
