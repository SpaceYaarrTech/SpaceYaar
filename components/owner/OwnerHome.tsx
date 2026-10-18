"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, ImageUp, Info, MapPin, Pencil, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { PricingAvailabilityStep } from "@/components/owner/PricingAvailabilityStep";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { MAP_CONFIG } from "@/lib/maps/map-config";
import type { LocationSearchResult } from "@/lib/maps/geocoding";
import { createClient } from "@/lib/supabase/client";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { savePreviewListing } from "@/lib/owner/host-data";

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

  const [selectedSpaceType, setSelectedSpaceType] = useState("cold-storage");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [floorError, setFloorError] = useState("");
  const [spaceArea, setSpaceArea] = useState("2,700");
  const [spaceAreaUnit, setSpaceAreaUnit] = useState<SpaceAreaUnit>("Sq. Feet");
  const [description, setDescription] = useState("");
  const [selectedUsages, setSelectedUsages] = useState<string[]>(["General"]);

  const [length, setLength] = useState("20");
  const [breadth, setBreadth] = useState("40");
  const [height, setHeight] = useState("");
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>("Ft");
  const [temperature, setTemperature] = useState("");
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>("Celsius");
  const [selectedLoadingFeatures, setSelectedLoadingFeatures] = useState<string[]>([
    "24/7 CCTV Camera",
    "Loading Dock",
    "E-Forklift Ready",
    "Security Guard",
  ]);

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    ...SECURITY_AMENITIES,
    ...UTILITY_AMENITIES,
    ...LOGISTICS_AMENITIES,
  ]);

  const [priceModel, setPriceModel] = useState("Per Day");
  const [rate, setRate] = useState("");
  const [securityAmount, setSecurityAmount] = useState("");
  const [refundDays, setRefundDays] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [minimumBookingDuration, setMinimumBookingDuration] = useState("3 Days");

  const [photoFiles, setPhotoFiles] = useState<Record<string, { name: string; previewUrl: string; file: File }>>({});
  const [documentFiles, setDocumentFiles] = useState<Record<string, { name: string; file: File }>>({});
  const [draftListingId, setDraftListingId] = useState<string | null>(null);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [address, setAddress] = useState("JS Cold Storage, 16/80 1, Civil Lines, Kanpur-208001...");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [accessInstructions, setAccessInstructions] = useState("");

  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult>(defaultLocation);
  const mapApiRef = useRef<any>(null);
  const photoPreviewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
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
        setSelectedLocation(defaultLocation);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  }, []);

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

  useEffect(() => () => {
    photoPreviewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, []);

  const handleUpload = (label: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    photoPreviewUrlsRef.current.push(previewUrl);
    setPhotoFiles((current) => ({
      ...current,
      [label]: { name: file.name, previewUrl, file },
    }));
  };

  const handleDocumentUpload = (label: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDocumentFiles((current) => ({ ...current, [label]: { name: file.name, file } }));
  };

  const toggleAvailabilityDay = (day: string) => {
    setAvailabilityDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const handleSubmitListing = async () => {
    if (isSubmittingListing) return;
    setSubmissionError("");
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
          price_amount: Number(rate) || 0,
          price_model: priceModel,
          security_amount: Number(securityAmount) || 0,
          refund_within_days: Number(refundDays) || 1,
          min_booking_days: minimumBookingDuration === "1 Week" ? 7 : minimumBookingDuration === "3 Days" ? 3 : 1,
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
        setDraftListingId(null);
        router.replace(`/owner/submitted/${encodeURIComponent(listingId)}`);
      } catch (error) {
        setSubmissionError(error instanceof Error ? error.message : "Could not open the listing preview.");
      } finally {
        setIsSubmittingListing(false);
      }
      return;
    }

    const photos = Object.entries(photoFiles);
    const documents = Object.entries(documentFiles);
    if (!photos.length || !documents.length) {
      setSubmissionError("Add at least one space photo and one KYC document before submitting.");
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
            rate,
            securityAmount,
            refundDays,
            availabilityDays,
            minimumBookingDuration,
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
        const { error } = await supabase.storage.from("listing-photos").upload(storagePath, photo.file, {
          contentType: photo.file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        photoMetadata.push({ storagePath, label, position: index });
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
      setDraftListingId(null);
      router.replace(`/owner/submitted/${encodeURIComponent(submitResult.listing.id)}`);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Could not submit this listing.");
    } finally {
      setIsSubmittingListing(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedFloor) {
      setFloorError("Select a floor level to continue.");
      return;
    }

    if (currentStep >= totalSteps) {
      setShowReview(true);
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, totalSteps));
  };

  const handleBack = () => {
    if (showReview) {
      setShowReview(false);
      return;
    }

    if (currentStep === 1) {
      router.push("/role-selection");
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleReview = () => {
    setShowReview(true);
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
                onClick={() => setSelectedSpaceType(option.id)}
              >
                <span className="space-type-icon">
                  <SpaceTypeIcon type={option.icon} />
                </span>
                <span className="space-type-label">{option.label}</span>
              </button>
            );
          })}
        </div>
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
                setFloorError("");
              }}
              aria-label="Floor level"
              required
            >
              <option value="" disabled>Select floor</option>
              {FLOOR_OPTIONS.map((floor) => <option key={floor} value={floor}>{floor}</option>)}
            </select>
            <svg viewBox="0 0 24 24" className="field-chevron" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          {floorError && <span className="owner-field-error" role="alert">{floorError}</span>}
        </label>

        <label className="owner-field owner-field-wide">
          <span className="field-label">
            Space Area<span className="field-required">*</span>
          </span>
          <div className="field-input owner-area-input">
            <input
              type="text"
              value={spaceArea}
              onChange={(event) => setSpaceArea(event.target.value)}
              aria-label="Space area"
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
            onChange={(event) => setDescription(event.target.value.slice(0, 300))}
            placeholder="Write your space’s description"
            maxLength={300}
            aria-label="Space description"
          />
          <div className="owner-char-counter">{descriptionLength}/300</div>
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
                onClick={() => toggleUsage(option)}
                aria-pressed={isSelected}
              >
                {option}
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" className="owner-cta" onClick={handleNext}>
        Save &amp; Continue
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
            <input type="text" value={length} onChange={(event) => setLength(event.target.value)} placeholder="Enter" />
          </div>
        </div>
        <div className="owner-dimension-field">
          <label className="owner-dimension-label">Breadth*</label>
          <div className="owner-input-box">
            <input type="text" value={breadth} onChange={(event) => setBreadth(event.target.value)} placeholder="Enter" />
          </div>
        </div>
        <div className="owner-dimension-field">
          <label className="owner-dimension-label">Height*</label>
          <div className="owner-input-box">
            <input type="text" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="Enter" />
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

      <div className="owner-total-area-card">
        <div className="owner-total-area-main">Total Area : {areaValue}</div>
        <div className="owner-total-area-sub">Auto-Calculated Tap to Override*</div>
      </div>

      <div className="owner-temperature-row">
        <div className="owner-temperature-field">
          <label className="owner-dimension-label">Temperature*</label>
          <div className="owner-input-box owner-input-box--wide">
            <input type="text" value={temperature} onChange={(event) => setTemperature(event.target.value)} placeholder="Enter" />
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

      <button type="button" className="owner-cta owner-cta--step-2" onClick={handleNext}>
        Save &amp; Continue
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

        <button type="button" className="owner-cta owner-cta--step-3" onClick={handleNext}>
          Save &amp; Continue
        </button>
      </>
    );
  };

  const renderStep4 = () => (
    <PricingAvailabilityStep
      priceModel={priceModel}
      rate={rate}
      securityAmount={securityAmount}
      refundDays={refundDays}
      availabilityDays={availabilityDays}
      minimumBookingDuration={minimumBookingDuration}
      onPriceModelChange={setPriceModel}
      onRateChange={setRate}
      onSecurityAmountChange={setSecurityAmount}
      onRefundDaysChange={setRefundDays}
      onAvailabilityDayToggle={toggleAvailabilityDay}
      onMinimumBookingDurationChange={setMinimumBookingDuration}
      onContinue={handleNext}
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
        <span>Take clear, wide shots showing your space, access roads &amp; safety gear.</span>
      </div>

      <section className="owner-upload-section">
        <h2>Space Photos</h2>
        <div className="owner-upload-grid">
          {PHOTO_OPTIONS.map((photo) => {
            const inputId = `photo-upload-${photo}`;
            const selectedPhoto = photoFiles[photo];
            return (
              <div key={photo} className="owner-upload-card-wrap">
                <input id={inputId} type="file" accept="image/*" onChange={(event) => handleUpload(photo, event)} hidden />
                <button
                  type="button"
                  className={`owner-upload-card ${selectedPhoto ? "owner-upload-card--filled" : ""}`}
                  onClick={() => document.getElementById(inputId)?.click()}
                >
                  {selectedPhoto ? (
                    <>
                      <img src={selectedPhoto.previewUrl} alt={`${photo} preview`} className="owner-upload-preview" />
                      <span className="owner-upload-file-name">{selectedPhoto.name}</span>
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
              </div>
            );
          })}
        </div>
      </section>

      <section className="owner-upload-section owner-upload-section--documents">
        <h2>Upload KYC Documents</h2>
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
                  <span className="owner-doc-required">{selectedDocument ? selectedDocument.name : "Required"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <PrimaryButton type="button" className="owner-cta owner-cta--step-5" onClick={handleNext}>
        Save &amp; Continue
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
          onChange={(event) => setAddress(event.target.value)}
          placeholder="JS Cold Storage, 16/80 1, Civil Lines, Kanpur-208001..."
        />
      </label>

      <div className="owner-location-row">
        <label className="owner-form-field">
          <span className="field-label">Pincode*</span>
          <input type="text" className="owner-mini-input" value={pincode} onChange={(event) => setPincode(event.target.value)} placeholder="Enter" />
        </label>
        <label className="owner-form-field">
          <span className="field-label">City*</span>
          <input type="text" className="owner-mini-input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Enter" />
        </label>
        <label className="owner-form-field">
          <span className="field-label">State*</span>
          <input type="text" className="owner-mini-input" value={state} onChange={(event) => setState(event.target.value)} placeholder="Enter" />
        </label>
      </div>

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

      <PrimaryButton type="button" className="owner-cta owner-cta--step-6" onClick={handleReview}>
        Review Listing
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
          <div className="owner-preview-image" aria-label="Property image" />
          <div className="owner-preview-badges">
            <span className="owner-preview-badge owner-preview-badge--instant">
              <span className="owner-preview-badge-icon">⚡</span>
              <span>Instant</span>
            </span>
            <span className="owner-preview-badge owner-preview-badge--verified">
              <span className="owner-preview-badge-dot" />
              <span>Verified</span>
            </span>
            <span className="owner-preview-badge owner-preview-badge--rating">
              <Star size={12} fill="currentColor" strokeWidth={1.8} />
              <span>4.8/5</span>
            </span>
          </div>
        </div>

        <div className="owner-preview-content">
          <h2>Somdutt Cold Storage, Civil Lines Kanpur</h2>
          <p>Best for stuffing the low-temp sustained goods</p>

          <div className="owner-preview-tags">
            {[
              "KeyCard",
              "CCTV",
              "Loading",
              "30HP Power",
              "WiFi",
            ].map((tag) => (
              <span key={tag} className="owner-preview-tag">{tag}</span>
            ))}
          </div>

          <div className="owner-preview-price-row">
            <div className="owner-preview-price-wrap">
              <span className="owner-preview-price">₹1,200</span>
              <span className="owner-preview-price-unit">/Day</span>
            </div>
            <button type="button" className="owner-preview-book-button">Book</button>
          </div>
        </div>
      </article>

      <section className="owner-checklist-section">
        <h3>Listing Checklist</h3>
        <div className="owner-checklist-grid">
          <ul className="owner-checklist-col">
            <li><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span>Property Details</span></li>
            <li><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span>Amenities &amp; Features</span></li>
            <li><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span>Photos &amp; KYC Upload</span></li>
          </ul>
          <ul className="owner-checklist-col">
            <li><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span>Property Dimensions</span></li>
            <li><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span>Pricing Details</span></li>
            <li><span className="owner-checklist-icon"><Check size={12} strokeWidth={3} /></span><span>Location &amp; Access Details</span></li>
          </ul>
        </div>
      </section>

      <button type="button" className="owner-edit-bar" aria-label="Edit section">
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
    <main className="owner-page">
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
          </>
        )}

        {showReview ? renderStepReview() : renderCurrentStep()}
      </div>
    </main>
  );
}
