"use client";

import { ChevronDown, XCircle } from "lucide-react";
import { COUNTRY_DIAL_CODES } from "@/lib/renter/profile-data";

type PhoneNumberInputProps = {
  dial: string;
  number: string;
  onChange: (next: { dial: string; number: string }) => void;
  invalid?: boolean;
  disabled?: boolean;
  name?: string;
};

export function PhoneNumberInput({ dial, number, onChange, invalid, disabled, name }: PhoneNumberInputProps) {
  return (
    <div className="renter-phone-input">
      <label className="renter-phone-dial">
        <span className="renter-visually-hidden">Country code</span>
        <select
          value={dial}
          disabled={disabled}
          onChange={(event) => onChange({ dial: event.target.value, number })}
        >
          {COUNTRY_DIAL_CODES.map(({ dial: optionDial, country }) => (
            <option key={country} value={optionDial}>{optionDial} {country}</option>
          ))}
        </select>
        <ChevronDown size={13} strokeWidth={2} aria-hidden />
      </label>
      <span className="renter-phone-divider" aria-hidden />
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        name={name}
        value={number}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        placeholder="Mobile number"
        onChange={(event) => onChange({ dial, number: event.target.value.replace(/[^0-9]/g, "").slice(0, 12) })}
      />
      {number && !disabled && (
        <button type="button" className="renter-phone-clear" aria-label="Clear phone number" onClick={() => onChange({ dial, number: "" })}>
          <XCircle size={15} strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}
