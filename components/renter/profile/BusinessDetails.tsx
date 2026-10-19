"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { useRenterProfile, type RenterProfile } from "@/lib/renter/profile-data";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type Draft = { businessName: string; businessType: string; gstNumber: string; address: string };
type FieldErrors = Partial<Record<keyof Draft, string>>;

export function BusinessDetails() {
  const router = useRouter();
  const { profile, loading, error: loadError } = useRenterProfile();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDraft((current) => current ?? {
        businessName: profile.business_name ?? "",
        businessType: profile.business_type ?? "",
        gstNumber: profile.gst_number ?? "",
        address: profile.address ?? "",
      });
    }
  }, [profile]);

  const setField = (field: keyof Draft, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = (): boolean => {
    if (!draft) return false;
    const errors: FieldErrors = {};
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
    if (submitting || !validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: draft!.businessName.trim(),
          business_type: draft!.businessType.trim(),
          gst_number: draft!.gstNumber.trim().toUpperCase(),
          address: draft!.address.trim(),
        }),
      });
      const result = await response.json() as { profile?: RenterProfile; error?: string };
      if (!response.ok || !result.profile) throw new Error(result.error || "Could not save your business details.");
      router.push("/profile");
      router.refresh();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Could not save your business details.");
      setSubmitting(false);
    }
  };

  return (
    <main className="renter-flow-page renter-profile-subpage">
      <header className="renter-subpage-header">
        <button type="button" className="renter-back-button" aria-label="Back to profile" onClick={() => router.push("/profile")}>
          <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className="renter-subpage-title">Business Details</h1>
      </header>

      {loading && <p className="renter-flow-state" role="status">Loading…</p>}
      {loadError && <p className="renter-flow-error" role="alert">{loadError}</p>}
      {!loading && !draft && !loadError && <p className="renter-flow-error" role="alert">Your business details could not be loaded.</p>}

      {draft && (
        <form className="renter-form" onSubmit={submit} noValidate>
          <div className="renter-form-field">
            <label htmlFor="bd-name">Business Name</label>
            <input
              id="bd-name"
              className="renter-form-input"
              value={draft.businessName}
              aria-invalid={Boolean(fieldErrors.businessName) || undefined}
              onChange={(event) => setField("businessName", event.target.value)}
            />
            {fieldErrors.businessName && <span className="renter-field-error">{fieldErrors.businessName}</span>}
          </div>
          <div className="renter-form-field">
            <label htmlFor="bd-type">Business Type</label>
            <input
              id="bd-type"
              className="renter-form-input"
              value={draft.businessType}
              aria-invalid={Boolean(fieldErrors.businessType) || undefined}
              onChange={(event) => setField("businessType", event.target.value)}
            />
            {fieldErrors.businessType && <span className="renter-field-error">{fieldErrors.businessType}</span>}
          </div>
          <div className="renter-form-field">
            <label htmlFor="bd-gst">GST Number (optional)</label>
            <input
              id="bd-gst"
              className="renter-form-input"
              value={draft.gstNumber}
              aria-invalid={Boolean(fieldErrors.gstNumber) || undefined}
              onChange={(event) => setField("gstNumber", event.target.value.toUpperCase())}
            />
            {fieldErrors.gstNumber && <span className="renter-field-error">{fieldErrors.gstNumber}</span>}
          </div>
          <div className="renter-form-field">
            <label htmlFor="bd-address">Business Address</label>
            <textarea
              id="bd-address"
              className="renter-form-input renter-textarea"
              rows={2}
              value={draft.address}
              aria-invalid={Boolean(fieldErrors.address) || undefined}
              onChange={(event) => setField("address", event.target.value)}
            />
            {fieldErrors.address && <span className="renter-field-error">{fieldErrors.address}</span>}
          </div>

          {submitError && <p className="renter-flow-error" role="alert">{submitError}</p>}

          <button type="submit" className="renter-primary-button" disabled={submitting}>
            {submitting ? "Saving…" : "Save Business Details"}
          </button>
        </form>
      )}

      <RenterBottomNavigation />
    </main>
  );
}
