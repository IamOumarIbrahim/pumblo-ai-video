"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Avatar } from "./Avatar";
import { relativeTime } from "@/app/lib/format";
import type { Notification } from "@/db";

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  useEffect(() => {
    if (notifications.some((item) => !item.read)) {
      void fetch("/api/notifications/read", { method: "POST" });
    }
  }, [notifications]);

  if (!notifications.length) {
    return <div className="empty-state"><h3>Your inbox is quiet</h3><p>Likes, comments, followers, and new episodes will appear here.</p></div>;
  }
  return (
    <div className="notification-list">
      {notifications.map((item) => (
        <article className={item.read ? "" : "unread"} key={item.id}>
          <Link href={`/profile/${item.actorHandle}`}>
            <Avatar name={item.actorDisplayName} color={item.actorAvatarColor} src={item.actorAvatarUrl || undefined} size="md" />
          </Link>
          <div>
            <p><strong>{item.actorDisplayName}</strong> {message(item.type)}</p>
            <small>{relativeTime(item.createdAt)}</small>
          </div>
          {item.videoId ? <Link className="button button-ghost" href={`/watch/${item.videoId}`}>Open</Link> : item.seriesId ? <Link className="button button-ghost" href={`/series/${item.seriesId}`}>Open</Link> : null}
        </article>
      ))}
    </div>
  );
}

function message(type: Notification["type"]): string {
  if (type === "like") return "liked your video.";
  if (type === "comment") return "commented on your video.";
  if (type === "reply") return "replied to your comment.";
  if (type === "follow") return "followed your channel.";
  return "published a new series episode.";
}
