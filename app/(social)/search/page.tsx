import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { SearchExperience } from "@/components/discovery/search-experience";
import { getCurrentProfile } from "@/lib/auth/dal";
import { logServerError } from "@/lib/logging";

export const metadata: Metadata = {
  title: "Search",
  description: "Find Luma people and posts by username, display name, or caption.",
};

interface SearchRouteProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchRoute({ searchParams }: SearchRouteProps) {
  const params = await searchParams;
  const initialQuery = typeof params.q === "string" ? params.q.trim().slice(0, 50) : "";

  let viewer = null;
  try {
    viewer = await getCurrentProfile();
  } catch (error) {
    logServerError("search.page.viewer", error);
  }

  return (
    <PageContainer className="max-w-5xl space-y-7">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Global search</p>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Find something worth seeing</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Search real Luma accounts by username or display name, and real posts by caption. Results
          are bounded and never include private profile fields.
        </p>
      </header>
      <SearchExperience
        initialQuery={initialQuery}
        isAuthenticated={Boolean(viewer)}
        viewerUsername={viewer?.user.username ?? null}
      />
    </PageContainer>
  );
}
