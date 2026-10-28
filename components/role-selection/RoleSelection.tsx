"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ROLE_OPTIONS } from "@/lib/roles/role-config";
import { setSelectedRole } from "@/lib/roles/role-storage";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { isGuestMode } from "@/lib/auth/guest-session";
import type { UserRole } from "@/types/roles";

export function RoleSelection() {
  const router = useRouter();
  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [roleError, setRoleError] = useState("");

  const continueToRoleHome = async () => {
    if (!selectedRole || isNavigating) return;
    setIsNavigating(true);
    setRoleError("");
    try {
      if (!isAuthBypassEnabled() && !isGuestMode()) {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: selectedRole }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not save your role.");
      }

      setSelectedRole(selectedRole);
      router.replace(selectedRole === "owner" ? "/owner" : "/location");
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : "Could not save your role.");
      setIsNavigating(false);
    }
  };

  return (
    <main className="role-selection-page" aria-label="Choose your SpaceYaar experience">
      <header className="role-selection-header">
        <span className="header-note">SpaceYaar</span>
        <span className="header-note">Your experience</span>
      </header>

      <section className="role-selection-content" aria-labelledby="role-selection-title">
        <div className="role-selection-intro">
          <span className="eyebrow">Role selection</span>
          <h1 id="role-selection-title">Aap yahan kya karna chatein hain?</h1>
          <p>Apna role choose karo baad mei change bhi kar sakte ho, no tension.</p>
        </div>

        <div className="role-options" role="group" aria-label="Choose your SpaceYaar experience">
          {ROLE_OPTIONS.map(([role, config], index) => {
            const isSelected = selectedRole === role;
            const isRenter = role === "renter";

            return (
              <motion.button
                key={role}
                type="button"
                className={`role-card ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedRoleState(role)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 + 0.1, duration: 0.35 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="role-card-top">
                  <div className="role-icon" aria-hidden="true">
                    {isRenter ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12.5 12 5l9 7.5" />
                        <path d="M5 10.5V19h14v-8.5" />
                        <path d="M9.5 19v-5.5h5V19" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20V9.5L12 4l8 5.5V20" />
                        <path d="M8 20v-6h8v6" />
                        <path d="M10 9.5h4" />
                      </svg>
                    )}
                  </div>
                  <span className={`role-check ${isSelected ? "visible" : ""}`} aria-hidden="true">✓</span>
                </div>

                <div className="role-card-copy">
                  <span className="role-card-label">{isRenter ? "I need a space" : "I have a space"}</span>
                  <span className="role-card-description">{config.description}</span>
                </div>

                <span className="role-card-arrow" aria-hidden="true">→</span>
              </motion.button>
            );
          })}
        </div>

        <div className="auth-compact-footer auth-compact-footer--right">
          <button type="button" className="auth-next-button" disabled={!selectedRole || isNavigating} onClick={continueToRoleHome}>
            <span>Continue</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
        {roleError && <p className="auth-error" role="alert">{roleError}</p>}
      </section>
    </main>
  );
}