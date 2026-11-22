import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

/** Distraction-free shell shared by every authentication route. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
