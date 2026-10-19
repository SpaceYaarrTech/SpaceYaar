"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type ProfileMenuRowProps = {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
  trailing?: ReactNode;
};

export function ProfileMenuRow({ icon: Icon, label, href, badge, trailing }: ProfileMenuRowProps) {
  return (
    <Link href={href} className="renter-profile-menu-row">
      <Icon size={16} strokeWidth={1.8} aria-hidden />
      <span className="renter-profile-menu-label">{label}</span>
      {trailing
        ?? (badge && badge > 0 ? (
          <span className="renter-profile-badge" aria-label={`${badge} pending`}>{badge}</span>
        ) : (
          <ChevronRight size={15} className="renter-profile-chevron" aria-hidden />
        ))}
    </Link>
  );
}
