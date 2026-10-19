"use client";

import Image from "next/image";
import { Camera, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { PhoneNumberInput } from "@/components/renter/profile/PhoneNumberInput";
import { requestOtp, verifyOtp } from "@/lib/auth/auth-client";
import { validateEmail, validatePhone } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import {
  GENDER_OPTIONS,
  joinPhone,
  splitPhone,
  useRenterProfile,
  type RenterProfile,
} from "@/lib/renter/profile-data";

const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const todayIso = () => new Date().toISOString().slice(0, 10);

type Draft = {
  name: string;
  phone: string;
  dial: string;
  email: string;
  dob: string;
  gender: "" | "male" | "female" | "other";
};

function draftFromProfile(profile: RenterProfile): Draft {
  const { dial, number } = splitPhone(profile.phone);
  return {
    name: profile.display_name ?? "",
    phone: number,
    dial,
    email: profile.email ?? "",
    dob: profile.date_of_birth ?? "",
    gender: profile.gender ?? "",
  };
}

export function PersonalInformation() {
  const router = useRouter();
  const { profile, loading, error: loadError } = useRenterProfile();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const createdPreviewUrl = useRef<string | null>(null);

  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    if (profile) setDraft((current) => current ?? draftFromProfile(profile));
  }, [profile]);

  useEffect(() => () => {
    if (createdPreviewUrl.current) URL.revokeObjectURL(createdPreviewUrl.current);
  }, []);

  const setField = (field: keyof Draft, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const selectPhoto = (file?: File) => {
    if (!file) return;
    setSubmitError("");
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setSubmitError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setSubmitError("Profile photos must be 5 MB or smaller.");
      return;
    }
    if (createdPreviewUrl.current) URL.revokeObjectURL(createdPreviewUrl.current);
    const previewUrl = URL.createObjectURL(file);
    createdPreviewUrl.current = previewUrl;
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
  };

  const validate = (): boolean => {
    if (!draft) return false;
    const errors: Partial<Record<keyof Draft, string>> = {};
    if (!draft.name.trim()) errors.name = "Enter your full name.";
    else if (draft.name.trim().length > 120) errors.name = "Name must be 120 characters or fewer.";
    const phoneError = validatePhone(draft.phone);
    if (phoneError) errors.phone = phoneError;
    const emailError = draft.email.trim() ? validateEmail(draft.email) : "Enter your email address.";
    if (emailError) errors.email = emailError;
    if (draft.dob && (draft.dob > todayIso() || Number.isNaN(Date.parse(draft.dob)))) {
      errors.dob = "Enter a valid date of birth.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const persist = async (options: { skipPhoneOtp: boolean }) => {
    if (!draft || !profile) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitStatus("");
    let uploadedPath: string | null = null;
    let activeClient: ReturnType<typeof createClient> | null = null;

    try {
      const newPhone = joinPhone(draft.dial, draft.phone);
      const phoneChanged = newPhone !== (profile.phone ?? "");
      const body: Record<string, string | null> = {
        display_name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        date_of_birth: draft.dob || null,
        gender: draft.gender || null,
      };

      if (phoneChanged) {
        if (!options.skipPhoneOtp) {
          setSubmitStatus(`Verifying ${newPhone}…`);
          const request = await requestOtp(newPhone);
          if (!request.ok) throw new Error(request.message);
          setOtpSentTo(newPhone);
          setSubmitting(false);
          return; // wait for OTP verification, then submit with skipPhoneOtp
        }
        body.phone = newPhone;
      }

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
      const result = await response.json() as { profile?: RenterProfile; error?: string };
      if (!response.ok || !result.profile) throw new Error(result.error || "Could not save your profile.");

      if (createdPreviewUrl.current) createdPreviewUrl.current = null;
      setSubmitStatus("Profile updated.");
      router.push("/profile");
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || otpSentTo) return;
    if (!validate()) return;
    void persist({ skipPhoneOtp: false });
  };

  const verifyOtpAndSave = async () => {
    if (!draft || otpBusy) return;
    if (!/^\d{6}$/.test(otpValue)) {
      setSubmitError("Enter the 6-digit code.");
      return;
    }
    setOtpBusy(true);
    setSubmitError("");
    const result = await verifyOtp(otpSentTo, otpValue);
    setOtpBusy(false);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    setOtpSentTo("");
    setOtpValue("");
    await persist({ skipPhoneOtp: true });
  };

  if (loading || (!draft && !loadError)) {
    return (
      <main className="renter-flow-page renter-profile-subpage">
        <p className="renter-flow-state" role="status">Loading…</p>
        <RenterBottomNavigation />
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="renter-flow-page renter-profile-subpage">
        <header className="renter-subpage-header">
          <button type="button" className="renter-back-button" aria-label="Back to profile" onClick={() => router.push("/profile")}>
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
          </button>
          <h1 className="renter-subpage-title renter-subpage-title-centered">Personal Information</h1>
        </header>
        <p className="renter-flow-error" role="alert">{loadError || "Your profile could not be loaded."}</p>
        <RenterBottomNavigation />
      </main>
    );
  }

  return (
    <main className="renter-flow-page renter-profile-subpage">
      <header className="renter-subpage-header">
        <button type="button" className="renter-back-button" aria-label="Back to profile" onClick={() => router.push("/profile")}>
          <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className="renter-subpage-title renter-subpage-title-centered">Personal Information</h1>
      </header>

      {loadError && <p className="renter-flow-error" role="alert">{loadError}</p>}

      <div className="renter-profile-photo">
        <div className="renter-profile-photo-ring">
          {photoPreview || profile?.profile_photo_url ? (
            <Image src={photoPreview ?? profile?.profile_photo_url ?? ""} alt="Profile photo" width={76} height={76} unoptimized className="renter-profile-photo-img" />
          ) : (
            <span className="renter-profile-photo-img renter-profile-photo-fallback" aria-hidden>
              {(draft.name || profile?.display_name || "?").trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>
        <label className="renter-photo-camera" aria-label="Change profile photo">
          <Camera size={13} strokeWidth={2.2} aria-hidden />
          <input type="file" accept={ACCEPTED_PHOTO_TYPES.join(",")} hidden onChange={(event) => selectPhoto(event.target.files?.[0])} />
        </label>
      </div>

      <form className="renter-form" onSubmit={onSubmit} noValidate>
        <div className="renter-form-field">
          <label htmlFor="pi-name">Full Name</label>
          <input
            id="pi-name"
            className="renter-form-input"
            value={draft.name}
            aria-invalid={Boolean(fieldErrors.name) || undefined}
            onChange={(event) => setField("name", event.target.value)}
          />
          {fieldErrors.name && <span className="renter-field-error">{fieldErrors.name}</span>}
        </div>

        <div className="renter-form-field">
          <label htmlFor="pi-phone">Mobile Number*</label>
          <PhoneNumberInput
            dial={draft.dial}
            number={draft.phone}
            invalid={Boolean(fieldErrors.phone)}
            onChange={({ dial, number }) => {
              setDraft((current) => (current ? { ...current, dial, phone: number } : current));
              setFieldErrors((current) => ({ ...current, phone: undefined }));
            }}
          />
          {fieldErrors.phone && <span className="renter-field-error">{fieldErrors.phone}</span>}
        </div>

        {otpSentTo && (
          <div className="renter-otp-panel">
            <p role="status">We sent a 6-digit code to {otpSentTo}. Enter it to confirm your new number.</p>
            <input
              className="renter-form-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              value={otpValue}
              onChange={(event) => setOtpValue(event.target.value.replace(/[^0-9]/g, ""))}
            />
            <div className="renter-otp-actions">
              <button type="button" className="renter-otp-resend" disabled={otpBusy} onClick={() => void persist({ skipPhoneOtp: false })}>Resend</button>
              <button type="button" className="renter-primary-button renter-otp-verify" disabled={otpBusy || otpValue.length !== 6} onClick={() => void verifyOtpAndSave()}>
                {otpBusy ? "Verifying…" : "Verify & Save"}
              </button>
              <button type="button" className="renter-otp-cancel" disabled={otpBusy} onClick={() => { setOtpSentTo(""); setOtpValue(""); setSubmitError(""); }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="renter-form-field">
          <label htmlFor="pi-email">Email Address</label>
          <input
            id="pi-email"
            type="email"
            autoComplete="email"
            className="renter-form-input"
            value={draft.email}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            onChange={(event) => setField("email", event.target.value)}
          />
          {fieldErrors.email && <span className="renter-field-error">{fieldErrors.email}</span>}
        </div>

        <div className="renter-form-field">
          <label htmlFor="pi-dob">Your Date of Birth</label>
          <input
            id="pi-dob"
            type="date"
            className="renter-form-input renter-date-input"
            max={todayIso()}
            value={draft.dob}
            aria-invalid={Boolean(fieldErrors.dob) || undefined}
            onChange={(event) => setField("dob", event.target.value)}
          />
          {fieldErrors.dob && <span className="renter-field-error">{fieldErrors.dob}</span>}
        </div>

        <fieldset className="renter-form-field">
          <legend>Your Gender</legend>
          <div className="renter-radio-group">
            {GENDER_OPTIONS.map((option) => (
              <label key={option.value} className="renter-radio-option">
                <input
                  type="radio"
                  name="gender"
                  value={option.value}
                  checked={draft.gender === option.value}
                  onChange={() => setField("gender", option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {submitError && <p className="renter-flow-error" role="alert">{submitError}</p>}
        {submitStatus && !submitError && <p className="renter-form-status" role="status">{submitStatus}</p>}

        <button type="submit" className="renter-primary-button" disabled={submitting}>
          {submitting ? "Saving…" : "Update Profile Info"}
        </button>
      </form>

      <RenterBottomNavigation />
    </main>
  );
}
