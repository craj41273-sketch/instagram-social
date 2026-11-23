import { getCurrentProfile } from "@/lib/auth/dal";
import { searchUsersByUsername } from "@/lib/db/users";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { userSearchQuerySchema } from "@/lib/validations/profile";

/**
 * Authenticated, rate-limited username lookup foundation. This is deliberately
 * not an Explore endpoint: bounded input, no sensitive fields, no browsing.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const current = await getCurrentProfile();
    if (!current) {
      return Response.json(
        { error: "Sign in to search for people." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const viewerId = current.user.id;
    const rate = consumeRateLimit(`user-search:${viewerId}`, 20, 60_000);
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many searches. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rate.retryAfterSeconds),
          },
        },
      );
    }

    const params = new URL(request.url).searchParams;
    const parsed = userSearchQuerySchema.safeParse({
      q: params.get("q") ?? "",
      limit: params.get("limit") ?? undefined,
      offset: params.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        { error: "Enter 2–30 letters, numbers, dots, or underscores." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const page = await searchUsersByUsername(
      parsed.data.q,
      parsed.data.limit,
      parsed.data.offset,
      viewerId,
    );

    return Response.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("api.userSearch", error);
    return Response.json(
      { error: "We could not complete that search. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
