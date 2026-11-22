/**
 * Server-only diagnostic logging. External errors frequently contain URLs,
 * tokens, or SQL details, so context values are redacted before logging.
 */
import "server-only";

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

/** Logs a server error with useful metadata and no credentials or stack traces. */
export function logServerError(
  scope: string,
  error: unknown,
  context: LogContext = {},
): void {
  const description =
    error instanceof Error
      ? { name: error.name, message: error.message.slice(0, 300) }
      : { message: String(error).slice(0, 300) };

  console.error(
    `[luma:${scope}]`,
    JSON.stringify({ ...description, ...redact(context) }),
  );
}

/** Logs a non-exception condition that should be visible in development. */
export function logServerWarning(scope: string, message: string, context: LogContext = {}): void {
  console.warn(
    `[luma:${scope}]`,
    JSON.stringify({ message: message.slice(0, 300), ...redact(context) }),
  );
}
