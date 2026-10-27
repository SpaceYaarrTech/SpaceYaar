"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const POLL_MS = 25000;

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Owner-facing notification bell. Polls for review updates (approval,
 * rejection, review started) so owners learn about listing decisions
 * without reloading, and routes to the relevant screen when tapped.
 */
export function HostNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", signal });
      if (!response.ok) {
        if (response.status === 401) return;
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "Could not load notifications.");
      }
      const result = await response.json() as { notifications?: Notification[] };
      setItems(result.notifications ?? []);
      setError("");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : "Could not load notifications.");
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const unread = items.filter((item) => !item.read_at);

  const markRead = async (notification: Notification) => {
    setOpen(false);
    if (!notification.read_at) {
      setItems((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
      )));
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification.id }),
        });
      } catch {
        // Best effort: the item is already hidden as read locally.
      }
    }
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (item.read_at ? item : { ...item, read_at: now })));
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // Best effort: local state already shows everything read.
    }
  };

  return (
    <div className="host-notifications" ref={containerRef}>
      <button
        type="button"
        className="host-notifications-trigger"
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={19} aria-hidden="true" />
        {unread.length > 0 && <span className="host-notifications-badge">{unread.length > 9 ? "9+" : unread.length}</span>}
      </button>

      {open && (
        <div className="host-notifications-panel" role="dialog" aria-label="Notifications">
          <div className="host-notifications-head">
            <strong>Notifications</strong>
            {unread.length > 0 && (
              <button type="button" onClick={() => void markAllRead()}>Mark all read</button>
            )}
          </div>
          {error ? (
            <p className="host-notifications-empty" role="alert">{error}</p>
          ) : items.length === 0 ? (
            <p className="host-notifications-empty">No notifications yet. Listing review updates appear here.</p>
          ) : (
            <ul className="host-notifications-list">
              {items.map((notification) => {
                const inner = (
                  <>
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                    <time>{timeAgo(notification.created_at)}</time>
                  </>
                );
                return (
                  <li key={notification.id} className={notification.read_at ? "" : "is-unread"}>
                    {notification.link ? (
                      <Link href={notification.link} onClick={() => void markRead(notification)}>{inner}</Link>
                    ) : (
                      <button type="button" onClick={() => void markRead(notification)}>{inner}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
