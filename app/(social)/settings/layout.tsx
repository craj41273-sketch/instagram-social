import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/dal";

/** Every settings route requires a verified session-derived profile. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireProfile();
  return <>{children}</>;
}
