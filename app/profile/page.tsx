"use client";

import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";

export default function ProfilePage() {
  return (
    <main className="renter-flow-page renter-profile-page">
      <div className="renter-profile-placeholder">
        <h1>Profile</h1>
        <p>Profile settings coming soon.</p>
      </div>
      <RenterBottomNavigation />
    </main>
  );
}
