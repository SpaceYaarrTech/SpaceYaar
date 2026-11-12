"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, ImageUp, Info, MapPin, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { PricingAvailabilityStep } from "@/components/owner/PricingAvailabilityStep";
import { LoginGateModal } from "@/components/auth/LoginGateModal";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { MAP_CONFIG } from "@/lib/maps/map-config";
import type { LocationSearchResult } from "@/lib/maps/geocoding";
import { createClient } from "@/lib/supabase/client";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { isGuestLoginRequired } from "@/lib/auth/guest-session";
import { savePreviewListing } from "@/lib/owner/host-data";
import { track } from "@/lib/analytics";
import { durationDays, formatINR } from "@/lib/listing/config";
import {
  LISTING_DRAFT_VERSION,
  clearListingDraft,
  loadListingDraft,
  saveListingDraft,
  type ListingDraft,
} from "@/lib/listing/draft-storage";
import {
  firstError,
  validateStep1,
  validateStep2,
  validateStep5,
  validateStep6,
  type FieldErrors,
  type Step4Values,
} from "@/lib/listing/validation";
import {
  LISTING_MIN_IMAGES,
  LISTING_MIN_MEDIA,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  compressImageFile,
  formatFileSize,
  isValidVideoMime,
} from "@/lib/listing-media";

const LocationMap = dynamic(() => import("@/components/location/LocationMap"), { ssr: false });

type SpaceTypeOption = {
  id: string;
  label: string;
  icon: "cold" | "warehouse" | "factory" | "climate" | "retail" | "logistics";
};

const SPACE_TYPES: SpaceTypeOption[] = [
  { id: "cold-storage", label: "Cold Storage", icon: "cold" },
  { id: "warehouse", label: "Warehouse", icon: "warehouse" },
  { id: "industrial", label: "Industrial/Factory", icon: "factory" },
  { id: "climate-control", label: "Climate Control", icon: "climate" },
  { id: "retail-storage", label: "Retail Storage", icon: "retail" },
  { id: "logistic-hub", label: "Logistic Hub", icon: "logistics" },
];

const USAGE_OPTIONS = ["General", "FMGC/Food", "Pharma", "E-Commerce", "Electronics", "Apparel"];
const LOADING_FEATURES = ["24/7 CCTV Camera", "Loading Dock", "E-Forklift Ready", "Security Guard", "Freight Elevator", "Drive-in Access"];
const SECURITY_AMENITIES = ["Keycard Access", "24/7 CCTV", "Security Guard", "Alarm System", "Fire Suppression", "Sprinklers"];
const UTILITY_AMENITIES = ["Power Backup", "100% Uptime", "WiFi / LAN", "Ventilation", "Humidity Control", "Water Supply"];
const LOGISTICS_AMENITIES = ["Loading Dock", "Forklift", "Racking System", "Freight Lift", "Truck Parking", "Weighbridge"];
const PHOTO_OPTIONS = ["Main Entrance", "Interior View", "Exterior View", "Storage Area", "Loading Dock", "Others"];
const DOCUMENT_OPTIONS = ["GST Certificate", "Aadhaar Card", "Pan Card", "Property Ownership", "Electricity Bill (Last Bill)"];
const FLOOR_OPTIONS = ["Basement", "Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor", "5 or more"];
const DIMENSION_UNITS = ["Ft", "Gaj", "Cm", "Inch", "Meter"] as const;
const SPACE_AREA_UNITS = ["Sq. Feet", "Sq. Gaj", "Sq. Cm", "Sq. Inch", "Sq. Meter"] as const;
const TEMPERATURE_UNITS = ["Celsius", "Fahrenheit"] as const;
type DimensionUnit = (typeof DIMENSION_UNITS)[number];
type SpaceAreaUnit = (typeof SPACE_AREA_UNITS)[number];
type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];
const FEET_PER_UNIT: Record<DimensionUnit, number> = {
  Ft: 1,
  Gaj: 3,
  Cm: 1 / 30.48,
  Inch: 1 / 12,
  Meter: 3.28084,
};
const SQUARE_UNIT_LABELS: Record<DimensionUnit, string> = {
  Ft: "sq ft",
  Gaj: "sq gaj",
  Cm: "sq cm",
  Inch: "sq inch",
  Meter: "sq m",
};
const SQ_FEET_PER_AREA_UNIT: Record<SpaceAreaUnit, number> = {
  "Sq. Feet": 1,
  "Sq. Gaj": 9,
  "Sq. Cm": (1 / 30.48) ** 2,
  "Sq. Inch": 1 / 144,
  "Sq. Meter": 10.7639104167,
};

const totalSteps = 6;
const accentPurple = "#6530F5";

const defaultLocation: LocationSearchResult = {
  latitude: MAP_CONFIG.defaultCenter[0],
  longitude: MAP_CONFIG.defaultCenter[1],
  displayName: "Kanpur, Uttar Pradesh, India",
  city: "Kanpur",
  area: "Panki",
};

function SpaceTypeIcon({ type }: { type: SpaceTypeOption["icon"] }) {
  const commonProps = { viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (type) {
    case "cold":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M16 4v12.5" />
          <path d="M11 9.5h10" />
          <path d="M12.5 22.5c0 2.9 1.6 5 3.5 5s3.5-2.1 3.5-5c0-2.2-1.1-3.6-2.8-4.8a9.5 9.5 0 0 0-1.4-1.1c-.7-.5-1.3-.9-1.3-1.9s.6-1.5 1.5-1.5a2.6 2.6 0 0 1 2.2 1.1" />
          <path d="M9 20.5c1.5-1.1 3.2-1.7 7-1.7 2.6 0 4.4.5 6 1.5" />
        </svg>
      );
    case "warehouse":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M5 12.5 16 6l11 6.5" />
          <path d="M7 13.5v12h18v-12" />
          <path d="M12 25.5v-8h8v8" />
          <path d="M9 16h14" />
        </svg>
      );
    case "factory":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M5 24V12.5l6-3.5 4 3.5V24" />
          <path d="M15 24V14h8v10" />
          <path d="M22 24h5V11.5l-5-3.5" />
          <path d="M18 18h2" />
          <path d="M9 13h1.5" />
          <path d="M10 24v-4.5" />
        </svg>
      );
    case "climate":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M16 7v10.5" />
          <path d="M13 10.5h6" />
          <path d="M9 11.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5v9.4c0 2.7-3 4.6-7 4.6s-7-1.9-7-4.6v-9.4Z" />
          <path d="M9 20.5c2.7 1.8 5.1 2.5 7 2.5 2.8 0 5.1-.8 7-2.5" />
          <path d="M11 20.5 16 25l5-4.5" />
        </svg>
      );
    case "retail":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M7 12h18l-2 13H9L7 12Z" />
          <path d="M11 12V9.5A5 5 0 0 1 16 5a5 5 0 0 1 5 4.5V12" />
          <path d="M12 18h8" />
          <path d="M16 16v4" />
        </svg>
      );
    case "logistics":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M6 18h12l2.5-7H8.5L6 18Z" />
          <path d="M18 18h4.5l2.5 4.5H18" />
          <path d="M9 18v4.5" />
          <path d="M18 18v4.5" />
          <path d="M8.5 11.5h10.5" />
          <path d="M12 6.5h2.5v5H12z" />
        </svg>
      );
    default:
      return null;
  }
}

