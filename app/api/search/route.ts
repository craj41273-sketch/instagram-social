import { getCurrentProfile } from "@/lib/auth/dal";
import { searchPeople, searchPosts } from "@/lib/db/discovery";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import type { SearchPage, SearchPerson, SearchPost } from "@/lib/discovery/types";
import { searchRequestSchema } from "@/lib/validations/discovery";

/** Authenticated, bounded global search. All identity comes from the DAL. */

const NO_STORE = { "Cache-Control": "no-store" } as const;

function emptyPage<T>(): SearchPage<T> {
  return { items: [], hasMore: false, nextOffset: null };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const current = await getCurrentProfile();
    if (!current) {
      return Response.json(
        { error: "Sign in to search Luma." },
        { status: 401, headers: NO_STORE },
      );
    }

    const rate = consumeRateLimit(`global-search:${current.user.id}`, 30, 60_000);
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many searches. Please wait a moment." },
        {
          status: 429,
          headers: { ...NO_STORE, "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }

    const url = new URL(request.url);
    const parsed = searchRequestSchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      tab: url.searchParams.get("tab") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Enter a valid search." },
        { status: 400, headers: NO_STORE },
      );
    }

    const { q, tab, limit, offset } = parsed.data;
    const [people, posts] = await Promise.all([
      tab === "posts"
        ? Promise.resolve(emptyPage<SearchPerson>())
        : searchPeople({ query: q, limit, offset }, current.user.id),
      tab === "people"
        ? Promise.resolve(emptyPage<SearchPost>())
        : searchPosts({ query: q, limit, offset }, current.user.id),
    ]);

    return Response.json(
      { query: q, tab, people, posts },
      { headers: NO_STORE },
    );
  } catch (error) {
    logServerError("api.search", error);
    return Response.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
