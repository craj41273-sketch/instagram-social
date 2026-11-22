import {
  ArrowUpRight,
  Database,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { FOUNDATION_LAYERS } from "@/lib/constants";

const layerIcons = [Layers3, Database, ShieldCheck, Sparkles] as const;

export default function Home() {
  return (
    <PageContainer className="py-16 sm:py-24">
      <section className="max-w-2xl">
        <Badge variant="outline" className="mb-5">
          Block 1 &middot; Foundation
        </Badge>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          A premium foundation for what comes next.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          The application shell, tooling, and architecture boundaries are in
          place. Social features are intentionally deferred to later blocks.
        </p>
      </section>

      <section
        aria-label="Architecture layers"
        className="mt-14 grid gap-4 sm:grid-cols-2"
      >
        {FOUNDATION_LAYERS.map((layer, index) => {
          const Icon = layerIcons[index] ?? Layers3;

          return (
            <Card key={layer.title} className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <CardTitle>{layer.title}</CardTitle>
                <CardDescription>{layer.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <Card className="mt-6 bg-muted/40">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Next milestone</p>
            <p className="text-sm text-muted-foreground">
              Authentication, database schema, and the first protected routes.
            </p>
          </div>
          <ArrowUpRight className="size-5 text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
