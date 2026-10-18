"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSelectedRole } from "@/lib/roles/role-storage";

export default function LocationConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const returnTo = window.sessionStorage.getItem("spaceyaar-location-return-to");
      if (returnTo?.startsWith("/owner/spaces")) {
        window.sessionStorage.removeItem("spaceyaar-location-return-to");
        router.replace(returnTo);
        return;
      }
      const role = getSelectedRole() ?? "renter";
      router.replace(role === "owner" ? "/owner" : "/renter");
    }, 250);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="auth-callback-page" style={{ background: "#fff", minHeight: "100svh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "36px" }}>Location confirmed</h1>
        <p style={{ marginTop: "12px", color: "#6b7280" }}>Heading to your SpaceYaar experience.</p>
      </div>
    </main>
  );
}
