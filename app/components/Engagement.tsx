"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Comment } from "@/db";
import { relativeTime } from "@/app/lib/format";
import { Avatar } from "./Avatar";
import { RankBadge } from "./RankBadge";

type CommentNode = Comment & { children: CommentNode[] };

export function Engagement({
  videoId,
  initialLikeCount,
  initialLiked,
  initialSaved,
  initialComments,
  signedIn,
  hasProfile,
  signInPath,
}: {
  videoId: string;
  initialLikeCount: number;
  initialLiked: boolean;
  initialSaved: boolean;
  initialComments: Comment[];
  signedIn: boolean;
  hasProfile: boolean;
  signInPath: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [saved, setSaved] = useState(initialSaved);
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reactingId, setReactingId] = useState("");
  const [shareLabel, setShareLabel] = useState("Share");
  const commentInput = useRef<HTMLTextAreaElement>(null);

  const actionPath = !signedIn
    ? signInPath
    : !hasProfile
      ? `/settings/profile?next=${encodeURIComponent(`/watch/${videoId}`)}`
      : null;

  async function toggleLike() {
    if (actionPath) {
      window.location.href = actionPath;
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(`/api/videos/${videoId}/like`, { method: "POST" });
    const payload = (await response.json()) as {
      liked?: boolean;
      count?: number;
      error?: string;
    };
    if (!response.ok || typeof payload.liked !== "boolean") {
      setError(payload.error ?? "Like could not be saved.");
    } else {
      setLiked(payload.liked);
      setLikeCount(payload.count ?? likeCount);
    }
    setBusy(false);
  }

  async function shareVideo() {
    const share = {
      title: document.title,
      text: "Watch this AI video on Pumblo.",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(share);
        setShareLabel("Shared");
      } else {
        await navigator.clipboard.writeText(share.url);
        setShareLabel("Link copied");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setShareLabel("Copy failed");
    }
  }

  async function toggleSaved() {
    if (actionPath) {
      window.location.assign(actionPath);
      return;
    }
    const response = await fetch(`/api/videos/${videoId}/save`, { method: "POST" });
    const payload = (await response.json()) as { saved?: boolean; error?: string };
    if (response.ok && typeof payload.saved === "boolean") setSaved(payload.saved);
    else setError(payload.error ?? "Video could not be saved.");
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionPath) {
      window.location.href = actionPath;
      return;
    }
    if (!content.trim()) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/videos/${videoId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content, parentId: replyTo?.id ?? null }),
    });
    const payload = (await response.json()) as { comment?: Comment; error?: string };
    if (!response.ok || !payload.comment) {
      setError(payload.error ?? "Comment could not be posted.");
    } else {
      setComments((current) => [payload.comment!, ...current]);
      setContent("");
      setReplyTo(null);
    }
    setBusy(false);
  }

  function beginReply(comment: Comment) {
    if (actionPath) {
      window.location.href = actionPath;
      return;
    }
    setReplyTo({ id: comment.id, name: comment.authorDisplayName });
    window.setTimeout(() => commentInput.current?.focus(), 0);
  }

  async function reactToComment(comment: Comment, value: -1 | 1) {
    if (actionPath) {
      window.location.href = actionPath;
      return;
    }
    setReactingId(comment.id);
    setError("");
    const response = await fetch(`/api/comments/${comment.id}/reaction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const payload = (await response.json()) as {
      likeCount?: number;
      dislikeCount?: number;
      viewerReaction?: -1 | 0 | 1;
      error?: string;
    };
    if (
      !response.ok ||
      typeof payload.likeCount !== "number" ||
      typeof payload.dislikeCount !== "number" ||
      typeof payload.viewerReaction !== "number"
    ) {
      setError(payload.error ?? "Reaction could not be saved.");
    } else {
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                likeCount: payload.likeCount!,
                dislikeCount: payload.dislikeCount!,
                viewerReaction: payload.viewerReaction!,
              }
            : item,
        ),
      );
    }
    setReactingId("");
  }

  const threads = buildCommentTree(comments);

  return (
    <section className="engagement">
      <div className="engagement-actions">
        <button
          className={liked ? "like-button liked" : "like-button"}
          type="button"
          disabled={busy}
          aria-pressed={liked}
          onClick={toggleLike}
        >
          {liked ? "Liked" : "Like"} · {likeCount}
        </button>
        <a className="share-button" href="#comments">Comment · {comments.length}</a>
        <button className="share-button" type="button" onClick={shareVideo}>{shareLabel}</button>
        <button
          className="share-button"
          type="button"
          aria-pressed={saved}
          onClick={() => void toggleSaved()}
        >
          {saved ? "Saved" : "Watch later"}
        </button>
      </div>

      <div className="comments" id="comments">
        <div className="comments-heading">
          <h2>Conversation</h2>
          <span>{comments.length} comments</span>
        </div>

        <form className="comment-form" onSubmit={addComment}>
          {replyTo ? (
            <div className="replying-to">
              <span>Replying to <strong>{replyTo.name}</strong></span>
              <button type="button" onClick={() => setReplyTo(null)}>Cancel</button>
            </div>
          ) : null}
          <textarea
            ref={commentInput}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder={signedIn ? "Add something thoughtful…" : "Sign in to join the conversation"}
            aria-label="Write a comment"
          />
          <div>
            <small>{content.length}/500</small>
            <button className="button button-primary" disabled={busy}>
              {actionPath
                ? !signedIn
                  ? "Sign in to comment"
                  : "Create profile to comment"
                : busy
                  ? "Posting…"
                  : replyTo
                    ? "Post reply"
                    : "Post comment"}
            </button>
          </div>
        </form>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="comment-list">
          {threads.length ? (
            threads.map((comment) => (
              <CommentThread
                comment={comment}
                depth={0}
                key={comment.id}
                onReply={beginReply}
                onReact={reactToComment}
                reactingId={reactingId}
              />
            ))
          ) : (
            <p className="no-comments">No comments yet. Start with what stayed with you.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function CommentThread({
  comment,
  depth,
  onReply,
  onReact,
  reactingId,
}: {
  comment: CommentNode;
  depth: number;
  onReply: (comment: Comment) => void;
  onReact: (comment: Comment, value: -1 | 1) => Promise<void>;
  reactingId: string;
}) {
  return (
    <div className={`comment-thread depth-${depth}`}>
      <article className="comment">
        <Link href={`/profile/${comment.authorHandle}`}>
          <Avatar
            name={comment.authorDisplayName}
            color={comment.authorAvatarColor}
            src={comment.authorAvatarUrl || undefined}
            size="md"
          />
        </Link>
        <div>
          <p className="comment-byline">
            <Link href={`/profile/${comment.authorHandle}`}>{comment.authorDisplayName}</Link>
            <RankBadge rank={comment.authorRank} />
            <span>@{comment.authorHandle}</span>
            <span>{relativeTime(comment.createdAt)}</span>
          </p>
          <p className="comment-content">{comment.content}</p>
          <div className="comment-actions">
            <button
              className={comment.viewerReaction === 1 ? "active" : ""}
              type="button"
              aria-pressed={comment.viewerReaction === 1}
              disabled={reactingId === comment.id}
              onClick={() => void onReact(comment, 1)}
            >
              Like {comment.likeCount}
            </button>
            <button
              className={comment.viewerReaction === -1 ? "active" : ""}
              type="button"
              aria-pressed={comment.viewerReaction === -1}
              disabled={reactingId === comment.id}
              onClick={() => void onReact(comment, -1)}
            >
              Dislike {comment.dislikeCount}
            </button>
            {depth < 2 ? (
              <button type="button" onClick={() => onReply(comment)}>Reply</button>
            ) : null}
          </div>
        </div>
      </article>
      {comment.children.length ? (
        <div className="comment-replies" aria-label={`Replies to ${comment.authorDisplayName}`}>
          {comment.children.map((child) => (
            <CommentThread
              comment={child}
              depth={depth + 1}
              key={child.id}
              onReply={onReply}
              onReact={onReact}
              reactingId={reactingId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map(
    comments.map((comment) => [comment.id, { ...comment, children: [] as CommentNode[] }]),
  );
  const roots: CommentNode[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId ? nodes.get(comment.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortChildren = (node: CommentNode) => {
    node.children.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    node.children.forEach(sortChildren);
  };
  roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  roots.forEach(sortChildren);
  return roots;
}
