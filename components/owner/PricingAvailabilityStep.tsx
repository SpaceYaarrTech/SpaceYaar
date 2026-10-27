"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";

const PRICE_MODELS = ["Per Day", "Per Week", "Per Month", "Customize"] as const;
const WEEKDAY_OPTIONS = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const BOOKING_OPTIONS = ["1 Day", "3 Days", "1 Week"] as const;

type PricingAvailabilityStepProps = {
  priceModel: string;
  rate: string;
  securityAmount: string;
  refundDays: string;
  availabilityDays: string[];
  minimumBookingDuration: string;
  onPriceModelChange: (value: string) => void;
  onRateChange: (value: string) => void;
  onSecurityAmountChange: (value: string) => void;
  onRefundDaysChange: (value: string) => void;
  onAvailabilityDayToggle: (day: string) => void;
  onMinimumBookingDurationChange: (value: string) => void;
  onContinue: () => void;
};

export function PricingAvailabilityStep({
  priceModel,
  rate,
  securityAmount,
  refundDays,
  availabilityDays,
  minimumBookingDuration,
  onPriceModelChange,
  onRateChange,
  onSecurityAmountChange,
  onRefundDaysChange,
  onAvailabilityDayToggle,
  onMinimumBookingDurationChange,
  onContinue,
}: PricingAvailabilityStepProps) {
  const [error, setError] = useState("");

  const numericRate = useMemo(() => Number.parseFloat(rate || "0") || 0, [rate]);
  const weeklyRate = useMemo(() => (numericRate ? Math.round(numericRate * 6.5) : 0), [numericRate]);
  const monthlyRate = useMemo(() => (numericRate ? Math.round(numericRate * 28) : 0), [numericRate]);

  const handleContinue = () => {
    if (!priceModel) {
      setError("Please select a price model.");
      return;
    }

    if (!rate || Number(rate) <= 0) {
      setError("Please enter a valid rate.");
      return;
    }

    if (!securityAmount || Number(securityAmount) < 0) {
      setError("Please enter a valid security amount.");
      return;
    }

    if (!refundDays || Number(refundDays) <= 0) {
      setError("Please enter refund period in days.");
      return;
    }

    if (!availabilityDays.length) {
      setError("Please select at least one availability day.");
      return;
    }

    if (!minimumBookingDuration) {
      setError("Please choose a minimum booking duration.");
      return;
    }

    setError("");
    onContinue();
  };

  return (
    <motion.div className="pricing-step" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <section className="owner-intro owner-step-four-intro">
        <h1>Pricing &amp; Availability</h1>
        <p>Set your rates &amp; schedule.</p>
      </section>

      <section className="pricing-section" aria-label="Price model section">
        <h2>Price Model</h2>
        <div className="pricing-model-group">
          {PRICE_MODELS.map((model) => {
            const isSelected = priceModel === model;
            return (
              <button
                key={model}
                type="button"
                className={`pricing-pill ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => onPriceModelChange(model)}
              >
                {model}
              </button>
            );
          })}
        </div>
      </section>

      <section className="pricing-form-block" aria-label="Set rate">
        <label className="pricing-field-label" htmlFor="space-rate">Set Rate (₹)</label>
        <div className="pricing-input-wrap">
          <span className="pricing-currency">₹</span>
          <input
            id="space-rate"
            type="number"
            min="0"
            step="100"
            value={rate}
            onChange={(event) => onRateChange(event.target.value)}
            placeholder="Enter"
            aria-label="Set rate in rupees"
          />
        </div>

        <div className="pricing-preview-grid">
          <div className="pricing-info-card">
            <span className="pricing-info-label">Weekly Rate (discount)</span>
            <span className="pricing-info-value">{numericRate ? `Rs.${weeklyRate.toLocaleString("en-IN")} / week (save 10%)` : "Rs.0 / week (save 10%)"}</span>
          </div>
          <div className="pricing-info-card">
            <span className="pricing-info-label">Monthly Rate (discount)</span>
            <span className="pricing-info-value">{numericRate ? `Rs.${monthlyRate.toLocaleString("en-IN")} / month (save 22%)` : "Rs.0 / month (save 22%)"}</span>
          </div>
        </div>
      </section>

      <section className="pricing-form-grid" aria-label="Security and refund settings">
        <div className="pricing-form-col">
          <label className="pricing-field-label" htmlFor="security-amount">Security Amount (₹)</label>
          <div className="pricing-input-wrap pricing-input-wrap--compact">
            <span className="pricing-currency">₹</span>
            <input
              id="security-amount"
              type="number"
              min="0"
              step="100"
              value={securityAmount}
              onChange={(event) => onSecurityAmountChange(event.target.value)}
              placeholder="Enter"
              aria-label="Security amount"
            />
          </div>
        </div>

        <div className="pricing-form-col">
          <label className="pricing-field-label" htmlFor="refund-days">Refundable within days</label>
          <div className="pricing-input-wrap pricing-input-wrap--compact">
            <input
              id="refund-days"
              type="number"
              min="1"
              step="1"
              value={refundDays}
              onChange={(event) => onRefundDaysChange(event.target.value)}
              placeholder="Enter days"
              aria-label="Refundable within days"
            />
          </div>
        </div>
      </section>

      <section className="pricing-section" aria-label="Availability days">
        <h2>Availability Days</h2>
        <div className="availability-days">
          {WEEKDAY_OPTIONS.map((day) => {
            const isSelected = availabilityDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                className={`availability-day ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => onAvailabilityDayToggle(day)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </section>

      <section className="pricing-section" aria-label="Minimum booking duration">
        <h2>Minimum Booking Duration</h2>
        <div className="booking-options">
          {BOOKING_OPTIONS.map((option) => {
            const isSelected = minimumBookingDuration === option;
            return (
              <button
                key={option}
                type="button"
                className={`booking-option ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => onMinimumBookingDurationChange(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </section>

      {error ? <p className="pricing-error" role="alert">{error}</p> : null}

      <button type="button" className="owner-cta owner-cta--step-4" onClick={handleContinue}>
        Save &amp; Continue
      </button>
    </motion.div>
  );
}
