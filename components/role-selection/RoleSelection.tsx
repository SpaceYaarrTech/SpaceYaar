"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, BadgePercent, HandCoins, IndianRupee, Info, MapPin, Zap } from "lucide-react";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { isGuestMode } from "@/lib/auth/guest-session";
import { setSelectedRole } from "@/lib/roles/role-storage";
import type { UserRole } from "@/types/roles";
import { RoleCard } from "./RoleCard";

const BRAND_RED = "#FC1D0E";
const OWNER_BLUE = "#575ED8";

const CARD_DESCRIPTION = "Warehouse ya Storage space dhundna hai? Hum hai naa yaar.";

const RENTER_CHIPS = [
  { icon: <MapPin size={10} strokeWidth={2} />, label: "Nearby spaces" },
  { icon: <Zap size={10} strokeWidth={2} />, label: "Instant booking" },
  { icon: <BadgePercent size={10} strokeWidth={2} />, label: "Best Rates" },
];

const OWNER_CHIPS = [
  { icon: <IndianRupee size={10} strokeWidth={2} />, label: "15K–80K+ Monthly" },
  { icon: <BadgeCheck size={10} strokeWidth={2} />, label: "Verified renters" },
  { icon: <HandCoins size={10} strokeWidth={2} />, label: "Live earnings" },
];

export function RoleSelection() {
  const router = useRouter();
  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [roleError, setRoleError] = useState("");

  const selectRole = async (role: UserRole) => {
    if (isNavigating) return;
    setSelectedRoleState(role);
    setIsNavigating(true);
    setRoleError("");

    try {
      if (!isAuthBypassEnabled() && !isGuestMode()) {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not save your role.");
      }

      setSelectedRole(role);
      router.replace(role === "owner" ? "/owner" : "/location");
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : "Could not save your role.");
      setIsNavigating(false);
    }
  };

  const exploreAround = () => {
    router.push("/search");
  };

  return (
    <main className="role-selection-page" aria-label="Choose your SpaceYaar experience">
      <div className="status-bar" aria-hidden="true">
        <span className="status-time">9:30</span>
        <div className="status-icons">
          <span className="status-icon status-icon-wifi" />
          <span className="status-icon status-icon-signal" />
          <span className="status-icon status-icon-battery" />
        </div>
      </div>

      <header className="brand-header">
        <span className="brand-logo" aria-hidden="true">
          <span className="brand-logo-line">Space</span>
          <span className="brand-logo-clip">
            <span className="brand-logo-line">Yaar</span>
          </span>
        </span>
        <span className="brand-name">Spaceyaar</span>
      </header>

      <hr className="brand-divider" />

      <section className="role-intro" aria-labelledby="role-selection-title">
        <h1 id="role-selection-title">Aap yahan kya karna chatein hain?</h1>
        <p>Apna role choose karo baad mei change bhi kar sakte ho, no tension.</p>
      </section>

      <div className="role-options" role="group" aria-label="Choose your role">
        <RoleCard
          role="renter"
          roleLabel="Renter/ Seeker"
          heading="Mujhe jagah chaiye"
          description={CARD_DESCRIPTION}
          illustrationSrc="/images/role-renter.png"
          illustrationAlt="Renter carrying a cardboard box at a warehouse entrance"
          accentColor={BRAND_RED}
          chips={RENTER_CHIPS}
          selected={selectedRole === "renter"}
          onSelect={() => void selectRole("renter")}
        />

        <RoleCard
          role="owner"
          roleLabel="Owner/Host"
          heading="Mere Paas Jagah hai"
          description={CARD_DESCRIPTION}
          illustrationSrc="/images/role-owner.png"
          illustrationAlt="Warehouse owner with folded arms standing among storage racks"
          accentColor={OWNER_BLUE}
          chips={OWNER_CHIPS}
          selected={selectedRole === "owner"}
          onSelect={() => void selectRole("owner")}
        />
      </div>

      {roleError && (
        <p className="role-selection-error" role="alert">
          {roleError}
        </p>
      )}

      <button type="button" className="role-explore-button" onClick={exploreAround}>
        Space Dhundho
      </button>

      <p className="role-note">
        <Info size={13} strokeWidth={2} aria-hidden="true" />
        <span>Dono roles baad mein bhi use kar sakte ho</span>
      </p>

      <p className="role-legal">
        Continue karke aap hamare{" "}
        <span className="role-legal-link">Terms &amp; Privacy se agree karte ho</span>{" "}
        promise, boring nahi hain.
      </p>
    </main>
  );
}
