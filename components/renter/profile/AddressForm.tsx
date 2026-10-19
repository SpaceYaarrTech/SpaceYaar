"use client";

import { ChevronDown, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { PhoneNumberInput } from "@/components/renter/profile/PhoneNumberInput";
import { validatePhone } from "@/lib/auth/validation";
import {
  ADDRESS_TYPE_OPTIONS,
  joinPhone,
  splitPhone,
  useAddresses,
  type AddressFormValues,
  type SavedAddress,
} from "@/lib/renter/profile-data";

type FieldErrors = Partial<Record<keyof AddressFormValues, string>>;

const EMPTY_DRAFT: AddressFormValues = {
  label: "",
  address_line: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  is_default: false,
};

function validateDraft(draft: AddressFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.label) errors.label = "Choose an address type.";
  if (!draft.address_line.trim()) errors.address_line = "Enter the complete address.";
  else if (draft.address_line.trim().length > 500) errors.address_line = "Address must be 500 characters or fewer.";
  if (!draft.city.trim()) errors.city = "Enter the city.";
  if (!draft.state.trim()) errors.state = "Enter the state.";
  // Pincode stays a string so leading zeros survive; validated as a 6-digit code.
  if (!/^[1-9][0-9]{5}$/.test(draft.pincode.trim())) errors.pincode = "Enter a valid 6-digit pincode.";
  const phoneError = validatePhone(splitPhone(draft.phone).number);
  if (phoneError) errors.phone = phoneError;
  return errors;
}

type AddressFormProps = {
  editingId?: string;
};

