"use client";

import { useCallback, useEffect, useState } from "react";

export type RenterProfile = {
  id: string;
  display_name: string | null;
  phone: string | null;
  role: string | null;
  email: string | null;
  business_name: string | null;
  business_type: string | null;
  gst_number: string | null;
  address: string | null;
  profile_photo_path: string | null;
  profile_photo_url: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
};

export type SavedAddress = {
  id: string;
  user_id: string;
  label: "home" | "office" | "warehouse" | "other";
  address_line: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type AddressFormValues = {
  label: SavedAddress["label"] | "";
  address_line: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  is_default: boolean;
};

export const ADDRESS_TYPE_LABELS: Record<SavedAddress["label"], string> = {
  home: "Home",
  office: "Office Address",
  warehouse: "WareHouse",
  other: "Other",
};

export const ADDRESS_TYPE_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "office", label: "Office Address" },
  { value: "warehouse", label: "WareHouse" },
  { value: "other", label: "Other" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const COUNTRY_DIAL_CODES = [
  { dial: "+91", country: "IN", digitCount: 10 },
] as const;

export function splitPhone(raw: string | null): { dial: string; number: string } {
  if (!raw) return { dial: "+91", number: "" };
  const cleaned = raw.replace(/[\s-]/g, "");
  const match = COUNTRY_DIAL_CODES.find(({ dial }) => cleaned.startsWith(dial));
  if (match) return { dial: match.dial, number: cleaned.slice(match.dial.length) };
  return { dial: "+91", number: cleaned.replace(/^\+?/, "") };
}

export function joinPhone(dial: string, number: string): string {
  return `${dial}${number.replace(/[\s-]/g, "")}`;
}

export function formatDob(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function formatAddressLines(address: SavedAddress): string {
  const line = address.address_line.replace(/[,;\s]+$/, "");
  return `${line},\n${address.city}, ${address.state} - ${address.pincode} India`;
}

export function profileSetupCount(profile: RenterProfile | null): number {
  if (!profile) return 0;
  const missing = [
    !profile.display_name,
    !profile.phone,
    !profile.email,
    !profile.date_of_birth,
    !profile.gender,
    !profile.profile_photo_url,
    !profile.business_name,
  ];
  return missing.filter(Boolean).length;
}

export function verificationBadges(profile: RenterProfile | null): string[] {
  if (!profile) return [];
  const badges: string[] = [];
  // Only show badges backed by authoritative data. There is no KYC status
  // column in this app, so "KYC Verified" is intentionally never rendered.
  if (profile.gst_number) badges.push("GST Registered");
  if (profile.business_name) badges.push("Business Account");
  return badges;
}

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

export async function fetchRenterProfile(): Promise<RenterProfile | null> {
  const response = await fetch("/api/profile", { cache: "no-store" });
  const result = await readResponse<{ profile: RenterProfile | null }>(response, "Could not load your profile.");
  return result.profile;
}

export async function fetchAddresses(): Promise<SavedAddress[]> {
  const response = await fetch("/api/profile/addresses", { cache: "no-store" });
  const result = await readResponse<{ addresses: SavedAddress[] }>(response, "Could not load your addresses.");
  return result.addresses;
}

export function useRenterProfile() {
  const [profile, setProfile] = useState<RenterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    fetchRenterProfile()
      .then((data) => {
        setProfile(data);
        setError("");
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRenterProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return { profile, loading, error, reload };
}

export function useAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    fetchAddresses()
      .then((data) => {
        setAddresses(data);
        setError("");
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load your addresses."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAddresses()
      .then((data) => {
        if (!cancelled) setAddresses(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your addresses.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return { addresses, loading, error, reload, setAddresses };
}