export function OwnerHome() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showReview, setShowReview] = useState(false);

  const [selectedSpaceType, setSelectedSpaceType] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [spaceArea, setSpaceArea] = useState("");
  const [spaceAreaUnit, setSpaceAreaUnit] = useState<SpaceAreaUnit>("Sq. Feet");
  const [description, setDescription] = useState("");
  const [selectedUsages, setSelectedUsages] = useState<string[]>([]);

  const [length, setLength] = useState("");
  const [breadth, setBreadth] = useState("");
  const [height, setHeight] = useState("");
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>("Ft");
  const [temperature, setTemperature] = useState("");
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>("Celsius");
  const [selectedLoadingFeatures, setSelectedLoadingFeatures] = useState<string[]>([]);
  const [areaOverridden, setAreaOverridden] = useState(false);
  const [areaOverrideActive, setAreaOverrideActive] = useState(false);

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [priceModel, setPriceModel] = useState("");
  const [rate, setRate] = useState("");
  const [securityAmount, setSecurityAmount] = useState("");
  const [refundDays, setRefundDays] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  const [minimumBookingDuration, setMinimumBookingDuration] = useState("45 Days");
  const [minimumBookingCustomDays, setMinimumBookingCustomDays] = useState("45");
  const [maximumBookingDuration, setMaximumBookingDuration] = useState("11 Months");
  const [maximumBookingCustomDays, setMaximumBookingCustomDays] = useState("330");

  const [photoFiles, setPhotoFiles] = useState<Record<string, { name: string; previewUrl: string; file: File; isVideo: boolean; isCompressing?: boolean }>>({});
  const [documentFiles, setDocumentFiles] = useState<Record<string, { name: string; file: File }>>({});
  const [draftListingId, setDraftListingId] = useState<string | null>(null);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [loginGate, setLoginGate] = useState(false);
  const [stepError, setStepError] = useState("");
  const [stepErrors, setStepErrors] = useState<FieldErrors>({});
  const [errorRevealTick, setErrorRevealTick] = useState(0);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [editingFromReview, setEditingFromReview] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [accessInstructions, setAccessInstructions] = useState("");

  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult>(defaultLocation);
  const mapApiRef = useRef<any>(null);
  const photoPreviewUrlsRef = useRef<string[]>([]);

  // Draft lifecycle refs: hydration gates the autosave, and a restored
  // location must not be overwritten by a fresh geolocation fix.
  const hydratedRef = useRef(false);
  const hasInteractedRef = useRef(false);
  const locationRestoredRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (locationRestoredRef.current) return;
        const nextLocation: LocationSearchResult = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          displayName: "Current location",
          city: "Current location",
          area: "Current location",
        };

        setSelectedLocation(nextLocation);
      },
      () => {
        if (locationRestoredRef.current) return;
        setSelectedLocation(defaultLocation);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  }, []);

  // Restore a saved draft on mount (handoff §4: refresh keeps progress).
  useEffect(() => {
    const draft = loadListingDraft();
    if (draft) {
      const values = draft.values;
      setSelectedSpaceType(values.selectedSpaceType ?? "");
      setSelectedFloor(values.selectedFloor ?? "");
      setSpaceArea(values.spaceArea ?? "");
      setSpaceAreaUnit((values.spaceAreaUnit as SpaceAreaUnit) ?? "Sq. Feet");
      setDescription(values.description ?? "");
      setSelectedUsages(values.selectedUsages ?? []);
      setLength(values.length ?? "");
      setBreadth(values.breadth ?? "");
      setHeight(values.height ?? "");
      setDimensionUnit((values.dimensionUnit as DimensionUnit) ?? "Ft");
      setTemperature(values.temperature ?? "");
      setTemperatureUnit((values.temperatureUnit as TemperatureUnit) ?? "Celsius");
      setSelectedLoadingFeatures(values.selectedLoadingFeatures ?? []);
      setAreaOverridden(Boolean(values.areaOverridden));
      setSelectedAmenities(values.selectedAmenities ?? []);
      setPriceModel(values.priceModel ?? "");
      setRate(values.rate ?? "");
      setSecurityAmount(values.securityAmount ?? "");
      setRefundDays(values.refundDays ?? "");
      setAvailabilityDays(values.availabilityDays ?? []);
      setMinimumBookingDuration(values.minimumBookingDuration ?? "45 Days");
      setMinimumBookingCustomDays(values.minimumBookingCustomDays ?? "45");
      setMaximumBookingDuration(values.maximumBookingDuration ?? "11 Months");
      setMaximumBookingCustomDays(values.maximumBookingCustomDays ?? "330");
      setAddress(values.address ?? "");
      setPincode(values.pincode ?? "");
      setCity(values.city ?? "");
      setState(values.state ?? "");
      setAccessInstructions(values.accessInstructions ?? "");
      if (values.selectedLocation) setSelectedLocation(values.selectedLocation);
      locationRestoredRef.current = true;
      setCurrentStep(Math.min(Math.max(draft.currentStep, 1), totalSteps));
      setShowReview(Boolean(draft.showReview));
      setEditingFromReview(typeof draft.editingFromReview === "number" ? draft.editingFromReview : null);
      setDraftListingId(draft.draftListingId ?? null);
      setDraftNotice("Picked up where you left off.");
    }
    hydratedRef.current = true;
  }, []);

  // Debounced autosave (handoff §18): mirrors state to storage 1s after the
  // last change so a refresh mid-step never loses edits. Skipped until the
  // draft has hydrated and the owner has actually interacted.
  useEffect(() => {
    if (!hydratedRef.current || !hasInteractedRef.current) return;
    const timer = window.setTimeout(() => {
      saveListingDraft(snapshotDraft(currentStep, showReview));
    }, 1000);
    return () => window.clearTimeout(timer);
  });

  // The restore notice is informational only — clear it on its own.
  useEffect(() => {
    if (!draftNotice) return;
    const timer = window.setTimeout(() => setDraftNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [draftNotice]);

  const descriptionLength = useMemo(() => description.length, [description]);
  const accessLength = useMemo(() => accessInstructions.length, [accessInstructions]);
  const progressWidth = useMemo(() => `${(currentStep / totalSteps) * 100}%`, [currentStep]);
  const areaValue = useMemo(() => {
    const numericLength = Number.parseFloat(length || "0");
    const numericBreadth = Number.parseFloat(breadth || "0");
    if (!Number.isFinite(numericLength) || !Number.isFinite(numericBreadth)) {
      return "0 sq ft (0 sq ft · 0 sq m)";
    }
    const areaInSelectedUnit = numericLength * numericBreadth;
    const areaInSquareFeet = areaInSelectedUnit * FEET_PER_UNIT[dimensionUnit] ** 2;
    const areaInSquareMeters = areaInSquareFeet / 10.7639104167;
    const formatArea = (area: number) => area.toLocaleString("en-IN", { maximumFractionDigits: 2 });

    return `${formatArea(areaInSelectedUnit)} ${SQUARE_UNIT_LABELS[dimensionUnit]} (${formatArea(areaInSquareFeet)} sq ft · ${formatArea(areaInSquareMeters)} sq m)`;
  }, [length, breadth, dimensionUnit]);

  const changeDimensionUnit = (nextUnit: DimensionUnit) => {
    const convertLength = (value: string) => {
      if (!value.trim()) return value;
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return value;
      const convertedValue = numericValue * FEET_PER_UNIT[dimensionUnit] / FEET_PER_UNIT[nextUnit];
      return Number(convertedValue.toPrecision(6)).toString();
    };

    setLength(convertLength(length));
    setBreadth(convertLength(breadth));
    setHeight(convertLength(height));
    setDimensionUnit(nextUnit);
  };

  const changeSpaceAreaUnit = (nextUnit: SpaceAreaUnit) => {
    const numericArea = Number(spaceArea.replace(/,/g, ""));
    if (spaceArea.trim() && Number.isFinite(numericArea)) {
      const convertedArea = numericArea * SQ_FEET_PER_AREA_UNIT[spaceAreaUnit] / SQ_FEET_PER_AREA_UNIT[nextUnit];
      setSpaceArea(convertedArea.toLocaleString("en-IN", { maximumFractionDigits: 2 }));
    }
    setSpaceAreaUnit(nextUnit);
  };

  const changeTemperatureUnit = (nextUnit: TemperatureUnit) => {
    if (temperature.trim()) {
      const numericTemperature = Number(temperature);
      if (Number.isFinite(numericTemperature)) {
        const convertedTemperature = nextUnit === "Fahrenheit"
          ? numericTemperature * 9 / 5 + 32
          : (numericTemperature - 32) * 5 / 9;
        setTemperature(Number(convertedTemperature.toFixed(2)).toString());
      }
    }
    setTemperatureUnit(nextUnit);
  };

  const toggleUsage = (value: string) => {
    setSelectedUsages((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleLoadingFeature = (value: string) => {
    setSelectedLoadingFeatures((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleAmenity = (value: string) => {
    setSelectedAmenities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const snapshotDraft = (step: number, review: boolean): ListingDraft => ({
    version: LISTING_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
    currentStep: step,
    showReview: review,
    editingFromReview,
    draftListingId,
    values: {
      selectedSpaceType,
      selectedFloor,
      spaceArea,
      spaceAreaUnit,
      description,
      selectedUsages,
      length,
      breadth,
      height,
      dimensionUnit,
      temperature,
      temperatureUnit,
      selectedLoadingFeatures,
      areaOverridden,
      selectedAmenities,
      priceModel,
      rate,
      securityAmount,
      refundDays,
      availabilityDays,
      minimumBookingDuration,
      minimumBookingCustomDays,
      maximumBookingDuration,
      maximumBookingCustomDays,
      address,
      pincode,
      city,
      state,
      accessInstructions,
      selectedLocation: {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        displayName: selectedLocation.displayName,
        city: selectedLocation.city ?? "",
        area: selectedLocation.area ?? "",
      },
    },
  });

  // Persist the draft before navigating; a failed write must not lose the
  // step's data or move the owner forward (handoff §18).
  const persistStep = async (step: number, review: boolean): Promise<boolean> => {
    setIsSavingStep(true);
    try {
      // Yield once so the Saving state gets a chance to paint.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const saved = saveListingDraft(snapshotDraft(step, review));
      if (!saved) {
        setStepError("Couldn't save your progress. Check that browser storage is available, then try again.");
      }
      return saved;
    } finally {
      setIsSavingStep(false);
    }
  };

  const clearFieldError = (field: string) =>
    setStepErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

  const stepBanner = stepError || firstError(stepErrors);

  const step4Values: Step4Values = useMemo(
    () => ({
      priceModel,
      rate,
      securityAmount,
      refundDays,
      availabilityDays,
      minimumBookingDuration,
      minimumBookingCustomDays,
      maximumBookingDuration,
      maximumBookingCustomDays,
    }),
    [
      priceModel,
      rate,
      securityAmount,
      refundDays,
      availabilityDays,
      minimumBookingDuration,
      minimumBookingCustomDays,
      maximumBookingDuration,
      maximumBookingCustomDays,
    ],
  );

  const setStep4Values = (patch: Partial<Step4Values>) => {
    if ("priceModel" in patch) {
      setPriceModel(patch.priceModel ?? "");
      clearFieldError("priceModel");
    }
    if ("rate" in patch) {
      setRate(patch.rate ?? "");
      clearFieldError("rate");
    }
    if ("securityAmount" in patch) {
      const nextSecurity = patch.securityAmount ?? "";
      setSecurityAmount(nextSecurity);
      // A zero deposit disables and clears the refund timeline (§8.3).
      if (!nextSecurity || Number(nextSecurity.replace(/,/g, "")) === 0) setRefundDays("");
      clearFieldError("security");
      clearFieldError("refund");
    }
    if ("refundDays" in patch) {
      setRefundDays(patch.refundDays ?? "");
      clearFieldError("refund");
    }
    if ("availabilityDays" in patch) {
      setAvailabilityDays(patch.availabilityDays ?? []);
      clearFieldError("availabilityDays");
    }
    if ("minimumBookingDuration" in patch) {
      setMinimumBookingDuration(patch.minimumBookingDuration ?? "");
      clearFieldError("minimumBookingDuration");
    }
    if ("minimumBookingCustomDays" in patch) {
      setMinimumBookingCustomDays(patch.minimumBookingCustomDays ?? "");
      clearFieldError("minimumBookingDuration");
    }
    if ("maximumBookingDuration" in patch) {
      setMaximumBookingDuration(patch.maximumBookingDuration ?? "");
      clearFieldError("maximumBookingDuration");
    }
    if ("maximumBookingCustomDays" in patch) {
      setMaximumBookingCustomDays(patch.maximumBookingCustomDays ?? "");
      clearFieldError("maximumBookingDuration");
    }
  };

  const selectSpaceType = (id: string) => {
    setSelectedSpaceType(id);
    // Temperature fields only apply to temperature-controlled spaces (§6.3).
    if (id !== "cold-storage" && id !== "climate-control") setTemperature("");
    clearFieldError("spaceType");
  };

  const showTemperatureFields = selectedSpaceType === "cold-storage" || selectedSpaceType === "climate-control";

  const removePhoto = (label: string) => {
    setPhotoFiles((current) => {
      const slot = current[label];
      if (slot) {
        URL.revokeObjectURL(slot.previewUrl);
        photoPreviewUrlsRef.current = photoPreviewUrlsRef.current.filter((url) => url !== slot.previewUrl);
      }
      const next = { ...current };
      delete next[label];
      return next;
    });
    setStepError("");
  };

  const removeDocument = (name: string) => {
    setDocumentFiles((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  // Review → checklist edit is a one-step detour that returns to Review
  // when the owner presses Save & Continue (handoff §11).
  const editSection = (step: number) => {
    setShowReview(false);
    setCurrentStep(step);
    setEditingFromReview(step);
    setStepError("");
    setStepErrors({});
    track("listing_section_edited", { step });
  };

  const validateCurrentStep = (): FieldErrors => {
    switch (currentStep) {
      case 1:
        return validateStep1({
          spaceType: selectedSpaceType,
          floor: selectedFloor,
          area: spaceArea,
          description,
          usages: selectedUsages,
        });
      case 2:
        return validateStep2({ length, breadth, height });
      case 5:
        return validateStep5({
          mediaCount: Object.keys(photoFiles).length,
          imageCount: Object.values(photoFiles).filter((photo) => !photo.isVideo).length,
          hasAadhaar: Boolean(documentFiles["Aadhaar Card"]),
        });
      default:
        // Step 3 needs nothing; Step 4 gates itself before calling
        // onContinue; Step 6 validates in handleReview.
        return {};
    }
  };

  // Review preview derives from real wizard state (handoff §11 — no sample
  // copy or hardcoded ratings).
  const previewTitle = `${selectedSpaceType.replace(/-/g, " ") || "space"} in ${city || selectedLocation.city || "Kanpur"}`;
  const previewPhoto = useMemo(
    () => Object.values(photoFiles).find((photo) => !photo.isVideo) ?? Object.values(photoFiles)[0],
    [photoFiles],
  );
  const previewTags = useMemo(() => {
    const tags = [...selectedAmenities, ...selectedLoadingFeatures];
    if (tags.length) return tags.slice(0, 5);
    const spaceType = SPACE_TYPES.find((option) => option.id === selectedSpaceType);
    return spaceType ? [spaceType.label] : [];
  }, [selectedAmenities, selectedLoadingFeatures, selectedSpaceType]);

  // Move focus to the first invalid control after a failed Save & Continue.
  useEffect(() => {
    if (!errorRevealTick) return;
    document.querySelector<HTMLElement>('.owner-page [aria-invalid="true"]')?.focus();
  }, [errorRevealTick]);

  // Analytics: one listing_step_viewed per step/review transition (§19).
  useEffect(() => {
    track("listing_step_viewed", { step: currentStep, review: showReview });
  }, [currentStep, showReview]);

  useEffect(() => () => {
    photoPreviewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, []);

  const imageCount = Object.values(photoFiles).filter((photo) => !photo.isVideo).length;

  const handleUpload = (label: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type.startsWith("video/")) {
      if (!isValidVideoMime(file)) {
        setStepError("Videos must be MP4, WebM or MOV.");
        track("listing_photo_upload_failed", { reason: "invalid_video_type" });
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setStepError(`Videos must be under 10 MB — this one is ${formatFileSize(file.size)}.`);
        track("listing_photo_upload_failed", { reason: "video_too_large" });
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      photoPreviewUrlsRef.current.push(previewUrl);
      setStepError("");
      setPhotoFiles((current) => ({
        ...current,
        [label]: { name: file.name, previewUrl, file, isVideo: true },
      }));
      track("listing_photo_uploaded", { type: "video" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStepError("Upload a photo or a video (MP4, WebM or MOV).");
      track("listing_photo_upload_failed", { reason: "invalid_image_type" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setStepError(`Photos must be under 15 MB — this one is ${formatFileSize(file.size)}.`);
      track("listing_photo_upload_failed", { reason: "image_too_large" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    photoPreviewUrlsRef.current.push(previewUrl);
    setStepError("");
    setPhotoFiles((current) => ({
      ...current,
      [label]: { name: file.name, previewUrl, file, isVideo: false, isCompressing: true },
    }));
    track("listing_photo_uploaded", { type: "image" });

    // Compress in the background so the pick interaction never waits on it.
    // The slot keeps the original until compression finishes (or is skipped).
    void compressImageFile(file)
      .then((compressed) => {
        setPhotoFiles((current) => {
          const slot = current[label];
          if (!slot || slot.file !== file) return current;
          return { ...current, [label]: { ...slot, file: compressed, isCompressing: false } };
        });
      })
      .catch(() => {
        // Keep the original when compression fails — upload still works.
        setPhotoFiles((current) => {
          const slot = current[label];
          if (!slot || slot.file !== file) return current;
          return { ...current, [label]: { ...slot, isCompressing: false } };
        });
      });
  };

  const handleDocumentUpload = (label: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDocumentFiles((current) => ({ ...current, [label]: { name: file.name, file } }));
    track("listing_kyc_uploaded", { document: label });
  };

  const handleSubmitListing = async () => {
    if (isSubmittingListing) return;
    setSubmissionError("");
    track("listing_submit_clicked");
    if (await isGuestLoginRequired()) {
      setLoginGate(true);
      return;
    }
    if (isAuthBypassEnabled()) {
      setIsSubmittingListing(true);
      try {
        const listingId = crypto.randomUUID();
        const listing = {
          id: listingId,
          title: `${selectedSpaceType.replace(/-/g, " ")} in ${city || selectedLocation.city || "Kanpur"}`,
          description,
          city: city || selectedLocation.city || "Kanpur",
          address,
          status: "pending_review" as const,
          property_type: selectedSpaceType,
          floor_level: selectedFloor,
          area_value: Number(spaceArea.replace(/,/g, "")) || null,
          area_unit: spaceAreaUnit,
          length: Number(length) || null,
          breadth: Number(breadth) || null,
          height: Number(height) || null,
          dimension_unit: dimensionUnit,
          temperature: Number(temperature) || null,
          temperature_unit: temperatureUnit,
          usage_types: selectedUsages,
          loading_features: selectedLoadingFeatures,
          price_amount: Number(rate.replace(/,/g, "")) || 0,
          price_model: priceModel,
          security_amount: Number(securityAmount.replace(/,/g, "")) || 0,
          // A ₹0 deposit stores no refund timeline (handoff §8.3/§8.4).
          refund_within_days: securityAmount && Number(securityAmount.replace(/,/g, "")) > 0 && refundDays ? Number(refundDays) : null,
          min_booking_days: durationDays(minimumBookingDuration, minimumBookingCustomDays) ?? 45,
          max_booking_days: durationDays(maximumBookingDuration, maximumBookingCustomDays),
          area_overridden: areaOverridden,
          pincode: pincode || null,
          state: state || "Uttar Pradesh",
          access_instructions: accessInstructions || null,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          amenities: selectedAmenities,
          availability_days: availabilityDays,
          listing_photos: [],
          created_at: new Date().toISOString(),
        };
        savePreviewListing(listing);
        clearListingDraft();
        setDraftListingId(null);
        track("listing_submit_success", { mode: "preview" });
        router.replace(`/owner/submitted/${encodeURIComponent(listingId)}`);
      } catch (error) {
        setSubmissionError(error instanceof Error ? error.message : "Could not open the listing preview.");
        track("listing_submit_failed", { mode: "preview" });
      } finally {
        setIsSubmittingListing(false);
      }
      return;
    }

    const photos = Object.entries(photoFiles);
    const documents = Object.entries(documentFiles);
    const photoCount = photos.filter(([, photo]) => !photo.isVideo).length;
    if (photos.length < LISTING_MIN_MEDIA || photoCount < LISTING_MIN_IMAGES) {
      setSubmissionError("Add at least 2 space photos before submitting.");
      return;
    }
    if (!documentFiles["Aadhaar Card"]) {
      setSubmissionError("Upload your Aadhaar card before submitting.");
      return;
    }

    setIsSubmittingListing(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sign in before submitting a listing.");

      let listingId = draftListingId;
      if (!listingId) {
        const response = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyType: selectedSpaceType,
            floorLevel: selectedFloor,
            areaValue: spaceArea,
            areaUnit: spaceAreaUnit,
            description,
            usageTypes: selectedUsages,
            length,
            breadth,
            height,
            dimensionUnit,
            temperature,
            temperatureUnit,
            loadingFeatures: selectedLoadingFeatures,
            amenities: selectedAmenities,
            priceModel,
            rate: rate.replace(/,/g, ""),
            securityAmount: securityAmount.replace(/,/g, ""),
            refundDays,
            availabilityDays,
            minimumBookingDays: durationDays(minimumBookingDuration, minimumBookingCustomDays) ?? 45,
            maximumBookingDays: durationDays(maximumBookingDuration, maximumBookingCustomDays),
            areaOverridden,
            address,
            pincode,
            city: city || selectedLocation.city || "Kanpur",
            state: state || "Uttar Pradesh",
            accessInstructions,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          }),
        });
        const result = await response.json() as { listing?: { id?: string }; error?: string };
        if (!response.ok || !result.listing?.id) throw new Error(result.error || "Could not save this listing.");
        listingId = result.listing.id;
        setDraftListingId(listingId);
      }

      const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "upload";
      const photoMetadata = [];
      for (const [index, [label, photo]] of photos.entries()) {
        const storagePath = `${user.id}/${listingId}/${crypto.randomUUID()}-${safeFileName(photo.name)}`;
        const bucket = photo.isVideo ? "listing-videos" : "listing-photos";
        const { error } = await supabase.storage.from(bucket).upload(storagePath, photo.file, {
          contentType: photo.file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        photoMetadata.push({ storagePath, label, position: index, mediaType: photo.isVideo ? "video" : "image" });
      }

      const documentMetadata = [];
      for (const [documentType, document] of documents) {
        const storagePath = `${user.id}/${listingId}/${crypto.randomUUID()}-${safeFileName(document.name)}`;
        const { error } = await supabase.storage.from("kyc-documents").upload(storagePath, document.file, {
          contentType: document.file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        documentMetadata.push({ storagePath, documentType });
      }

      const assetResponse = await fetch(`/api/listings/${listingId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: photoMetadata, documents: documentMetadata }),
      });
      const assetResult = await assetResponse.json() as { error?: string };
      if (!assetResponse.ok) throw new Error(assetResult.error || "Could not save uploaded file details.");

      const submitResponse = await fetch(`/api/listings/${listingId}/submit`, { method: "POST" });
      const submitResult = await submitResponse.json() as { listing?: { id?: string }; error?: string };
      if (!submitResponse.ok || !submitResult.listing?.id) {
        throw new Error(submitResult.error || "Could not submit this listing.");
      }
      clearListingDraft();
      setDraftListingId(null);
      track("listing_submit_success");
      router.replace(`/owner/submitted/${encodeURIComponent(submitResult.listing.id)}`);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Could not submit this listing.");
      track("listing_submit_failed");
    } finally {
      setIsSubmittingListing(false);
    }
  };

  const handleNext = async () => {
    const step = currentStep;
    const errors = validateCurrentStep();
    if (Object.keys(errors).length) {
      setStepErrors(errors);
      setStepError("");
      setErrorRevealTick((tick) => tick + 1);
      track("listing_step_validation_failed", { step });
      return;
    }
    setStepErrors({});
    setStepError("");

    // Editing from Review: Save & Continue returns straight to Review (§11).
    if (editingFromReview === step) {
      if (!(await persistStep(step, true))) return;
      setShowReview(true);
      track("listing_step_saved", { step });
      return;
    }

    if (step >= totalSteps) {
      if (!(await persistStep(step, true))) return;
      setShowReview(true);
      track("listing_review_viewed");
      return;
    }

    if (!(await persistStep(step + 1, false))) return;
    setCurrentStep((current) => Math.min(current + 1, totalSteps));
    track("listing_step_saved", { step });
  };

  const handleBack = () => {
    // Best-effort save so backing out of the wizard never loses progress.
    saveListingDraft(snapshotDraft(currentStep, showReview));

    if (showReview) {
      setShowReview(false);
      return;
    }

    // Backing out of a review detour resumes normal step chaining.
    if (editingFromReview === currentStep) setEditingFromReview(null);

    if (currentStep === 1) {
      router.push("/role-selection");
      return;
    }

    setStepErrors({});
    setStepError("");
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleReview = async () => {
    const errors = validateStep6({ address, city, state });
    if (Object.keys(errors).length) {
      setStepErrors(errors);
      setStepError("");
      setErrorRevealTick((tick) => tick + 1);
      track("listing_step_validation_failed", { step: 6 });
      return;
    }
    setStepErrors({});
    setStepError("");
    if (!(await persistStep(6, true))) return;
    setShowReview(true);
    track("listing_step_saved", { step: 6 });
    track("listing_review_viewed");
  };

  const renderStep1 = () => (
    <>
      <section className="owner-intro">
        <h1>Apni jagah ki details</h1>
        <p>Listing details fill karien.</p>
      </section>

      <section className="owner-section">
        <h2>Space Type</h2>
        <div className="space-type-grid">
          {SPACE_TYPES.map((option) => {
            const isSelected = selectedSpaceType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`space-type-card ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                aria-invalid={Boolean(stepErrors.spaceType)}
                onClick={() => selectSpaceType(option.id)}
              >
                <span className="space-type-icon">
                  <SpaceTypeIcon type={option.icon} />
                </span>
                <span className="space-type-label">{option.label}</span>
              </button>
            );
          })}
        </div>
        {stepErrors.spaceType && <span className="owner-field-error" role="alert">{stepErrors.spaceType}</span>}
      </section>

      <div className="owner-form-row">
        <label className="owner-field owner-field-narrow">
          <span className="field-label">
            Floor Level<span className="field-required">*</span>
          </span>
          <div className="field-input field-select owner-native-select-wrap">
            <select
              className={`owner-native-select ${selectedFloor ? "selected" : ""}`}
              value={selectedFloor}
              onChange={(event) => {
                setSelectedFloor(event.target.value);
                clearFieldError("floor");
              }}
              aria-label="Floor level"
              aria-invalid={Boolean(stepErrors.floor)}
              aria-describedby={stepErrors.floor ? "floor-error" : undefined}
              required
            >
              <option value="" disabled>Select floor</option>
              {FLOOR_OPTIONS.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
            </select>
            <svg viewBox="0 0 24 24" className="field-chevron" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          {stepErrors.floor && <span id="floor-error" className="owner-field-error" role="alert">{stepErrors.floor}</span>}
        </label>

        <label className="owner-field owner-field-wide">
          <span className="field-label">
            Space Area<span className="field-required">*</span>
          </span>
          <div className="field-input owner-area-input">
            <input
              type="text"
              value={spaceArea}
              onChange={(event) => {
                setSpaceArea(event.target.value);
                clearFieldError("area");
              }}
              aria-label="Space area"
              aria-invalid={Boolean(stepErrors.area)}
              aria-describedby={stepErrors.area ? "area-error" : undefined}
            />
            <div className="owner-area-unit-wrap">
              <select
                className="owner-area-unit-select"
                value={spaceAreaUnit}
                onChange={(event) => changeSpaceAreaUnit(event.target.value as SpaceAreaUnit)}
                aria-label="Space area unit"
              >
                {SPACE_AREA_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              <svg viewBox="0 0 24 24" className="owner-area-chevron-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </label>
      </div>

      <label className="owner-field owner-textarea-block">
        <span className="field-label">
          Space Description<span className="field-required">*</span>
        </span>
        <div className="owner-textarea-wrap">
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value.slice(0, 300));
              clearFieldError("description");
            }}
            placeholder="Write your space’s description"
            maxLength={300}
            aria-label="Space description"
            aria-invalid={Boolean(stepErrors.description)}
            aria-describedby={stepErrors.description ? "description-error" : undefined}
          />
          <div className="owner-char-counter">{descriptionLength}/300</div>
          {stepErrors.description && <span id="description-error" className="owner-field-error" role="alert">{stepErrors.description}</span>}
        </div>
      </label>

      <section className="owner-usage-section">
        <h3>Space ka istemaal kaise kr saktein hai ?</h3>
        <div className="usage-chips">
          {USAGE_OPTIONS.map((option) => {
            const isSelected = selectedUsages.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={`usage-chip ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  toggleUsage(option);
                  clearFieldError("usage");
                }}
                aria-pressed={isSelected}
                aria-invalid={Boolean(stepErrors.usage)}
              >
                {option}
              </button>
            );
          })}
        </div>
        {stepErrors.usage && <span className="owner-field-error" role="alert">{stepErrors.usage}</span>}
      </section>

      {stepBanner && currentStep === 1 && <p className="owner-field-error owner-step-error" role="alert">{stepBanner}</p>}
      <button type="button" className="owner-cta" onClick={handleNext} disabled={isSavingStep}>
        {isSavingStep ? "Saving…" : "Save & Continue"}
      </button>
    </>
  );

  const renderStep2 = () => (
    <>
      <section className="owner-intro owner-step-two-intro">
        <h1>Apni jagah ki naap.</h1>
      </section>

      <div className="owner-dimension-grid">
        <div className="owner-dimension-field">
          <label className="owner-dimension-label">Length*</label>
          <div className="owner-input-box">
            <input
              type="text"
              inputMode="decimal"
              value={length}
              onChange={(event) => {
                setLength(event.target.value);
                clearFieldError("dimensions");
              }}
              placeholder="Enter"
              aria-label="Length"
              aria-invalid={Boolean(stepErrors.dimensions)}
            />
          </div>
        </div>
        <div className="owner-dimension-field">
          <label className="owner-dimension-label">Breadth*</label>
          <div className="owner-input-box">
            <input
              type="text"
              inputMode="decimal"
              value={breadth}
              onChange={(event) => {
                setBreadth(event.target.value);
                clearFieldError("dimensions");
              }}
              placeholder="Enter"
              aria-label="Breadth"
              aria-invalid={Boolean(stepErrors.dimensions)}
            />
          </div>
        </div>
        <div className="owner-dimension-field">
          <label className="owner-dimension-label">Height*</label>
          <div className="owner-input-box">
            <input
              type="text"
              inputMode="decimal"
              value={height}
              onChange={(event) => {
                setHeight(event.target.value);
                clearFieldError("height");
              }}
              placeholder="Enter"
              aria-label="Height"
              aria-invalid={Boolean(stepErrors.height)}
            />
          </div>
        </div>
        <div className="owner-dimension-field owner-dimension-field-unit">
          <label className="owner-dimension-label">Unit</label>
          <div className="owner-input-box owner-input-box--unit">
            <select
              className="owner-unit-select"
              value={dimensionUnit}
              onChange={(event) => changeDimensionUnit(event.target.value as DimensionUnit)}
              aria-label="Dimension unit"
            >
              {DIMENSION_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke={accentPurple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>
      {stepErrors.dimensions && <span className="owner-field-error" role="alert">{stepErrors.dimensions}</span>}

      <div className="owner-total-area-card">
        {areaOverrideActive ? (
          <div className="owner-total-area-override">
            <input
              type="text"
              inputMode="decimal"
              className="owner-total-area-input"
              value={spaceArea}
              onChange={(event) => {
                setSpaceArea(event.target.value);
                setAreaOverridden(true);
                clearFieldError("area");
              }}
              onBlur={() => setAreaOverrideActive(false)}
              autoFocus
              aria-label={`Total area override in ${spaceAreaUnit}`}
              placeholder="Enter total area"
            />
            <button type="button" className="owner-total-area-done" onClick={() => setAreaOverrideActive(false)}>
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="owner-total-area-main owner-total-area-tap"
            onClick={() => setAreaOverrideActive(true)}
            aria-label={areaOverridden ? "Total area manually set, tap to edit" : "Total area auto-calculated, tap to override"}
          >
            Total Area : {areaOverridden ? `${spaceArea || "—"} ${spaceAreaUnit}` : areaValue}
          </button>
        )}
        <div className="owner-total-area-sub">
          {areaOverridden ? "Manually set · Tap to edit*" : "Auto-Calculated Tap to Override*"}
        </div>
      </div>

      {showTemperatureFields && (
        <div className="owner-temperature-row">
          <div className="owner-temperature-field">
            <label className="owner-dimension-label">Temperature*</label>
            <div className="owner-input-box owner-input-box--wide">
              <input type="text" value={temperature} onChange={(event) => setTemperature(event.target.value)} placeholder="Enter" aria-label="Temperature" />
            </div>
          </div>
          <div className="owner-dimension-field owner-dimension-field-unit owner-temp-select">
            <label className="owner-dimension-label">Unit</label>
            <div className="owner-input-box owner-input-box--unit">
              <select
                className="owner-unit-select"
                value={temperatureUnit}
                onChange={(event) => changeTemperatureUnit(event.target.value as TemperatureUnit)}
                aria-label="Temperature unit"
              >
                {TEMPERATURE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke={accentPurple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      )}

      <div className="owner-access-loading">Accessing &amp; Loading features</div>

      <div className="owner-feature-chips">
        {LOADING_FEATURES.map((feature) => {
          const isSelected = selectedLoadingFeatures.includes(feature);

          return (
            <button
              key={feature}
              type="button"
              className={`feature-chip ${isSelected ? "selected" : ""}`}
              onClick={() => toggleLoadingFeature(feature)}
              aria-pressed={isSelected}
            >
              {isSelected && <span className="feature-check">✓</span>}
              {feature}
            </button>
          );
        })}
      </div>

      {stepBanner && currentStep === 2 && <p className="owner-field-error owner-step-error" role="alert">{stepBanner}</p>}
      <button type="button" className="owner-cta owner-cta--step-2" onClick={handleNext} disabled={isSavingStep}>
        {isSavingStep ? "Saving…" : "Save & Continue"}
      </button>
    </>
  );

  const renderStep3 = () => {
    const amenityCount = selectedAmenities.length;

    return (
      <>
        <section className="owner-intro owner-step-three-intro">
          <h1>Amenities &amp; Features</h1>
          <p>More amenities = more bookings &amp; higher price.</p>
        </section>

        <div className="owner-amenity-groups">
          <div className="owner-amenity-group">
            <h3>Security</h3>
            <div className="owner-amenity-chips">
              {SECURITY_AMENITIES.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    className={`amenity-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleAmenity(amenity)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <span className="feature-check">✓</span>}
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="owner-amenity-group">
            <h3>Utilities</h3>
            <div className="owner-amenity-chips">
              {UTILITY_AMENITIES.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    className={`amenity-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleAmenity(amenity)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <span className="feature-check">✓</span>}
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="owner-amenity-group">
            <h3>Logistics</h3>
            <div className="owner-amenity-chips">
              {LOGISTICS_AMENITIES.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    className={`amenity-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleAmenity(amenity)}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <span className="feature-check">✓</span>}
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="owner-summary-bar">
          <span className="owner-summary-icon">i</span>
          <span>
            {amenityCount} amenities selected · Tap any item to toggle
          </span>
        </div>

        <button type="button" className="owner-cta owner-cta--step-3" onClick={handleNext} disabled={isSavingStep}>
          {isSavingStep ? "Saving…" : "Save & Continue"}
        </button>
      </>
    );
  };

  const renderStep4 = () => (
    <PricingAvailabilityStep
      values={step4Values}
      onChange={setStep4Values}
      onContinue={handleNext}
      saving={isSavingStep}
    />
  );

  const renderStep5 = () => (
    <>
      <section className="owner-intro owner-step-five-intro">
        <h1>Photos or KYC Upload krien.</h1>
        <p>Show renters your space</p>
      </section>

      <div className="owner-helper-banner">
        <span className="owner-helper-icon">
          <Info size={14} />
        </span>
        <span>Take clear, wide shots showing your space, access roads &amp; safety gear. Add a walkthrough video (under 10 MB) for faster approvals.</span>
      </div>

      <section className="owner-upload-section">
        <h2>Space Photos &amp; Videos</h2>
        <p className="owner-upload-count" role="status">
          {imageCount} of {PHOTO_OPTIONS.length} photos added · minimum {LISTING_MIN_IMAGES}
        </p>
        <div className="owner-upload-grid">
          {PHOTO_OPTIONS.map((photo) => {
            const inputId = `photo-upload-${photo}`;
            const selectedPhoto = photoFiles[photo];
            return (
              <div key={photo} className="owner-upload-card-wrap">
                <input id={inputId} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={(event) => handleUpload(photo, event)} hidden />
                <button
                  type="button"
                  className={`owner-upload-card ${selectedPhoto ? "owner-upload-card--filled" : ""}`}
                  onClick={() => document.getElementById(inputId)?.click()}
                >
                  {selectedPhoto ? (
                    <>
                      {selectedPhoto.isVideo ? (
                        <video src={selectedPhoto.previewUrl} className="owner-upload-preview owner-upload-video-preview" muted playsInline />
                      ) : (
                        <img src={selectedPhoto.previewUrl} alt={`${photo} preview`} className="owner-upload-preview" />
                      )}
                      <span className="owner-upload-file-name">{selectedPhoto.name}</span>
                      {selectedPhoto.isCompressing && <span className="owner-upload-processing">Processing…</span>}
                    </>
                  ) : (
                    <>
                      <span className="owner-upload-icon">
                        <ImageUp size={28} />
                      </span>
                      <span className="owner-upload-label">{photo}</span>
                    </>
                  )}
                </button>
                {selectedPhoto && (
                  <button
                    type="button"
                    className="owner-upload-remove"
                    aria-label={`Remove ${photo}`}
                    onClick={() => removePhoto(photo)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="owner-upload-section owner-upload-section--documents">
        <h2>Upload KYC Documents</h2>
        <p className="owner-upload-count">Aadhaar card is required · other documents are optional</p>
        <div className="owner-doc-list">
          {DOCUMENT_OPTIONS.map((documentName) => {
            const inputId = `doc-upload-${documentName}`;
            const selectedDocument = documentFiles[documentName];
            return (
              <div key={documentName} className="owner-doc-row-wrap">
                <input id={inputId} type="file" accept="image/*,application/pdf" onChange={(event) => handleDocumentUpload(documentName, event)} hidden />
                <button type="button" className="owner-doc-row" onClick={() => document.getElementById(inputId)?.click()}>
                  <span className="owner-doc-left">
                    <span className="owner-doc-icon">
                      <FileText size={18} />
                    </span>
                    <span className="owner-doc-name">{documentName}</span>
                  </span>
                  <span className={`owner-doc-required ${selectedDocument ? "" : documentName === "Aadhaar Card" ? "owner-doc-required--mandatory" : "owner-doc-required--optional"}`}>
                    {selectedDocument ? selectedDocument.name : documentName === "Aadhaar Card" ? "Required" : "Optional"}
                  </span>
                </button>
                {selectedDocument && (
                  <button
                    type="button"
                    className="owner-upload-remove"
                    aria-label={`Remove ${documentName}`}
                    onClick={() => removeDocument(documentName)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {stepBanner && currentStep === 5 && <p className="owner-field-error owner-step-error" role="alert">{stepBanner}</p>}
      <PrimaryButton type="button" className="owner-cta owner-cta--step-5" onClick={handleNext} disabled={isSavingStep}>
        {isSavingStep ? "Saving…" : "Save & Continue"}
      </PrimaryButton>
    </>
  );

  const renderStep6 = () => (
    <>
      <section className="owner-intro owner-step-six-intro">
        <h1>Apke Space ki Location &amp; Access</h1>
        <p>Help renters find your space.</p>
      </section>

      <section className="owner-upload-section owner-upload-section--map">
        <h2>Location Map</h2>
        <div className="owner-location-map-wrap">
          <LocationMap
            center={[MAP_CONFIG.defaultCenter[0], MAP_CONFIG.defaultCenter[1]]}
            selectedLocation={selectedLocation}
            onMapReady={(map) => {
              mapApiRef.current = map;
              map.invalidateSize();
            }}
            onMarkerDragEnd={(latitude, longitude) => {
              setSelectedLocation((current) => ({ ...current, latitude, longitude }));
            }}
          />
          <div className="owner-map-zoom-controls" aria-label="Map controls">
            <button type="button" aria-label="Zoom in" onClick={() => mapApiRef.current?.zoomIn()}>
              <span>+</span>
            </button>
            <div className="owner-map-zoom-divider" />
            <button type="button" aria-label="Zoom out" onClick={() => mapApiRef.current?.zoomOut()}>
              <span>−</span>
            </button>
          </div>
        </div>
      </section>

      <div className="owner-helper-banner owner-helper-banner--purple">
        <span className="owner-helper-icon">
          <MapPin size={14} />
        </span>
        <span>Drag pin to exact entrance · Long-press to reposition</span>
      </div>

      <label className="owner-form-field owner-form-field--block">
        <span className="field-label">Full Address*</span>
        <input
          type="text"
          className="owner-address-input"
          value={address}
          onChange={(event) => {
            setAddress(event.target.value);
            clearFieldError("address");
          }}
          placeholder="JS Cold Storage, 16/80 1, Civil Lines, Kanpur-208001..."
          aria-invalid={Boolean(stepErrors.address)}
          aria-describedby={stepErrors.address ? "address-error" : undefined}
        />
        {stepErrors.address && <span id="address-error" className="owner-field-error" role="alert">{stepErrors.address}</span>}
      </label>

      <div className="owner-location-row">
        <label className="owner-form-field">
          <span className="field-label">Pincode*</span>
          <input type="text" className="owner-mini-input" value={pincode} onChange={(event) => setPincode(event.target.value)} placeholder="Enter" />
        </label>
        <label className="owner-form-field">
          <span className="field-label">City*</span>
          <input
            type="text"
            className="owner-mini-input"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              clearFieldError("cityState");
            }}
            placeholder="Enter"
            aria-invalid={Boolean(stepErrors.cityState)}
          />
        </label>
        <label className="owner-form-field">
          <span className="field-label">State*</span>
          <input
            type="text"
            className="owner-mini-input"
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              clearFieldError("cityState");
            }}
            placeholder="Enter"
            aria-invalid={Boolean(stepErrors.cityState)}
          />
        </label>
      </div>
      {stepErrors.cityState && <span className="owner-field-error" role="alert">{stepErrors.cityState}</span>}

      <label className="owner-form-field owner-form-field--block">
        <span className="field-label">Access Instructions for Renters</span>
        <div className="owner-textarea-wrap owner-textarea-wrap--small">
          <textarea
            value={accessInstructions}
            onChange={(event) => setAccessInstructions(event.target.value.slice(0, 300))}
            placeholder="Enter access instructions"
            maxLength={300}
          />
          <div className="owner-char-counter">{accessLength}/300</div>
        </div>
      </label>

      {stepBanner && currentStep === 6 && !showReview && <p className="owner-field-error owner-step-error" role="alert">{stepBanner}</p>}
      <PrimaryButton type="button" className="owner-cta owner-cta--step-6" onClick={handleReview} disabled={isSavingStep}>
        {isSavingStep ? "Saving…" : "Review Listing"}
      </PrimaryButton>
    </>
  );

  const renderStepReview = () => (
    <div className="owner-preview-screen">
      <div className="owner-preview-header">
        <button type="button" className="owner-review-back-button" aria-label="Go back" onClick={handleBack}>
          <ArrowLeft size={22} strokeWidth={2.6} />
        </button>
        <div className="owner-review-header-text">Almost Done! Bass Ho hi gya</div>
      </div>

      <div className="owner-progress owner-progress--review" aria-label="Progress bar">
        <span className="owner-progress-track" />
        <span className="owner-progress-fill owner-progress-fill--review" style={{ width: "97%" }} />
      </div>

      <section className="owner-preview-copy">
        <h1>Preview &amp; Review</h1>
        <p>How renters will see your space listing</p>
      </section>

      <article className="owner-preview-card">
        <div className="owner-preview-image-wrap">
          {previewPhoto ? (
            previewPhoto.isVideo ? (
              <video src={previewPhoto.previewUrl} className="owner-preview-image" muted playsInline aria-label="Property image" />
            ) : (
              <img src={previewPhoto.previewUrl} alt="Property preview" className="owner-preview-image" />
            )
          ) : (
            <div className="owner-preview-image" aria-label="Property image" />
          )}
          <div className="owner-preview-badges">
            <span className="owner-preview-badge owner-preview-badge--instant">
              <span className="owner-preview-badge-icon">⚡</span>
              <span>Instant</span>
            </span>
          </div>
        </div>

        <div className="owner-preview-content">
          <h2>{previewTitle}</h2>
          <p>{description.trim() || "No description yet."}</p>

          <div className="owner-preview-tags">
            {previewTags.map((tag) => (
              <span key={tag} className="owner-preview-tag">{tag}</span>
            ))}
          </div>

          <div className="owner-preview-price-row">
            <div className="owner-preview-price-wrap">
              <span className="owner-preview-price">₹{formatINR(Number(rate.replace(/,/g, "")) || 0)}</span>
              <span className="owner-preview-price-unit">/{priceModel === "Per Month" ? "Month" : "Week"}</span>
            </div>
            <button type="button" className="owner-preview-book-button" aria-hidden="true" tabIndex={-1}>Book</button>
          </div>
        </div>
      </article>

      <section className="owner-checklist-section">
        <h3>Listing Checklist</h3>
        <div className="owner-checklist-grid">
          <ul className="owner-checklist-col">
            <li><button type="button" onClick={() => editSection(1)} aria-label="Edit Property Details"><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span className="owner-checklist-copy">Property Details</span></button></li>
            <li><button type="button" onClick={() => editSection(3)} aria-label="Edit Amenities and Features"><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span className="owner-checklist-copy">Amenities &amp; Features</span></button></li>
            <li><button type="button" onClick={() => editSection(5)} aria-label="Edit Photos and KYC Upload"><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span className="owner-checklist-copy">Photos &amp; KYC Upload</span></button></li>
          </ul>
          <ul className="owner-checklist-col">
            <li><button type="button" onClick={() => editSection(2)} aria-label="Edit Property Dimensions"><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span className="owner-checklist-copy">Property Dimensions</span></button></li>
            <li><button type="button" onClick={() => editSection(4)} aria-label="Edit Pricing Details"><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span className="owner-checklist-copy">Pricing Details</span></button></li>
            <li><button type="button" onClick={() => editSection(6)} aria-label="Edit Location and Access Details"><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span className="owner-checklist-copy">Location &amp; Access Details</span></button></li>
          </ul>
        </div>
      </section>

      <button type="button" className="owner-edit-bar" aria-label="Edit any section" onClick={() => editSection(1)}>
        <span className="owner-edit-bar-copy">Edit any section before submitting</span>
        <span className="owner-edit-bar-action"><Pencil size={15} /> Edit</span>
      </button>

      {submissionError && <p className="auth-error" role="alert">{submissionError}</p>}
      <button type="button" className="owner-submit-button" onClick={handleSubmitListing} disabled={isSubmittingListing}>
        {isSubmittingListing ? "Submitting..." : "Submit your Listing"}
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    if (currentStep === 1) return renderStep1();
    if (currentStep === 2) return renderStep2();
    if (currentStep === 3) return renderStep3();
    if (currentStep === 4) return renderStep4();
    if (currentStep === 5) return renderStep5();
    if (currentStep === 6) return renderStep6();
    return renderStep1();
  };

  return (
    <main
      className="owner-page"
      onClickCapture={() => {
        hasInteractedRef.current = true;
      }}
      onChangeCapture={() => {
        hasInteractedRef.current = true;
      }}
    >
      <div className="owner-shell">
        <header className="owner-status-bar" aria-label="Status bar">
          <span className="owner-status-time">9:30</span>
          <div className="owner-status-icons" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="status-wifi" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8.5c5-5 15-5 20 0" />
              <path d="M5.5 11.5c3.2-3.2 9.8-3.2 13 0" />
              <path d="M9 15c1.6-1.6 4.4-1.6 6 0" />
              <circle cx="12" cy="18.5" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            <svg viewBox="0 0 24 24" className="status-signal" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 16.5V10" />
              <path d="M10 16.5V7" />
              <path d="M15 16.5V4.5" />
              <path d="M20 16.5V13" />
            </svg>
            <svg viewBox="0 0 24 24" className="status-battery" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7.5" width="17" height="9" rx="2.2" />
              <path d="M20 10.5h2.2v3H20" />
              <path d="M7 11.5h10v1H7z" />
            </svg>
          </div>
        </header>

        {!showReview && (
          <>
            <div className="owner-header">
              <button type="button" className="owner-back-button" aria-label="Go back" onClick={handleBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.5 5.5 7 12l7.5 6.5" />
                </svg>
              </button>
              <div className="owner-step-indicator">Step {currentStep}/{totalSteps}</div>
            </div>

            <div className="owner-progress" aria-label="Progress bar">
              <span className="owner-progress-track" />
              <span className="owner-progress-fill" style={{ width: progressWidth }} />
            </div>

            {draftNotice && <p className="owner-draft-notice" role="status">{draftNotice}</p>}
          </>
        )}

        {showReview ? renderStepReview() : renderCurrentStep()}
      </div>

      {loginGate && (
        <LoginGateModal
          title="Continue with listing"
          description="Please log in to submit your listing. Continue with Google and you'll pick up right where you left off."
          nextPath="/owner"
          onClose={() => setLoginGate(false)}
        />
      )}
    </main>
  );
}
