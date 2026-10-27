"use client";

import { useEffect, useState } from "react";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";

const PREVIEW_LISTINGS_KEY = "spaceyaar:host-preview-listings";
const PREVIEW_PROFILE_KEY = "spaceyaar:host-preview-profile";

let previewProfilePhotoUrl: string | null = null;

export type HostListing = {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
  property_type: string;
  floor_level: string;
  area_value: number | null;
  area_unit: string | null;
  length: number | null;
  breadth: number | null;
  height: number | null;
  dimension_unit: string | null;
  temperature: number | null;
  temperature_unit: string | null;
  usage_types: string[];
  loading_features: string[];
  price_amount: number;
  price_model: string;
  security_amount: number;
  refund_within_days: number;
  min_booking_days: number;
  pincode: string | null;
  state: string;
  access_instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  availability_days: string[];
  listing_photos: Array<{ id: string; image_url: string; label: string; position: number }>;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  review_progress?: Array<{ stage: "viewed" | "assets_approved"; created_at: string }>;
  created_at: string;
};

export type HostBooking = {
  id: string;
  listing_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  message: string;
  status: "requested" | "accepted" | "rejected" | "cancelled" | "completed";
  quoted_total: number;
  created_at: string;
  listings: {
    title: string;
    city: string;
    property_type: string;
    area_value: number | null;
    area_unit: string | null;
  } | null;
  profiles: { display_name: string | null; phone: string | null } | null;
};

export type HostProfile = {
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
};

export type HostData = {
  listings: HostListing[];
  bookings: HostBooking[];
  profile: HostProfile | null;
  isPreview: boolean;
};

type LoadState = {
  data: HostData | null;
  loading: boolean;
  error: string;
};

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

export function savePreviewHostProfile(profile: Omit<HostProfile, "id" | "role" | "profile_photo_path">) {
  previewProfilePhotoUrl = profile.profile_photo_url;
  window.localStorage.setItem(PREVIEW_PROFILE_KEY, JSON.stringify({
    display_name: profile.display_name,
    phone: profile.phone,
    email: profile.email,
    business_name: profile.business_name,
    business_type: profile.business_type,
    gst_number: profile.gst_number,
    address: profile.address,
  }));
}

export async function loadHostData(): Promise<HostData> {
  if (isAuthBypassEnabled()) {
    const previewListings = window.localStorage.getItem(PREVIEW_LISTINGS_KEY);
    const previewProfile = window.localStorage.getItem(PREVIEW_PROFILE_KEY);
    const defaultProfile: HostProfile = {
      id: "local-preview-host",
      display_name: "Maalik",
      phone: null,
      role: "owner",
      email: null,
      business_name: null,
      business_type: null,
      gst_number: null,
      address: null,
      profile_photo_path: null,
      profile_photo_url: previewProfilePhotoUrl,
    };
    return {
      listings: previewListings ? JSON.parse(previewListings) as HostListing[] : [],
      bookings: [],
      profile: {
        ...defaultProfile,
        ...(previewProfile ? JSON.parse(previewProfile) as Partial<HostProfile> : {}),
        profile_photo_url: previewProfilePhotoUrl,
      },
      isPreview: true,
    };
  }

  const [listingsResponse, bookingsResponse, profileResponse] = await Promise.all([
    fetch("/api/listings/mine", { cache: "no-store" }),
    fetch("/api/owner/renters", { cache: "no-store" }),
    fetch("/api/profile", { cache: "no-store" }),
  ]);

  const [listingsResult, bookingsResult, profileResult] = await Promise.all([
    readResponse<{ listings: HostListing[] }>(listingsResponse, "Could not load your listings."),
    readResponse<{ bookings: HostBooking[] }>(bookingsResponse, "Could not load your bookings."),
    readResponse<{ profile: HostProfile | null }>(profileResponse, "Could not load your profile."),
  ]);

  return {
    listings: listingsResult.listings,
    bookings: bookingsResult.bookings,
    profile: profileResult.profile,
    isPreview: false,
  };
}

export function savePreviewListing(listing: HostListing) {
  const previous = window.localStorage.getItem(PREVIEW_LISTINGS_KEY);
  const listings = previous ? JSON.parse(previous) as HostListing[] : [];
  window.localStorage.setItem(PREVIEW_LISTINGS_KEY, JSON.stringify([listing, ...listings]));
}

export function useHostData(): LoadState {
  const [state, setState] = useState<LoadState>({ data: null, loading: true, error: "" });

  useEffect(() => {
    let cancelled = false;
    loadHostData()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "Could not load host data.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function formatHostPrice(amount: number, model: string) {
  const unit = model === "Per Day" ? "day" : model.replace(/^Per /, "").toLowerCase();
  return `₹${Number(amount).toLocaleString("en-IN")}/${unit}`;
}
