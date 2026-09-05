"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SpaceYaarLogo } from "@/components/branding/SpaceYaarLogo";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ROLE_OPTIONS } from "@/lib/roles/role-config";
import { setSelectedRole } from "@/lib/roles/role-storage";
import type { UserRole } from "@/types/roles";
import { RoleIcon } from "./RoleIcon";

export function RoleSelection() {
  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const continueToRoleHome = () => {
    if (!selectedRole || isNavigating) return;
    setIsNavigating(true);
    setSelectedRole(selectedRole);
    window.location.assign(`/${selectedRole}`);
  };

  return (
    <main className="page-shell role-selection-page">
      <header className="role-selection-header"><SpaceYaarLogo href="/login" /><span className="header-note">Choose your experience</span></header>
      <section className="role-selection-content" aria-labelledby="role-selection-title">
        <motion.div className="role-selection-intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
          <span className="eyebrow">One platform, your perspective</span>
          <h1 id="role-selection-title" className="display-font">How will you use SpaceYaar?</h1>
          <p>Choose your experience to get started.</p>
        </motion.div>
        <div className="role-options" role="group" aria-label="Choose your SpaceYaar experience">
          {ROLE_OPTIONS.map(([role, config], index) => {
            const isSelected = selectedRole === role;
            return <motion.button key={role} type="button" className={`role-card ${isSelected ? "selected" : ""}`} aria-pressed={isSelected} onClick={() => setSelectedRoleState(role)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .1 + .15, duration: .5 }} whileTap={{ scale: .985 }}>
              <span className="role-card-top"><span className="role-icon"><RoleIcon role={role} /></span><span className={`role-check ${isSelected ? "visible" : ""}`} aria-hidden="true">✓</span></span>
              <span className="role-card-copy"><span className="role-card-label">{config.label}</span><span className="role-card-description">{config.description}</span></span>
              <span className="role-card-arrow" aria-hidden="true">-&gt;</span>
            </motion.button>;
          })}
        </div>
        <div className="role-selection-action"><PrimaryButton type="button" disabled={!selectedRole || isNavigating} onClick={continueToRoleHome}>Continue <span aria-hidden="true" className="button-arrow">-&gt;</span></PrimaryButton><span className="role-selection-note">You can change your experience later.</span></div>
      </section>
      <footer className="role-selection-footer"><span>Space for what&apos;s next</span><span>02 / 02</span></footer>
    </main>
  );
}