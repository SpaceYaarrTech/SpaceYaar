"use client";

import {
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  CreditCard,
  Globe2,
  House,
  IdCard,
  MapPin,
  MessagesSquare,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { ProfileMenuRow } from "@/components/renter/profile/ProfileMenuRow";
import {
  profileSetupCount,
  useAddresses,
  useRenterProfile,
  verificationBadges,
} from "@/lib/renter/profile-data";

function defaultLocationLine(
  addressLine: string | null,
  defaultAddress: { city: string; state: string; pincode: string } | null,
): string | null {
  if (defaultAddress) return `${defaultAddress.city}, ${defaultAddress.state} - ${defaultAddress.pincode}`;
  if (addressLine) return addressLine;
  return null;
}

export function RenterProfileHome() {
  const router = useRouter();
  const { profile, loading, error } = useRenterProfile();
  const { addresses } = useAddresses();
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    if (!shareStatus) return;
    const timer = window.setTimeout(() => setShareStatus(""), 2500);
    return () => window.clearTimeout(timer);
  }, [shareStatus]);

  const handleShare = async () => {
    if (!profile) return;
    const shareData = {
      title: `${profile.display_name ?? "SpaceYaar"} on SpaceYaar`,
      text: `${profile.display_name ?? "A SpaceYaar user"} — find warehouses and storage spaces on SpaceYaar.`,
      url: `${window.location.origin}/profile`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setShareStatus("Profile link copied.");
    } catch {
      setShareStatus("Could not share your profile.");
    }
  };

  const defaultAddress = addresses.find((address) => address.is_default) ?? null;
  const badges = verificationBadges(profile);
  const pendingCount = profileSetupCount(profile);

  return (
    <main className="renter-flow-page renter-profile-page">
      <section className="renter-profile-card">
        <button
          type="button"
          className="renter-profile-card-button renter-profile-card-back"
          aria-label="Go back"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/renter"))}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          className="renter-profile-card-button renter-profile-card-share"
          aria-label="Share profile"
          onClick={handleShare}
        >
          <Share2 size={14} strokeWidth={2} aria-hidden />
        </button>

        <div className="renter-profile-avatar-ring">
          {profile?.profile_photo_url ? (
            <Image src={profile.profile_photo_url} alt={profile.display_name ?? "Profile photo"} width={78} height={78} unoptimized className="renter-profile-avatar" />
          ) : (
            <span className="renter-profile-avatar renter-profile-avatar-fallback" aria-hidden>
              {(profile?.display_name ?? "?").trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>

        <h1 className="renter-profile-name">{loading ? "…" : profile?.display_name || "Your profile"}</h1>
        <p className="renter-profile-line">{profile?.email ?? "Add your email"}</p>
        <p className="renter-profile-line">
          {defaultLocationLine(profile?.address ?? null, defaultAddress) ?? "Add your location"}
        </p>
      </section>

      {shareStatus && <p className="renter-profile-share-status" role="status">{shareStatus}</p>}

      {badges.length > 0 && (
        <div className="renter-verification-banner">
          <BadgeCheck size={12} strokeWidth={2.2} aria-hidden />
          <span>{badges.join(" · ")}</span>
        </div>
      )}

      {loading && <p className="renter-flow-state" role="status">Loading your profile…</p>}
      {error && <p className="renter-flow-error" role="alert">{error}</p>}

      {!loading && !error && profile && (
        <>
          <section className="renter-profile-section">
            <h2>Account</h2>
            <div className="renter-profile-menu">
              <ProfileMenuRow icon={IdCard} label="Personal Information" href="/profile/personal-information" badge={pendingCount} />
              <ProfileMenuRow icon={MapPin} label="Saved Addresses" href="/profile/addresses" />
              <ProfileMenuRow icon={BriefcaseBusiness} label="Business Details" href="/profile/business-details" />
            </div>
          </section>

          <section className="renter-profile-section">
            <h2>Preferences</h2>
            <div className="renter-profile-menu">
              <ProfileMenuRow icon={BellRing} label="Notifications" href="/profile/settings/notifications" />
              <ProfileMenuRow icon={Globe2} label="Language &amp; Region" href="/profile/settings/language" />
              <ProfileMenuRow icon={CreditCard} label="Payment Methods" href="/profile/settings/payment-methods" />
            </div>
          </section>

          <section className="renter-profile-section">
            <h2>Support</h2>
            <div className="renter-profile-menu">
              <ProfileMenuRow icon={MessagesSquare} label="Contact Us &amp; Help" href="/profile/settings/contact" />
              <ProfileMenuRow icon={House} label="Help &amp; FAQs" href="/profile/settings/faqs" />
            </div>
          </section>
        </>
      )}

      <RenterBottomNavigation />
    </main>
  );
}
