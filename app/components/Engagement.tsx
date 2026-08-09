"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Comment } from "@/db";
import { relativeTime } from "@/app/lib/format";
import { Avatar } from "./Avatar";

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
    const response = await fetch(`/api/videos/${videoId}/like`, {
      method: "POST",
    });
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
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }
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
    const payload = (await response.json()) as {
      comment?: Comment;
      error?: string;
    };
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
    setReplyTo({
      id: comment.id,
      name: comment.authorDisplayName,
    });
    window.setTimeout(() => commentInput.current?.focus(), 0);
  }

  const rootComments = comments.filter((comment) => !comment.parentId);

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
          <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
          {liked ? "Liked" : "Like"} · {likeCount}
        </button>
        <a className="share-button" href="#comments">
          Comment · {comments.length}
        </a>
        <button className="share-button" type="button" onClick={shareVideo}>
          {shareLabel}
        </button>
        <button className="share-button" type="button" aria-pressed={saved} onClick={() => void toggleSaved()}>
          {saved ? "Saved ✓" : "Watch later"}
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
            placeholder={
              signedIn
                ? "Add something thoughtful…"
                : "Sign in to join the conversation"
            }
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
          {rootComments.length ? (
            rootComments.map((comment) => {
              const replies = comments
                .filter((item) => item.parentId === comment.id)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
              return (
                <div className="comment-thread" key={comment.id}>
                  <CommentItem comment={comment} onReply={beginReply} />
                  {replies.length ? (
                    <div className="comment-replies" aria-label={`Replies to ${comment.authorDisplayName}`}>
                      {replies.map((reply) => (
                        <CommentItem
                          comment={reply}
                          key={reply.id}
                          onReply={beginReply}
                          reply
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="no-comments">
              No comments yet. Start with what stayed with you.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  onReply,
  reply = false,
}: {
  comment: Comment;
  onReply: (comment: Comment) => void;
  reply?: boolean;
}) {
  return (
    <article className={reply ? "comment is-reply" : "comment"}>
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
          <Link href={`/profile/${comment.authorHandle}`}>
            {comment.authorDisplayName}
          </Link>
          <span>@{comment.authorHandle}</span>
          <span>{relativeTime(comment.createdAt)}</span>
        </p>
        <p className="comment-content">{comment.content}</p>
        <button className="comment-reply-button" type="button" onClick={() => onReply(comment)}>
          Reply
        </button>
      </div>
    </article>
  );
}
