/** Serializable state returned by authentication server actions. */
export type AuthActionStatus =
  | "idle"
  | "error"
  | "success"
  | "verification"
  | "needs-retry";

export interface AuthActionState<TFields = Record<string, unknown>> {
  status: AuthActionStatus;
  message?: string;
  errors?: Partial<Record<keyof TFields, string>>;
}

export function initialAuthState<TFields>(): AuthActionState<TFields> {
  return { status: "idle" };
}
