"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AVAILABILITY_DAYS,
  MAX_BOOKING_PRESETS,
  MIN_BOOKING_PRESETS,
  PRICE_MODELS,
  availabilityDayLabel,
  deriveRates,
  digitsOnly,
  formatINR,
} from "@/lib/listing/config";
import { validateStep4, type FieldErrors, type Step4Values } from "@/lib/listing/validation";

type PricingAvailabilityStepProps = {
  values: Step4Values;
  onChange: (patch: Partial<Step4Values>) => void;
  onContinue: () => void;
  saving: boolean;
};

export function PricingAvailabilityStep({ values, onChange, onContinue, saving }: PricingAvailabilityStepProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);

  const errors: FieldErrors = useMemo(() => validateStep4(values), [values]);
  const isSaveEnabled = Object.keys(errors).length === 0;

  const securityValue = useMemo(() => Number(values.securityAmount.replace(/,/g, "")) || 0, [values.securityAmount]);
  const refundEnabled = securityValue > 0;
  const { weeklyRate, monthlyRate } = useMemo(
    () => deriveRates(Number(values.rate.replace(/,/g, "")) || 0, values.priceModel),
    [values.rate, values.priceModel],
  );

  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }));
  const showError = (field: string) => (revealed || touched[field] ? errors[field] : undefined);
  const describedBy = (field: string, id: string) => (showError(field) ? id : undefined);

  // Once revealed, move focus to the first invalid control so keyboard and
  // screen-reader users land on the problem (handoff §20).
  useEffect(() => {
    if (!revealed) return;
    rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [revealed]);

  const handleContinue = () => {
    if (saving) return;
    if (!isSaveEnabled) {
      setRevealed(true);
      setTouched(Object.fromEntries(Object.keys(errors).map((field) => [field, true])));
      return;
    }
    onContinue();
  };

  return (
    <motion.div
      ref={rootRef}
      className="pricing-step"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <section className="owner-intro owner-step-four-intro">
        <h1>Pricing &amp; Availability</h1>
        <p>Set your rates &amp; schedule.</p>
      </section>

      <section className="pricing-section" aria-label="Price model section">
        <h2>Price Model</h2>
        <div className="pricing-model-group">
          {PRICE_MODELS.map((model) => {
            const isSelected = values.priceModel === model;
            return (
              <button
                key={model}
                type="button"
                className={`pricing-pill ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                aria-label={`Select ${model === "Per Week" ? "weekly" : "monthly"} pricing`}
                aria-invalid={Boolean(errors.priceModel)}
                onClick={() => {
                  onChange({ priceModel: model });
                  markTouched("priceModel");
                }}
              >
                {model}
              </button>
            );
          })}
        </div>
        {showError("priceModel") ? (
          <span id="pricing-model-error" className="owner-field-error" role="alert">{errors.priceModel}</span>
        ) : null}
      </section>

      <section className="pricing-form-block" aria-label="Set rate">
        <label className="pricing-field-label" htmlFor="space-rate">Set Rate (₹)</label>
        <div className="pricing-input-wrap">
          <span className="pricing-currency" aria-hidden="true">₹</span>
          <input
            id="space-rate"
            type="text"
            inputMode="numeric"
            value={values.rate ? formatINR(Number(values.rate)) : ""}
            onChange={(event) => onChange({ rate: digitsOnly(event.target.value) })}
            onBlur={() => markTouched("rate")}
            placeholder="Enter"
            aria-label="Set rental rate"
            aria-invalid={Boolean(errors.rate)}
            aria-describedby={describedBy("rate", "pricing-rate-error")}
          />
        </div>
        {showError("rate") ? (
          <span id="pricing-rate-error" className="owner-field-error" role="alert">{errors.rate}</span>
        ) : null}

        <div className="pricing-preview-grid" aria-live="polite">
          <div className="pricing-info-card">
            <span className="pricing-info-label">Weekly Rate</span>
            <span className="pricing-info-value">Rs.{formatINR(weeklyRate)} / week</span>
          </div>
          <div className="pricing-info-card">
            <span className="pricing-info-label">Monthly Rate</span>
            <span className="pricing-info-value">Rs.{formatINR(monthlyRate)} / month</span>
          </div>
        </div>
      </section>

      <section className="pricing-form-grid" aria-label="Security and refund settings">
        <div className="pricing-form-col">
          <label className="pricing-field-label" htmlFor="security-amount">Security Amount (₹)</label>
          <div className="pricing-input-wrap pricing-input-wrap--compact">
            <span className="pricing-currency" aria-hidden="true">₹</span>
            <input
              id="security-amount"
              type="text"
              inputMode="numeric"
              value={values.securityAmount ? formatINR(Number(values.securityAmount)) : ""}
              onChange={(event) => onChange({ securityAmount: digitsOnly(event.target.value) })}
              onBlur={() => markTouched("security")}
              placeholder="Enter"
              aria-label="Security amount"
              aria-invalid={Boolean(errors.security)}
              aria-describedby={describedBy("security", "pricing-security-error")}
            />
          </div>
          {showError("security") ? (
            <span id="pricing-security-error" className="owner-field-error" role="alert">{errors.security}</span>
          ) : null}
        </div>

        <div className="pricing-form-col">
          <label className="pricing-field-label" htmlFor="refund-days">Refundable within days</label>
          <div className="pricing-input-wrap pricing-input-wrap--compact">
            <input
              id="refund-days"
              type="text"
              inputMode="numeric"
              min="1"
              max="90"
              value={values.refundDays}
              onChange={(event) => onChange({ refundDays: digitsOnly(event.target.value) })}
              onBlur={() => markTouched("refund")}
              placeholder={refundEnabled ? "Enter days" : "No deposit"}
              disabled={!refundEnabled}
              aria-label="Refund timeline in days"
              aria-invalid={Boolean(errors.refund)}
              aria-describedby={describedBy("refund", "pricing-refund-error")}
            />
          </div>
          {showError("refund") ? (
            <span id="pricing-refund-error" className="owner-field-error" role="alert">{errors.refund}</span>
          ) : null}
        </div>
      </section>

      <section className="pricing-section" aria-label="Availability days">
        <h2>Availability Days</h2>
        <div className="availability-days">
          {AVAILABILITY_DAYS.map((day) => {
            const isSelected = values.availabilityDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                className={`availability-day ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                aria-label={`Select ${availabilityDayLabel(day)} availability`}
                aria-invalid={Boolean(errors.availabilityDays)}
                onClick={() => {
                  onChange({
                    availabilityDays: isSelected
                      ? values.availabilityDays.filter((item) => item !== day)
                      : [...values.availabilityDays, day],
                  });
                  markTouched("availabilityDays");
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
        {showError("availabilityDays") ? (
          <span id="pricing-availability-error" className="owner-field-error" role="alert">{errors.availabilityDays}</span>
        ) : null}
      </section>

      <section className="pricing-section" aria-label="Minimum booking duration">
        <h2>Minimum Booking Duration</h2>
        <div className="booking-options">
          {MIN_BOOKING_PRESETS.map((preset) => {
            const isSelected = values.minimumBookingDuration === preset;
            return (
              <button
                key={preset}
                type="button"
                className={`booking-option ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                aria-label={`Minimum booking duration: ${preset}`}
                aria-invalid={Boolean(errors.minimumBookingDuration)}
                onClick={() => {
                  onChange({ minimumBookingDuration: preset });
                  markTouched("minimumBookingDuration");
                }}
              >
                {preset}
              </button>
            );
          })}
        </div>
        {values.minimumBookingDuration === "Custom" ? (
          <div className="pricing-input-wrap pricing-input-wrap--compact pricing-custom-days">
            <input
              type="text"
              inputMode="numeric"
              value={values.minimumBookingCustomDays}
              onChange={(event) => onChange({ minimumBookingCustomDays: digitsOnly(event.target.value) })}
              onBlur={() => markTouched("minimumBookingDuration")}
              placeholder="Days"
              aria-label="Custom minimum booking days"
              aria-invalid={Boolean(errors.minimumBookingDuration)}
              aria-describedby={describedBy("minimumBookingDuration", "pricing-min-booking-error")}
            />
          </div>
        ) : null}
        {showError("minimumBookingDuration") ? (
          <span id="pricing-min-booking-error" className="owner-field-error" role="alert">{errors.minimumBookingDuration}</span>
        ) : null}
      </section>

      <section className="pricing-section" aria-label="Maximum booking duration">
        <h2>Maximum Booking Duration</h2>
        <div className="booking-options">
          {MAX_BOOKING_PRESETS.map((preset) => {
            const isSelected = values.maximumBookingDuration === preset;
            return (
              <button
                key={preset}
                type="button"
                className={`booking-option ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                aria-label={`Maximum booking duration: ${preset}`}
                aria-invalid={Boolean(errors.maximumBookingDuration)}
                onClick={() => {
                  onChange({ maximumBookingDuration: preset });
                  markTouched("maximumBookingDuration");
                }}
              >
                {preset}
              </button>
            );
          })}
        </div>
        {values.maximumBookingDuration === "Custom" ? (
          <div className="pricing-input-wrap pricing-input-wrap--compact pricing-custom-days">
            <input
              type="text"
              inputMode="numeric"
              value={values.maximumBookingCustomDays}
              onChange={(event) => onChange({ maximumBookingCustomDays: digitsOnly(event.target.value) })}
              onBlur={() => markTouched("maximumBookingDuration")}
              placeholder="Days"
              aria-label="Custom maximum booking days"
              aria-invalid={Boolean(errors.maximumBookingDuration)}
              aria-describedby={describedBy("maximumBookingDuration", "pricing-max-booking-error")}
            />
          </div>
        ) : null}
        {showError("maximumBookingDuration") ? (
          <span id="pricing-max-booking-error" className="owner-field-error" role="alert">{errors.maximumBookingDuration}</span>
        ) : null}
      </section>

      <button
        type="button"
        className="owner-cta owner-cta--step-4"
        onClick={handleContinue}
        disabled={saving}
        aria-disabled={!isSaveEnabled}
      >
        {saving ? "Saving…" : "Save & Continue"}
      </button>
    </motion.div>
  );
}
