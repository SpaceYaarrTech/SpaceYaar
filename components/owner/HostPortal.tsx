"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, LayoutDashboard, UserRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { HostNotifications } from "@/components/owner/HostNotifications";

const HOST_TABS = [
  { id: "dashboard", label: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
  { id: "spaces", label: "Spaces", href: "/owner/spaces", icon: Building2 },
  { id: "renters", label: "Renters", href: "/owner/renters", icon: UsersRound },
  { id: "analytics", label: "Analytics", href: "/owner/analytics", icon: BarChart3 },
  { id: "profile", label: "Profile", href: "/owner/profile", icon: UserRound },
] as const;

export function HostPortal({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showTabBar = pathname === "/owner/profile" || !pathname.startsWith("/owner/profile/");

  return (
    <div className="host-layout">
      <HostNotifications />
      <main className={`host-main${showTabBar ? "" : " host-main-no-tabs"}`}>{children}</main>
      {showTabBar && <nav className="host-tab-bar" aria-label="Host navigation">
        {HOST_TABS.map(({ id, label, href, icon: Icon }) => {
          const active = pathname === href
            || pathname.startsWith(`${href}/`)
            || id === "spaces" && pathname === "/owner/my-spaces"
            || id === "renters" && pathname.startsWith("/owner/renters/")
            || id === "spaces" && pathname.startsWith("/owner/listings/");
          return (
            <Link
              key={id}
              href={href}
              className={`host-tab${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (active && pathname === href) event.preventDefault();
              }}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>}
    </div>
  );
}
