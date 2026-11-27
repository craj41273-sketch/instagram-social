"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deletePostAction, updatePostAction } from "@/app/actions/posts";
import { PremiumButton } from "@/components/ui/premium-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  initialPostActionState,
  type PostActionState,
} from "@/lib/profile/action-state";

interface PostActionsProps {
  postId: string;
  caption: string;
  isOwner: boolean;
  redirectAfterDelete?: string;
}

function ActionButton({
  label,
  pendingLabel,
  premiumVariant,
}: {
  label: string;
  pendingLabel: string;
  premiumVariant: "gradient" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <PremiumButton
      type="submit"
      premiumVariant={premiumVariant}
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <>
          <Spinner className="size-4 text-current" label={pendingLabel} />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </PremiumButton>
  );
}

/** Post controls: edit/delete for owners, report for anyone who can see the post. */
export function PostActions({
  postId,
  caption,
  isOwner,
  redirectAfterDelete,
}: PostActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editState, editAction] = useActionState(
    updatePostAction,
    initialPostActionState(),
  );
  const [deleteState, deleteAction] = useActionState(
    deletePostAction,
    initialPostActionState(),
  );
  const handledEdit = useRef<PostActionState | null>(null);
  const handledDelete = useRef<PostActionState | null>(null);

  useEffect(() => {
    if (editState.status !== "success" || handledEdit.current === editState) return;
    handledEdit.current = editState;
    setEditOpen(false);
    toast({ title: "Post updated", tone: "success" });
    router.refresh();
  }, [editState, router, toast]);

  useEffect(() => {
    if (deleteState.status !== "success" || handledDelete.current === deleteState) return;
    handledDelete.current = deleteState;
    setDeleteOpen(false);
    toast({ title: "Post deleted", tone: "success" });
    if (redirectAfterDelete) router.push(redirectAfterDelete);
    else router.refresh();
  }, [deleteState, router, toast, redirectAfterDelete]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PremiumButton
            premiumVariant="ghost"
            size="icon-sm"
            aria-label="Post options"
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </PremiumButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOwner ? (
            <>
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" />
                Edit caption
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 aria-hidden="true" />
                Delete post
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={`/report?targetType=post&targetId=${encodeURIComponent(postId)}`}>
              <Flag aria-hidden="true" />
              Report post
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit caption</DialogTitle>
            <DialogDescription>
              Hashtags are refreshed from the caption. Images stay unchanged.
            </DialogDescription>
          </DialogHeader>
          <form action={editAction} className="space-y-4">
            <input type="hidden" name="postId" value={postId} />
            <Textarea
              name="caption"
              defaultValue={caption}
              maxLength={2200}
              rows={6}
              aria-label="Post caption"
              required
            />
            {editState.status === "error" && editState.message ? (
              <p role="alert" className="text-sm text-destructive">
                {editState.message}
              </p>
            ) : null}
            <DialogFooter>
              <PremiumButton
                type="button"
                premiumVariant="ghost"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </PremiumButton>
              <ActionButton
                label="Save changes"
                pendingLabel="Saving"
                premiumVariant="gradient"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              Its images and caption will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteState.status === "error" && deleteState.message ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteState.message}
            </p>
          ) : null}
          <DialogFooter>
            <PremiumButton
              premiumVariant="ghost"
              onClick={() => setDeleteOpen(false)}
            >
              Keep post
            </PremiumButton>
            <form action={deleteAction}>
              <input type="hidden" name="postId" value={postId} />
              <ActionButton
                label="Delete post"
                pendingLabel="Deleting"
                premiumVariant="danger"
              />
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
