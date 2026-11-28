import { sql, type SQL } from "drizzle-orm";
import {
  follows,
  posts,
  profilePrivacySettings,
  profiles,
  userRelationships,
  users,
} from "@/lib/db/schema";
import { containsPattern } from "@/lib/discovery/search";
import { TRENDING_WINDOW_DAYS } from "@/lib/discovery/ranking";

/**
 * Reusable predicates for discovery queries. The search text is always bound
 * as a parameter; the fixed ESCAPE clause makes %, _, and \ literal text.
 */

export const TAG_WINDOW_DAYS = 90;

export function buildPeopleSearchCondition(query: string): SQL {
  const pattern = containsPattern(query);
  return sql`(lower(${users.username}) LIKE lower(${pattern}) ESCAPE E'\\\\'
    OR lower(coalesce(${profiles.displayName}, '')) LIKE lower(${pattern}) ESCAPE E'\\\\')`;
}

export function buildPostSearchCondition(query: string): SQL {
  const pattern = containsPattern(query);
  return sql`lower(${posts.caption}) LIKE lower(${pattern}) ESCAPE E'\\\\'`;
}

export function buildTrendingCondition(): SQL {
  return sql`${posts.createdAt} >= now() - (${TRENDING_WINDOW_DAYS} * interval '1 day')`;
}

export function buildRecentTagCondition(): SQL {
  return sql`${posts.createdAt} >= now() - (${TAG_WINDOW_DAYS} * interval '1 day')`;
}

/** Discovery excludes undiscoverable, banned, and block-related accounts. */
export function buildDiscoverableUserCondition(viewerUserId: string | null): SQL {
  return sql`
    ${users.accountStatus} <> 'banned'
    and coalesce((
      select settings.discoverable from ${profilePrivacySettings} settings
      where settings.user_id = ${users.id}
    ), true) = true
    and not exists (
      select 1 from ${userRelationships} rel
      where rel.kind = 'block'
        and (
          (rel.actor_id = ${viewerUserId} and rel.target_id = ${users.id})
          or (rel.actor_id = ${users.id} and rel.target_id = ${viewerUserId})
        )
    )
  `;
}

/** Bio text stays private unless the setting is public or the viewer follows. */
export function buildProfileInfoVisibilityCondition(viewerUserId: string | null): SQL {
  return sql`
    (
      coalesce((
        select settings.profile_info_visibility
        from ${profilePrivacySettings} settings
        where settings.user_id = ${users.id}
      ), 'everyone') = 'everyone'
      or (
        ${viewerUserId} is not null
        and exists (
          select 1 from ${follows} f
          where f.follower_id = ${viewerUserId} and f.following_id = ${users.id}
        )
      )
    )
  `;
}

/** Real suggestions exclude self and any existing follow edge. */
export function buildSuggestedUsersCondition(viewerUserId: string): SQL {
  return sql`${users.id} <> ${viewerUserId}
    and not exists (
      select 1 from ${follows} f
      where f.follower_id = ${viewerUserId} and f.following_id = ${users.id}
    )`;
}
