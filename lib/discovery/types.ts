/** Public projection types shared by discovery services and client views. */

export interface SearchPage<T> {
  items: T[];
  hasMore: boolean;
  nextOffset: number | null;
}

export interface SearchPerson {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isFollowing: boolean;
}

export interface SearchPost {
  postId: string;
  caption: string;
  createdAt: string;
  thumbnailUrl: string | null;
  mediaCount: number;
  likeCount: number;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
}

export interface SearchResults {
  people: SearchPage<SearchPerson>;
  posts: SearchPage<SearchPost>;
}

export interface ExploreTag {
  tag: string;
  count: number;
}

export interface TrendingPost extends SearchPost {
  commentCount: number;
  ageHours: number;
  score: number;
}
