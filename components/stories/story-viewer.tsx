"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play, Trash2, X } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ReportLink } from "@/components/reporting/report-link";
import { ImageContainer } from "@/components/shared/image-container";
import { SensitiveSurface } from "@/components/shared/sensitive-surface";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  deleteStoryAction,
  recordStoryViewAction,
  storyReactionAction,
} from "@/lib/static/actions";
import {
  STORY_DISPLAY_MS,
  STORY_REACTIONS,
  type StoryReactionEmoji,
} from "@/lib/stories/constants";
import type { StoryGroup, StoryItem } from "@/lib/stories/types";
import { cn } from "@/lib/utils";

interface StoryViewerProps {
  groups: StoryGroup[];
  initialUserId: string;
}

interface ReactionState {
  emoji: StoryReactionEmoji | null;
  counts: Record<string, number>;
}

function initialReactions(groups: StoryGroup[]): Record<string, ReactionState> {
  const result: Record<string, ReactionState> = {};
  for (const group of groups) {
    for (const story of group.stories) {
      result[story.id] = {
        emoji: story.viewerReaction,
        counts: { ...story.reactionCounts },
      };
    }
  }
  return result;
}

function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Immersive, keyboard/tap navigable full-screen story viewer. */
export function StoryViewer({ groups, initialUserId }: StoryViewerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const initialGroup = Math.max(
    0,
    groups.findIndex((group) => group.userId === initialUserId),
  );
  const [groupIndex, setGroupIndex] = useState(initialGroup);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactions, setReactions] = useState(() => initialReactions(groups));
  const viewedRef = useRef<Set<string>>(new Set());
  const dialogRef = useRef<HTMLDivElement>(null);

  const group = groups[groupIndex];
  const story: StoryItem | undefined = group?.stories[storyIndex];
  const storyKey = story?.id ?? null;
  const paused = userPaused || hidden;

  const close = useCallback(() => {
    router.push("/posts");
    router.refresh();
  }, [router]);

  const resetProgress = useCallback(() => {
    progressRef.current = 0;
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    resetProgress();
    const currentGroup = groups[groupIndex];
    if (!currentGroup) return close();
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((index) => index + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((index) => index + 1);
      setStoryIndex(0);
      return;
    }
    close();
  }, [close, groupIndex, groups, resetProgress, storyIndex]);

  const goBack = useCallback(() => {
    resetProgress();
    if (storyIndex > 0) {
      setStoryIndex((index) => index - 1);
      return;
    }
    if (groupIndex > 0) {
      const previous = groups[groupIndex - 1];
      setGroupIndex((index) => index - 1);
      setStoryIndex(previous ? previous.stories.length - 1 : 0);
      return;
    }
  }, [groupIndex, groups, resetProgress, storyIndex]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused || !storyKey) return;
    const timer = window.setInterval(() => {
      const next = Math.min(100, progressRef.current + 100 / (STORY_DISPLAY_MS / 100));
      progressRef.current = next;
      setProgress(next);
      if (next >= 100) goNext();
    }, 100);
    return () => window.clearInterval(timer);
  }, [goNext, paused, storyKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!first || !last || active === dialog || !dialog.contains(active)) {
          event.preventDefault();
          if (event.shiftKey) (last ?? dialog).focus();
          else first?.focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      } else if (event.key === " ") {
        event.preventDefault();
        setUserPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, goBack, goNext]);

  useEffect(() => {
    if (!story || !group || group.isOwn || viewedRef.current.has(story.id)) return;
    viewedRef.current.add(story.id);
    void recordStoryViewAction(story.id);
  }, [group, story]);

  const currentReaction = useMemo(
    () => (story ? reactions[story.id] : undefined),
    [reactions, story],
  );

  async function react(emoji: StoryReactionEmoji) {
    if (!story) return;
    const previous = reactions[story.id] ?? { emoji: null, counts: {} };
    const nextEmoji = previous.emoji === emoji ? null : emoji;
    const nextCounts = { ...previous.counts };

    if (previous.emoji) nextCounts[previous.emoji] = Math.max(0, (nextCounts[previous.emoji] ?? 1) - 1);
    if (nextEmoji) nextCounts[nextEmoji] = (nextCounts[nextEmoji] ?? 0) + 1;

    setReactions((current) => ({
      ...current,
      [story.id]: { emoji: nextEmoji, counts: nextCounts },
    }));

    const result = await storyReactionAction(story.id, nextEmoji);
    if (result.status === "error") {
      setReactions((current) => ({ ...current, [story.id]: previous }));
      toast({
        title: "Reaction not saved",
        description: result.message ?? "Please try again.",
        tone: "error",
      });
    }
  }

  async function removeStory() {
    if (!story || !group?.isOwn || deleting) return;
    if (!window.confirm("Delete this story? This cannot be undone.")) return;

    setDeleting(true);
    const result = await deleteStoryAction(story.id);
    setDeleting(false);

    if (result.status === "success") {
      toast({
        title: "Story deleted",
        description: result.storyCleanupFailed
          ? result.message
          : "The story and its image have been removed.",
        tone: result.storyCleanupFailed ? "warning" : "success",
      });
      close();
      return;
    }

    toast({
      title: "Could not delete story",
      description: result.message ?? "Please try again.",
      tone: "error",
    });
  }

  if (!group || !story) {
    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-6 text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Story unavailable"
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-white/70">This story is no longer available.</p>
          <Button variant="secondary" onClick={close}>
            Back to feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Story from ${group.displayName}`}
    >
      <SensitiveSurface className="relative h-full w-full max-w-[440px] overflow-hidden bg-black sm:h-[min(94vh,900px)] sm:rounded-2xl">
        <ImageContainer
          key={story.id}
          alt={story.caption ? `Story: ${story.caption}` : `${group.displayName}'s story`}
          src={story.mediaUrl}
          ratio="fill"
          fit="contain"
          loading={!story.mediaUrl}
          priority
          unoptimized
          sizes="(max-width: 440px) 100vw, 440px"
          className="rounded-none ring-0"
        />

        <button
          type="button"
          aria-label="Previous story"
          onClick={goBack}
          className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default focus-visible:outline-2 focus-visible:outline-white/70"
        />
        <button
          type="button"
          aria-label="Next story"
          onClick={goNext}
          className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-default focus-visible:outline-2 focus-visible:outline-white/70"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-1.5 bg-gradient-to-b from-black/70 to-transparent p-[max(0.75rem,env(safe-area-inset-top))] pb-8">
          <div className="flex gap-1" role="group" aria-label="Story progress">
            {group.stories.map((item, index) => (
              <span
                key={item.id}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
                role="progressbar"
                aria-label={`Story ${index + 1} of ${group.stories.length}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={index < storyIndex ? 100 : index === storyIndex ? Math.round(progress) : 0}
              >
                <span
                  className="block h-full rounded-full bg-white"
                  style={{
                    width: `${index < storyIndex ? 100 : index === storyIndex ? progress : 0}%`,
                  }}
                />
              </span>
            ))}
          </div>

          <div className="pointer-events-auto flex items-center gap-2 pt-1">
            <ProfileAvatar
              name={group.displayName}
              src={group.avatarUrl}
              size="sm"
              className="size-8 ring-white/40"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{group.displayName}</p>
              <time dateTime={story.createdAt} className="text-[11px] text-white/65">
                @{group.username} · {relativeTime(story.createdAt)}
              </time>
            </div>
            {group.isOwn ? (
              <Link
                href={`/stories/viewers/${story.id}`}
                className="rounded-md px-2 py-1 text-xs text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
              >
                viewers
              </Link>
            ) : null}
            {group.isOwn ? (
              <IconButton
                label={deleting ? "Deleting story" : "Delete story"}
                aria-label="Delete story"
                onClick={removeStory}
                disabled={deleting}
                className="text-white hover:bg-white/15"
              >
                {deleting ? <Spinner /> : <Trash2 />}
              </IconButton>
            ) : null}
            {!group.isOwn ? (
              <ReportLink
                targetType="story"
                targetId={story.id}
                isAuthenticated
                loginHref={`/login?next=${encodeURIComponent(`/stories/${group.userId}`)}`}
              />
            ) : null}
            <IconButton
              label={paused ? "Resume story" : "Pause story"}
              aria-label={paused ? "Resume story" : "Pause story"}
              aria-pressed={paused}
              onClick={() => setUserPaused((value) => !value)}
              className="text-white hover:bg-white/15"
            >
              {paused ? <Play /> : <Pause />}
            </IconButton>
            <IconButton
              label="Close story"
              aria-label="Close story"
              onClick={close}
              className="text-white hover:bg-white/15"
            >
              <X />
            </IconButton>
          </div>
        </div>

        {story.textOverlay ? (
          <p className="pointer-events-none absolute inset-x-6 top-1/2 z-20 -translate-y-1/2 text-center text-xl font-semibold leading-snug drop-shadow-lg sm:text-2xl">
            {story.textOverlay}
          </p>
        ) : null}

        {story.caption ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-28 z-20 px-6 text-center text-sm leading-relaxed text-white drop-shadow-lg">
            {story.caption}
          </p>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 to-transparent p-[max(0.75rem,env(safe-area-inset-bottom))] pt-10">
          <div className="flex items-center justify-center gap-2" role="group" aria-label="Story reactions">
            {STORY_REACTIONS.map((emoji) => {
              const active = currentReaction?.emoji === emoji;
              const count = currentReaction?.counts[emoji] ?? 0;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => void react(emoji)}
                  aria-label={`React ${emoji}`}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 text-lg backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white",
                    active && "border-white/60 bg-white/25",
                  )}
                >
                  <span aria-hidden="true">{emoji}</span>
                  {count > 0 ? <span className="text-xs text-white/85">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden -translate-x-1/2 sm:block">
          <div className="pointer-events-auto flex h-full items-center gap-2 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
            <IconButton
              label="Previous story"
              aria-label="Previous story"
              onClick={goBack}
              className="text-white hover:bg-white/15"
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              label="Next story"
              aria-label="Next story"
              onClick={goNext}
              className="text-white hover:bg-white/15"
            >
              <ChevronRight />
            </IconButton>
          </div>
        </div>
      </SensitiveSurface>
    </div>
  );
}
