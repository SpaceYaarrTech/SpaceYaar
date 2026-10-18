"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  LockKeyhole,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { validatePassword } from "@/lib/auth/validation";
import { savePreviewHostProfile, useHostData, type HostProfile as HostProfileData } from "@/lib/owner/host-data";

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type ProfileDraft = {
  businessName: string;
  businessType: string;
  gstNumber: string;
  address: string;
};

const EMPTY_DRAFT: ProfileDraft = {
  businessName: "",
  businessType: "",
  gstNumber: "",
  address: "",
};

export function HostAvatar({
  name,
  photoUrl,
  size = "large",
}: {
  name: string | null | undefined;
  photoUrl: string | null | undefined;
  size?: "large" | "small";
}) {
  const initial = name?.trim().charAt(0).toUpperCase() || "H";
  return (
    <span role="img" className={`host-profile-avatar host-profile-avatar-${size}`} aria-label={photoUrl ? `${name || "Host"} profile photo` : `${name || "Host"} avatar`}>
      {photoUrl ? (
        <Image src={photoUrl} alt="" width={size === "large" ? 108 : 44} height={size === "large" ? 108 : 44} unoptimized />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  );
}

export function HostProfile() {
  const { data, loading, error } = useHostData();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const profile = data?.profile;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const updated = searchParams.get("updated");
    if (updated === "1") setSuccessMessage("Business information saved.");
    const passwordUpdated = searchParams.get("passwordUpdated") === "1";
    if (passwordUpdated) setSuccessMessage("Password updated.");
    if (!updated && !passwordUpdated) return;
    const timeout = window.setTimeout(() => {
      setSuccessMessage("");
      router.replace("/owner/profile", { scroll: false });
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [router]);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      if (!isAuthBypassEnabled()) {
        const { error: authError } = await createClient().auth.signOut();
        if (authError) throw new Error(authError.message);
      }
      setShowLogoutConfirm(false);
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : "Could not log out. Please try again.");
      setLoggingOut(false);
    }
  };

  const menuItems = [
    { label: "Business Information", href: "/owner/profile/edit", icon: Building2 },
    { label: "Bank & Payout Details", href: "/owner/profile/payout", icon: CreditCard },
    { label: "Notification Settings", href: "/owner/profile/notifications", icon: Bell },
    { label: "Change Password", href: "/owner/profile/change-password", icon: LockKeyhole },
    { label: "Help & Support", href: "/owner/profile/support", icon: CircleHelp },
  ];

  return (
    <div className="host-profile-screen">
      <header className="host-profile-page-header"><h1>Profile</h1></header>
      {loading && <p className="host-state-message" role="status">Loading your profile…</p>}
      {error && <p className="host-state-error" role="alert">{error}</p>}
      {successMessage && <p className="host-success-message host-profile-success" role="status">{successMessage}</p>}
      {!loading && !error && profile && (
        <>
          <section className="host-profile-identity" aria-labelledby="host-profile-heading">
            <h2 id="host-profile-heading">Host Profile</h2>
            <div className="host-profile-identity-row">
              <HostAvatar name={profile.display_name} photoUrl={profile.profile_photo_url} />
              <div className="host-profile-details">
                <strong title={profile.display_name || "Host"}>{profile.display_name || "Host"}</strong>
                <span>{profile.phone || "Phone number not added"}</span>
                <span title={profile.email || "Email not available"}>{profile.email || "Email not available"}</span>
              </div>
            </div>
          </section>
          <nav className="host-profile-menu" aria-label="Profile settings">
            {menuItems.map(({ label, href, icon: Icon }) => (
              <Link href={href} className="host-profile-menu-row" key={label}>
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
                <ChevronRight size={18} strokeWidth={1.7} aria-hidden="true" />
              </Link>
            ))}
            <button type="button" className="host-profile-menu-row is-logout" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>Logout</span>
              <ChevronRight size={18} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </nav>
        </>
      )}
      {showLogoutConfirm && (
        <div className="host-profile-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !loggingOut) setShowLogoutConfirm(false);
        }}>
          <section className="host-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="host-logout-title">
            <h2 id="host-logout-title">Log out?</h2>
            <p>You’ll need to sign in again to access your host account.</p>
            {logoutError && <p className="host-profile-form-error" role="alert">{logoutError}</p>}
            <div className="host-profile-dialog-actions">
              <button type="button" className="host-profile-secondary-button" onClick={() => setShowLogoutConfirm(false)} disabled={loggingOut}>Cancel</button>
              <button type="button" className="host-profile-danger-button" onClick={logout} disabled={loggingOut}>
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function EditHostProfile() {
  const { data, loading, error: loadError } = useHostData();
  const router = useRouter();
  const profile = data?.profile;
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [initialDraft, setInitialDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [touchedGst, setTouchedGst] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialisedProfileId = useRef<string | null>(null);
  const createdPreviewUrl = useRef<string | null>(null);
  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraft) || photoFile !== null,
    [draft, initialDraft, photoFile],
  );

  useEffect(() => {
    if (!profile || initialisedProfileId.current === profile.id) return;
    const loadedDraft: ProfileDraft = {
      businessName: profile.business_name || "",
      businessType: profile.business_type || "",
      gstNumber: profile.gst_number || "",
      address: profile.address || "",
    };
    initialisedProfileId.current = profile.id;
    setDraft(loadedDraft);
    setInitialDraft(loadedDraft);
    setPhotoPreview(profile.profile_photo_url);
  }, [profile]);

  useEffect(() => {
    if (!hasChanges) return;
    const confirmBrowserNavigation = () => {
      if (!window.confirm("Discard your unsaved profile changes?")) {
        window.history.forward();
      }
    };
    const confirmPageExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("popstate", confirmBrowserNavigation);
    window.addEventListener("beforeunload", confirmPageExit);
    return () => {
      window.removeEventListener("popstate", confirmBrowserNavigation);
      window.removeEventListener("beforeunload", confirmPageExit);
    };
  }, [hasChanges]);

  useEffect(() => () => {
    if (createdPreviewUrl.current) URL.revokeObjectURL(createdPreviewUrl.current);
  }, []);

  const gstError = touchedGst && draft.gstNumber.trim() && !GSTIN_PATTERN.test(draft.gstNumber.trim().toUpperCase())
    ? "Enter a valid 15-character GSTIN or leave it empty."
    : "";

  const navigateBack = () => {
    if (hasChanges && !window.confirm("Discard your unsaved profile changes?")) return;
    router.replace("/owner/profile");
  };

  const selectPhoto = (file?: File) => {
    if (!file) return;
    setSubmitError("");
    if (!ACCEPTED_PROFILE_PHOTO_TYPES.includes(file.type)) {
      setSubmitError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setSubmitError("Profile photos must be 5 MB or smaller.");
      return;
    }
    if (createdPreviewUrl.current) URL.revokeObjectURL(createdPreviewUrl.current);
    const previewUrl = URL.createObjectURL(file);
    createdPreviewUrl.current = previewUrl;
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
  };

  const validateDraft = () => {
    const errors: Partial<Record<keyof ProfileDraft, string>> = {};
    if (!draft.businessName.trim()) errors.businessName = "Enter your business name.";
    else if (draft.businessName.trim().length > 120) errors.businessName = "Business name must be 120 characters or fewer.";
    if (!draft.businessType.trim()) errors.businessType = "Enter your business type.";
    else if (draft.businessType.trim().length > 100) errors.businessType = "Business type must be 100 characters or fewer.";
    if (draft.gstNumber.trim() && !GSTIN_PATTERN.test(draft.gstNumber.trim().toUpperCase())) {
      errors.gstNumber = "Enter a valid 15-character GSTIN or leave it empty.";
    }
    if (!draft.address.trim()) errors.address = "Enter your business address.";
    else if (draft.address.trim().length > 500) errors.address = "Address must be 500 characters or fewer.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !profile || !validateDraft()) return;
    setSubmitting(true);
    setSubmitError("");
    let uploadedPath: string | null = null;
    let activeClient: ReturnType<typeof createClient> | null = null;

    try {
      if (data?.isPreview) {
        savePreviewHostProfile({
          display_name: profile.display_name,
          phone: profile.phone,
          email: profile.email,
          business_name: draft.businessName.trim(),
          business_type: draft.businessType.trim(),
          gst_number: draft.gstNumber.trim().toUpperCase() || null,
          address: draft.address.trim(),
          profile_photo_url: photoPreview,
        });
      } else {
        const body: Record<string, string | null> = {
          business_name: draft.businessName.trim(),
          business_type: draft.businessType.trim(),
          gst_number: draft.gstNumber.trim().toUpperCase(),
          address: draft.address.trim(),
        };

        if (photoFile) {
          activeClient = createClient();
          const { data: { user }, error: userError } = await activeClient.auth.getUser();
          if (userError || !user) throw new Error(userError?.message || "Your session has expired. Sign in and try again.");
          const extension = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
          uploadedPath = `${user.id}/profile/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await activeClient.storage.from("profile-photos").upload(uploadedPath, photoFile, {
            contentType: photoFile.type,
            upsert: false,
          });
          if (uploadError) throw new Error(`Could not upload profile photo: ${uploadError.message}`);
          body.profile_photo_path = uploadedPath;
        }

        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json() as { profile?: HostProfileData; error?: string };
        if (!response.ok || !result.profile) {
          throw new Error(result.error || "Could not save your profile.");
        }
      }

      if (data?.isPreview) createdPreviewUrl.current = null;
      router.replace("/owner/profile?updated=1");
      router.refresh();
    } catch (cause) {
      if (uploadedPath && activeClient) {
        const { error: cleanupError } = await activeClient.storage.from("profile-photos").remove([uploadedPath]);
        const errorText = cause instanceof Error ? cause.message : "Could not save your profile.";
        setSubmitError(cleanupError
          ? `${errorText} The uploaded photo could not be removed: ${cleanupError.message}`
          : errorText);
      } else {
        setSubmitError(cause instanceof Error ? cause.message : "Could not save your profile.");
      }
      setSubmitting(false);
    }
  };

  const setField = (field: keyof ProfileDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  if (loading) {
    return <div className="host-edit-profile"><p className="host-state-message" role="status">Loading your profile…</p></div>;
  }
  if (loadError || !profile) {
    return <div className="host-edit-profile"><button type="button" className="host-profile-back" onClick={navigateBack}><ChevronLeft size={22} />Edit Profile</button><p className="host-state-error" role="alert">{loadError || "Your profile could not be found."}</p></div>;
  }

  return (
    <div className="host-edit-profile">
      <header className="host-edit-profile-header">
        <button type="button" className="host-profile-back" onClick={navigateBack}><ChevronLeft size={22} /><span>Edit Profile</span></button>
      </header>
      <h1 className="host-edit-profile-title">Business Information</h1>
      {data?.isPreview && <p className="host-preview-notice" role="note">Local UI preview only. Changes are saved in this browser.</p>}
      <form className="host-profile-form" onSubmit={submit} noValidate>
        <div className="host-profile-field">
          <label htmlFor="business-name">Business Name</label>
          <input id="business-name" value={draft.businessName} onChange={(event) => setField("businessName", event.target.value)} aria-invalid={Boolean(fieldErrors.businessName)} aria-describedby={fieldErrors.businessName ? "business-name-error" : undefined} maxLength={120} />
          {fieldErrors.businessName && <span id="business-name-error" className="host-profile-form-error">{fieldErrors.businessName}</span>}
        </div>
        <div className="host-profile-field">
          <label htmlFor="business-type">Business Type</label>
          <input id="business-type" value={draft.businessType} onChange={(event) => setField("businessType", event.target.value)} aria-invalid={Boolean(fieldErrors.businessType)} aria-describedby={fieldErrors.businessType ? "business-type-error" : undefined} maxLength={100} />
          {fieldErrors.businessType && <span id="business-type-error" className="host-profile-form-error">{fieldErrors.businessType}</span>}
        </div>
        <div className="host-profile-field">
          <label htmlFor="gst-number">GST Number <span>(Optional)</span></label>
          <input id="gst-number" value={draft.gstNumber} onChange={(event) => setField("gstNumber", event.target.value.toUpperCase())} onBlur={() => setTouchedGst(true)} aria-invalid={Boolean(fieldErrors.gstNumber || gstError)} aria-describedby={fieldErrors.gstNumber || gstError ? "gst-number-error" : undefined} maxLength={15} autoCapitalize="characters" />
          {(fieldErrors.gstNumber || gstError) && <span id="gst-number-error" className="host-profile-form-error">{fieldErrors.gstNumber || gstError}</span>}
        </div>
        <div className="host-profile-field">
          <label htmlFor="business-address">Address</label>
          <textarea id="business-address" value={draft.address} onChange={(event) => setField("address", event.target.value)} aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? "business-address-error" : undefined} maxLength={500} rows={3} />
          {fieldErrors.address && <span id="business-address-error" className="host-profile-form-error">{fieldErrors.address}</span>}
        </div>
        <section className="host-profile-photo-section" aria-labelledby="profile-photo-heading">
          <h2 id="profile-photo-heading">Profile Photo</h2>
          <div className="host-profile-photo-control">
            <HostAvatar name={profile.display_name} photoUrl={photoPreview} size="small" />
            <input ref={fileInputRef} id="profile-photo-input" className="host-profile-file-input" type="file" accept={ACCEPTED_PROFILE_PHOTO_TYPES.join(",")} onChange={(event) => selectPhoto(event.target.files?.[0])} />
            <button className="host-profile-photo-button" type="button" onClick={() => fileInputRef.current?.click()}>Change Photo</button>
          </div>
          <p className="host-profile-photo-hint">JPG, PNG, or WebP up to 5 MB.</p>
        </section>
        {submitError && <p className="host-profile-form-error host-profile-submit-error" role="alert">{submitError}</p>}
        <button type="submit" className="host-profile-save-button" disabled={submitting}>
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

export function HostChangePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      router.replace("/owner/profile?passwordUpdated=1");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="host-edit-profile">
      <header className="host-edit-profile-header"><Link className="host-profile-back" href="/owner/profile" replace><ChevronLeft size={22} /><span>Change Password</span></Link></header>
      <h1 className="host-edit-profile-title">Change Password</h1>
      <form className="host-profile-form" onSubmit={submit}>
        <div className="host-profile-field"><label htmlFor="new-password">New Password</label><input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></div>
        <div className="host-profile-field"><label htmlFor="confirm-password">Confirm Password</label><input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
        {error && <p className="host-profile-form-error" role="alert">{error}</p>}
        <button type="submit" className="host-profile-save-button" disabled={saving}>{saving ? "Updating…" : "Update Password"}</button>
      </form>
    </div>
  );
}

export function HostProfileIntegration() {
  const params = useParams<{ section: string }>();
  const section = params.section;
  const pages: Record<string, { title: string; detail: string }> = {
    payout: {
      title: "Bank & Payout Details",
      detail: "Payout account setup is not available yet. The current backend does not include a payout account service or secure bank-details storage.",
    },
    notifications: {
      title: "Notification Settings",
      detail: "Notification preferences are not available yet. The current backend does not include notification preference storage or delivery settings.",
    },
    support: {
      title: "Help & Support",
      detail: "A support destination has not been configured for this application yet.",
    },
  };
  const page = pages[section] || { title: "Profile Settings", detail: "This profile setting is not available." };

  return (
    <div className="host-edit-profile">
      <header className="host-edit-profile-header"><Link className="host-profile-back" href="/owner/profile" replace><ChevronLeft size={22} /><span>{page.title}</span></Link></header>
      <h1 className="host-edit-profile-title">{page.title}</h1>
      <p className="host-profile-integration-message">{page.detail}</p>
      <Link href="/owner/profile" replace className="host-profile-integration-link">Back to Profile</Link>
    </div>
  );
}
