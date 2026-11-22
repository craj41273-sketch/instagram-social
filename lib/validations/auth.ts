import { z } from "zod";

/** Client-safe validation shared by every authentication form. */
export const USERNAME_PATTERN = /^[a-z0-9._]+$/;

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Display name must be at least 2 characters.")
  .max(50, "Display name must be 50 characters or fewer.");

/** Normalizes first so uppercase input is accepted but always stored lowercase. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username must be 20 characters or fewer.")
  .regex(
    USERNAME_PATTERN,
    "Use lowercase letters, numbers, dots, or underscores only.",
  )
  .refine(
    (value) => !value.startsWith(".") && !value.endsWith("."),
    "Username cannot start or end with a dot.",
  )
  .refine((value) => !value.includes(".."), "Username cannot contain consecutive dots.");

export const emailSchema = z.email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-zA-Z]/, "Password must include at least one letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

export const signupSchema = z
  .object({
    displayName: displayNameSchema,
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    terms: z.boolean().refine((value) => value, "Please accept the terms to continue."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const usernameLookupSchema = z.object({
  username: usernameSchema,
});

/** Token may arrive from a Supabase recovery link (PKCE code or OTP hash). */
export const resetPasswordActionSchema = resetPasswordSchema.extend({
  token: z.string().max(512).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().max(512).optional(),
  email: emailSchema.optional(),
});

export type SignupValues = z.infer<typeof signupSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordActionValues = z.infer<typeof resetPasswordActionSchema>;

export type FormErrors<T> = Partial<Record<keyof T, string>>;

/** Converts the first Zod issue per field into a form-friendly error map. */
export function toFormErrors<T extends Record<string, unknown>>(
  error: z.ZodError,
): FormErrors<T> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors as FormErrors<T>;
}

export type StrengthTone = "danger" | "warning" | "brand" | "success";

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: StrengthTone;
  checklist: { label: string; met: boolean }[];
}

/** Lightweight, local-only password feedback. No data leaves the browser. */
export function getPasswordStrength(value: string): PasswordStrengthResult {
  const checklist = [
    { label: "8+ characters", met: value.length >= 8 },
    { label: "12+ characters", met: value.length >= 12 },
    { label: "Upper & lowercase", met: /[a-z]/.test(value) && /[A-Z]/.test(value) },
    { label: "A number", met: /[0-9]/.test(value) },
    { label: "A symbol", met: /[^a-zA-Z0-9]/.test(value) },
  ];

  const metCount = checklist.filter((item) => item.met).length;
  const rawScore = value.length === 0 ? 0 : Math.min(4, Math.ceil((metCount / 5) * 4));
  const score = (value.length > 0 && value.length < 8 ? Math.min(1, rawScore) : rawScore) as
    | 0
    | 1
    | 2
    | 3
    | 4;

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
  const tones: StrengthTone[] = ["danger", "danger", "warning", "brand", "success"];

  return {
    score,
    label: value.length === 0 ? "Enter a password" : (labels[score] ?? "Weak"),
    tone: tones[score] ?? "danger",
    checklist,
  };
}
