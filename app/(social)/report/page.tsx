import Link from "next/link";
import { ReportForm } from "@/components/reporting/report-form";
import { PageContainer } from "@/components/layout/page-container";
import { SensitiveSurface } from "@/components/shared/sensitive-surface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/dal";
import { createReportSchema } from "@/lib/validations/reporting";

/** Authenticated report intake with an explicit privacy disclosure. */
export default async function ReportPage() {
  await requireProfile();
  const parsed = createReportSchema
    .pick({ targetType: true, targetId: true })
    .safeParse({});

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">Report content</h1>
        <p className="text-sm text-muted-foreground">
          Tell us what you saw. Reports are reviewed by authorised staff under our
          safety policy.
        </p>
      </header>

      <SensitiveSurface className="space-y-5">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">Before you report</CardTitle>
            <CardDescription>
              We handle reports carefully and show you only a content-free status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Your identity is hidden from the person or account you report.</li>
              <li>
                Chat reports capture a bounded snapshot of up to seven messages on
                each side of the reported message at the time you report.
              </li>
              <li>Access to that evidence by authorised staff is audited.</li>
              <li>
                This page discourages copying, but it cannot stop screenshots or
                screen recordings made with your device.
              </li>
            </ul>
          </CardContent>
        </Card>

        {parsed.success ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Describe the problem</CardTitle>
              <CardDescription>
                Your explanation stays with the report and is not sent to the target.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportForm
                targetType={parsed.data.targetType}
                targetId={parsed.data.targetId}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-6">
              <p role="alert" className="text-sm text-destructive">
                That report link is incomplete or invalid. Open the report control on
                the content you want to report and try again.
              </p>
              <Link
                href="/posts"
                className="inline-flex rounded-md text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Back to posts
              </Link>
            </CardContent>
          </Card>
        )}
      </SensitiveSurface>
    </PageContainer>
  );
}
