import Link from "next/link";
import { Flag } from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { REPORT_TARGET_TYPES } from "@/lib/validations/reporting";

type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

interface ReportLinkProps {
  targetType: ReportTargetType;
  targetId: string;
  isAuthenticated: boolean;
  loginHref: string;
  label?: string;
}

/** Small entry point to the report flow; unauthenticated visitors sign in first. */
export function ReportLink({
  targetType,
  targetId,
  isAuthenticated,
  loginHref,
  label = "Report",
}: ReportLinkProps) {
  const href = isAuthenticated
    ? `/report?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`
    : loginHref;

  return (
    <PremiumButton
      premiumVariant="ghost"
      size="sm"
      asChild
      aria-label={isAuthenticated ? label : "Sign in to report"}
    >
      <Link href={href}>
        <Flag className="size-3.5" aria-hidden="true" />
        {label}
      </Link>
    </PremiumButton>
  );
}
