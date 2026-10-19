"use client";

import { CalendarDays, Heart, House, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const RENTER_TABS = [
  { label: "Home", href: "/renter", icon: House },
  { label: "Search", href: "/search", icon: Search },
  { label: "Saved", href: "/saved", icon: Heart },
  { label: "Bookings", href: "/history", icon: CalendarDays },
  { label: "Profile", href: "/profile", icon: UserRound },
] as const;

export function RenterBottomNavigation() {
  const pathname = usePathname();
  const activeTab = pathname.startsWith("/listings/")
    ? "Search"
    : RENTER_TABS.find(({ href }) => pathname === href || (href !== "/renter" && pathname.startsWith(`${href}/`)))?.label;

  return (
    <nav className="renter-bottom-nav" aria-label="Renter navigation">
      {RENTER_TABS.map(({ label, href, icon: Icon }) => {
        const active = activeTab === label;
        return (
          <Link
            key={href}
            href={href}
            className={`renter-bottom-nav-item${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={19} strokeWidth={active ? 2.4 : 1.8} fill={active && label === "Saved" ? "currentColor" : "none"} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
