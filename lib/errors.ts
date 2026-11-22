/**
 * Small, typed error vocabulary shared by server actions and services.
 * Messages on these errors are safe to show to users; unexpected errors are
 * always converted to a generic message before crossing the server boundary.
 */
export type AppErrorCode =
  | "validation"
  | "authentication"
  | "authorization"
  | "database"
  | "network"
  | "configuration";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("validation", message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super("authentication", message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to do that.") {
    super("authorization", message);
    this.name = "AuthorizationError";
  }
}

export class DatabaseError extends AppError {
  constructor(message = "A database error occurred. Please try again.") {
    super("database", message);
    this.name = "DatabaseError";
  }
}

export class NetworkError extends AppError {
  constructor(message = "The service is temporarily unavailable. Please try again.") {
    super("network", message);
    this.name = "NetworkError";
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "This feature is not configured yet. Please contact support.") {
    super("configuration", message);
    this.name = "ConfigurationError";
  }
}

/** Postgres unique-violation code, including username races. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

/** Best-effort detection of a username constraint, used only for safe mapping. */
export function isUsernameConflict(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : "";
  return /username/i.test(message);
}

const GENERIC_MESSAGES: Record<AppErrorCode, string> = {
  validation: "Please check the information you entered.",
  authentication: "We could not complete that sign-in. Please try again.",
  authorization: "You do not have permission to do that.",
  database: "A database error occurred. Please try again.",
  network: "The service is temporarily unavailable. Please try again.",
  configuration: "This feature is not configured yet. Please contact support.",
};

/** Converts any thrown value into a user-safe message. */
export function toSafeMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return GENERIC_MESSAGES.database;
}
