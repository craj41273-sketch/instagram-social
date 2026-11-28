"use server";

import { redirect } from "next/navigation";
import type { AuthActionState } from "@/lib/auth/action-state";
import {
  AUTH_CALLBACK_ROUTE,
  AUTHENTICATED_HOME,
  LOGIN_ROUTE,
  RESET_PASSWORD_ROUTE,
  VERIFY_EMAIL_ROUTE,
} from "@/lib/auth/constants";
import { mapAuthError } from "@/lib/auth/error-messages";
import {
  ensureAppUserForAuthenticatedUser,
  logIncompleteRegistration,
} from "@/lib/auth/identity";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { initializeAppUser, isUsernameAvailable } from "@/lib/db/identity";
import {
  ConfigurationError,
  ValidationError,
  isUsernameConflict,
} from "@/lib/errors";
import { getPublicEnv } from "@/lib/env";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordActionSchema,
  signupSchema,
  toFormErrors,
  type ForgotPasswordValues,
  type LoginValues,
  type ResetPasswordValues,
  type SignupValues,
} from "@/lib/validations/auth";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formChecked(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function getAppUrl(): string {
  try {
    return getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  } catch {
    throw new ConfigurationError("The application URL is not configured.");
  }
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  return !consumeRateLimit(key, limit, windowMs).allowed;
}

const RATE_LIMIT_MESSAGE =
  "Too many attempts. Please wait a moment before trying again.";

/** Creates the Supabase identity, then the Neon user/profile pair. */
export async function signupAction(
  _state: AuthActionState<SignupValues>,
  formData: FormData,
): Promise<AuthActionState<SignupValues>> {
  const raw = {
    displayName: formText(formData, "displayName"),
    username: formText(formData, "username"),
    email: formText(formData, "email"),
    password: formText(formData, "password"),
    confirmPassword: formText(formData, "confirmPassword"),
    terms: formChecked(formData, "terms"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      errors: toFormErrors<SignupValues>(parsed.error),
    };
  }

  const { displayName, username, email, password } = parsed.data;

  if (isRateLimited(`signup:${email}:${username}`, 5, 5 * 60_000)) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    if (!(await isUsernameAvailable(username))) {
      return {
        status: "error",
        message: "Please choose another username.",
        errors: { username: "That username is already taken." },
      };
    }
  } catch (error) {
    logServerError("auth.signupAvailability", error);
    return {
      status: "error",
      message: "We could not check username availability. Please try again.",
    };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    logServerError("auth.signupClient", error);
    return {
      status: "error",
      message: "Authentication is not configured. Please contact support.",
    };
  }

  let signUpResult;
  try {
    signUpResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username },
        emailRedirectTo: `${getAppUrl()}${AUTH_CALLBACK_ROUTE}?next=${encodeURIComponent(VERIFY_EMAIL_ROUTE)}`,
      },
    });
  } catch (error) {
    logServerError("auth.signup", error);
    return { status: "error", message: mapAuthError(error, "signup") };
  }

  if (signUpResult.error) {
    logServerError("auth.signup", signUpResult.error);
    return {
      status: "error",
      message: mapAuthError(signUpResult.error, "signup"),
    };
  }

  const authUser = signUpResult.data.user;
  if (!authUser) {
    return { status: "error", message: mapAuthError(null, "signup") };
  }

  // The auth user ID comes from Supabase's response, never from the form.
  try {
    await initializeAppUser({
      authUserId: authUser.id,
      email: authUser.email ?? email,
      username,
      displayName,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    logIncompleteRegistration(authUser.id, reason);
    if (isUsernameConflict(error) || error instanceof ValidationError) {
      return {
        status: "error",
        message: "Please choose another username.",
        errors: { username: "That username is already taken." },
      };
    }
    return {
      status: "needs-retry",
      message:
        "Your account was created, but profile setup did not finish. Sign in to retry automatically.",
    };
  }

  if (!signUpResult.data.session) {
    return {
      status: "verification",
      message: "Check your inbox for a verification link, then log in.",
    };
  }

  redirect(AUTHENTICATED_HOME);
}

/** Verifies credentials through Supabase and recovers the Neon mapping. */
export async function loginAction(
  _state: AuthActionState<LoginValues>,
  formData: FormData,
): Promise<AuthActionState<LoginValues>> {
  const parsed = loginSchema.safeParse({
    email: formText(formData, "email"),
    password: formText(formData, "password"),
    remember: formChecked(formData, "remember"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      errors: toFormErrors<LoginValues>(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  if (isRateLimited(`login:${email}`, 8, 5 * 60_000)) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    logServerError("auth.loginClient", error);
    return {
      status: "error",
      message: "Authentication is not configured. Please contact support.",
    };
  }

  let result;
  try {
    result = await supabase.auth.signInWithPassword({ email, password });
  } catch (error) {
    logServerError("auth.login", error);
    return { status: "error", message: mapAuthError(error, "login") };
  }

  if (result.error) {
    logServerError("auth.login", result.error);
    return { status: "error", message: mapAuthError(result.error, "login") };
  }

  const authUser = result.data.user;
  if (!authUser) {
    return { status: "error", message: mapAuthError(null, "login") };
  }

  // A previous signup may have succeeded at Supabase but failed at Neon.
  // Retrying here is idempotent and always uses the verified session ID.
  try {
    await ensureAppUserForAuthenticatedUser(authUser);
  } catch (error) {
    logIncompleteRegistration(authUser.id, "profile recovery failed");
    logServerError("auth.loginRecovery", error, { authUserId: authUser.id });
    return {
      status: "needs-retry",
      message:
        "You are signed in, but profile setup needs another attempt. It will retry automatically next time.",
    };
  }

  redirect(AUTHENTICATED_HOME);
}

/** Ends the Supabase session and clears its auth cookies. */
export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    logServerError("auth.logout", error);
  }
  redirect(LOGIN_ROUTE);
}

/** Sends a real Supabase recovery link; always returns a neutral message. */
export async function forgotPasswordAction(
  _state: AuthActionState<ForgotPasswordValues>,
  formData: FormData,
): Promise<AuthActionState<ForgotPasswordValues>> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formText(formData, "email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      errors: toFormErrors<ForgotPasswordValues>(parsed.error),
    };
  }

  const { email } = parsed.data;

  if (isRateLimited(`recovery:${email}`, 4, 10 * 60_000)) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}${RESET_PASSWORD_ROUTE}`,
    });

    if (error) {
      logServerError("auth.recovery", error);
      return { status: "error", message: mapAuthError(error, "recovery") };
    }
  } catch (error) {
    logServerError("auth.recovery", error);
    return {
      status: "error",
      message:
        error instanceof ConfigurationError
          ? error.message
          : mapAuthError(error, "recovery"),
    };
  }

  return {
    status: "success",
    message:
      "If an account exists for that address, a recovery link is on its way.",
  };
}

/** Completes a recovery link and updates the password via Supabase Auth. */
export async function resetPasswordAction(
  _state: AuthActionState<ResetPasswordValues>,
  formData: FormData,
): Promise<AuthActionState<ResetPasswordValues>> {
  const token = formText(formData, "token").trim();
  if (!token) {
    return {
      status: "error",
      message: "Open the recovery link from your email to set a new password.",
    };
  }

  const parsed = resetPasswordActionSchema.safeParse({
    password: formText(formData, "password"),
    confirmPassword: formText(formData, "confirmPassword"),
    token,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      errors: toFormErrors<ResetPasswordValues>(parsed.error),
    };
  }

  // The token is the only stable identifier available before it is exchanged.
  if (isRateLimited(`reset:${token.slice(0, 64)}`, 5, 10 * 60_000)) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    logServerError("auth.resetClient", error);
    return {
      status: "error",
      message: "Authentication is not configured. Please contact support.",
    };
  }

  const exchange = await supabase.auth.exchangeCodeForSession(token);
  if (exchange.error) {
    const otp = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "recovery",
    });
    if (otp.error) {
      logServerError("auth.resetToken", otp.error);
      return { status: "error", message: mapAuthError(otp.error, "reset") };
    }
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      status: "error",
      message: "Open the recovery link from your email to set a new password.",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    logServerError("auth.resetUpdate", updateError);
    return { status: "error", message: mapAuthError(updateError, "reset") };
  }

  redirect(`${LOGIN_ROUTE}?reset=success`);
}

/** Resends a signup verification email for the current user or given address. */
export async function resendVerificationAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const providedEmail = formText(formData, "email");
  const parsedEmail = providedEmail ? emailSchema.safeParse(providedEmail) : null;

  if (parsedEmail && !parsedEmail.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    logServerError("auth.verifyClient", error);
    return {
      status: "error",
      message: "Authentication is not configured. Please contact support.",
    };
  }

  let targetEmail = parsedEmail?.data;
  if (!targetEmail) {
    const { data } = await supabase.auth.getUser();
    targetEmail = data.user?.email;
  }

  if (!targetEmail) {
    return {
      status: "error",
      message: "Sign in first, or enter the email you used to sign up.",
    };
  }

  if (isRateLimited(`verify:${targetEmail}`, 4, 10 * 60_000)) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: {
        emailRedirectTo: `${getAppUrl()}${AUTH_CALLBACK_ROUTE}?next=${encodeURIComponent(VERIFY_EMAIL_ROUTE)}`,
      },
    });

    if (error) {
      logServerError("auth.resendVerification", error);
      return { status: "error", message: mapAuthError(error, "verification") };
    }
  } catch (error) {
    logServerError("auth.resendVerification", error);
    return {
      status: "error",
      message: mapAuthError(error, "verification"),
    };
  }

  return {
    status: "success",
    message:
      "If that address still needs verification, a fresh link is on its way.",
  };
}

/** Explicit retry path for incomplete registrations; identity is session-derived. */
export async function retryProfileSetupAction(): Promise<AuthActionState> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    logServerError("auth.retryClient", error);
    return {
      status: "error",
      message: "Authentication is not configured. Please contact support.",
    };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { status: "error", message: "Sign in first to retry profile setup." };
  }

  try {
    await ensureAppUserForAuthenticatedUser(data.user);
  } catch (error) {
    logServerError("auth.retryProfile", error, { authUserId: data.user.id });
    return {
      status: "error",
      message: "Profile setup is still unavailable. Please try again later.",
    };
  }

  return { status: "success", message: "Your profile is ready." };
}

/** Form-compatible wrapper for the explicit profile setup retry. */
export async function retryProfileSetupFormAction(): Promise<AuthActionState> {
  return retryProfileSetupAction();
}