export function AddressForm({ editingId }: AddressFormProps) {
  const router = useRouter();
  const isEdit = Boolean(editingId);
  const { addresses, loading: listLoading, setAddresses } = useAddresses();

  const [draft, setDraft] = useState<AddressFormValues | null>(isEdit ? null : EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    if (listLoading) return;
    const existing: SavedAddress | undefined = addresses.find((address) => address.id === editingId);
    if (!existing) {
      setNotFound(true);
      return;
    }
    const { dial, number } = splitPhone(existing.phone);
    setDraft((current) => current ?? {
      label: existing.label,
      address_line: existing.address_line,
      landmark: existing.landmark ?? "",
      city: existing.city,
      state: existing.state,
      pincode: existing.pincode,
      phone: joinPhone(dial, number),
      is_default: existing.is_default,
    });
  }, [addresses, editingId, isEdit, listLoading]);

  const setField = <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !draft) return;
    const errors = validateDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const body = {
        label: draft.label,
        address_line: draft.address_line.trim(),
        landmark: draft.landmark.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincode: draft.pincode.trim(),
        phone: draft.phone,
        is_default: draft.is_default,
      };
      const response = await fetch(isEdit ? `/api/profile/addresses/${editingId}` : "/api/profile/addresses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { address?: SavedAddress; error?: string };
      if (!response.ok || !result.address) throw new Error(result.error || "Could not save the address.");

      setAddresses((current) => {
        const saved = result.address as SavedAddress;
        const next = isEdit
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current];
        return saved.is_default
          ? next.map((item) => ({ ...item, is_default: item.id === saved.id }))
          : next;
      });
      router.push("/profile/addresses");
      router.refresh();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Could not save the address.");
      setSubmitting(false);
    }
  };

  if (isEdit && (listLoading || (!draft && !notFound))) {
    return (
      <main className="renter-flow-page renter-profile-subpage">
        <p className="renter-flow-state" role="status">Loading…</p>
        <RenterBottomNavigation />
      </main>
    );
  }

  if (notFound || !draft) {
    return (
      <main className="renter-flow-page renter-profile-subpage">
        <header className="renter-subpage-header">
          <button type="button" className="renter-back-button" aria-label="Back to addresses" onClick={() => router.push("/profile/addresses")}>
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
          </button>
          <h1 className="renter-subpage-title">{isEdit ? "Edit Address" : "Add new address"}</h1>
        </header>
        <p className="renter-flow-error" role="alert">This address could not be found.</p>
        <RenterBottomNavigation />
      </main>
    );
  }

  return (
    <main className="renter-flow-page renter-profile-subpage">
      <header className="renter-subpage-header">
        <button
          type="button"
          className="renter-back-button"
          aria-label="Back to addresses"
          onClick={() => router.push("/profile/addresses")}
        >
          <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className="renter-subpage-title">{isEdit ? "Edit Address" : "Add new address"}</h1>
      </header>

      <form className="renter-form" onSubmit={submit} noValidate>
        <div className="renter-form-field">
          <label htmlFor="af-type">Address Type</label>
          <div className="renter-select-wrap">
            <select
              id="af-type"
              className="renter-form-input"
              value={draft.label}
              aria-invalid={Boolean(fieldErrors.label) || undefined}
              onChange={(event) => setField("label", event.target.value as AddressFormValues["label"])}
            >
              <option value="" disabled>Select</option>
              {ADDRESS_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={15} strokeWidth={2} aria-hidden />
          </div>
          {fieldErrors.label && <span className="renter-field-error">{fieldErrors.label}</span>}
        </div>

        <div className="renter-form-field">
          <label htmlFor="af-address">Complete Address</label>
          <textarea
            id="af-address"
            className="renter-form-input renter-textarea"
            rows={2}
            value={draft.address_line}
            aria-invalid={Boolean(fieldErrors.address_line) || undefined}
            onChange={(event) => setField("address_line", event.target.value)}
          />
          {fieldErrors.address_line && <span className="renter-field-error">{fieldErrors.address_line}</span>}
        </div>

        <div className="renter-form-field">
          <label htmlFor="af-landmark">Landmark (Nearby)</label>
          <input
            id="af-landmark"
            className="renter-form-input"
            value={draft.landmark}
            onChange={(event) => setField("landmark", event.target.value)}
          />
        </div>

        <div className="renter-form-row">
          <div className="renter-form-field">
            <label htmlFor="af-city">City</label>
            <input
              id="af-city"
              className="renter-form-input"
              value={draft.city}
              aria-invalid={Boolean(fieldErrors.city) || undefined}
              onChange={(event) => setField("city", event.target.value)}
            />
            {fieldErrors.city && <span className="renter-field-error">{fieldErrors.city}</span>}
          </div>
          <div className="renter-form-field">
            <label htmlFor="af-state">State</label>
            <input
              id="af-state"
              className="renter-form-input"
              value={draft.state}
              aria-invalid={Boolean(fieldErrors.state) || undefined}
              onChange={(event) => setField("state", event.target.value)}
            />
            {fieldErrors.state && <span className="renter-field-error">{fieldErrors.state}</span>}
          </div>
        </div>

        <div className="renter-form-field">
          <label htmlFor="af-pincode">Pincode</label>
          <input
            id="af-pincode"
            className="renter-form-input"
            inputMode="numeric"
            autoComplete="postal-code"
            value={draft.pincode}
            aria-invalid={Boolean(fieldErrors.pincode) || undefined}
            onChange={(event) => setField("pincode", event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          />
          {fieldErrors.pincode && <span className="renter-field-error">{fieldErrors.pincode}</span>}
        </div>

        <div className="renter-form-field">
          <label htmlFor="af-phone">Mobile Number*</label>
          <PhoneNumberInput
            name="af-phone"
            dial={splitPhone(draft.phone).dial}
            number={splitPhone(draft.phone).number}
            invalid={Boolean(fieldErrors.phone)}
            onChange={({ dial, number }) => {
              setField("phone", joinPhone(dial, number));
            }}
          />
          {fieldErrors.phone && <span className="renter-field-error">{fieldErrors.phone}</span>}
        </div>

        <div className="renter-default-toggle">
          <span>Set this as default address</span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.is_default}
            aria-label="Set this as default address"
            className={`renter-toggle${draft.is_default ? " is-on" : ""}`}
            onClick={() => setField("is_default", !draft.is_default)}
          >
            <span aria-hidden />
          </button>
        </div>

        {submitError && <p className="renter-flow-error" role="alert">{submitError}</p>}

        <div className="renter-sticky-action">
          <button type="submit" className="renter-primary-button" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Update Address" : "Save New Address"}
          </button>
        </div>
      </form>

      <RenterBottomNavigation />
    </main>
  );
}
