const ADDRESS_TYPES = ["home", "office", "warehouse", "other"] as const;

export type AddressInput = {
  label: string;
  address_line: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  is_default: boolean;
};

export type AddressParseResult = { error: string } | { data: AddressInput };

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseAddressInput(value: unknown): AddressParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Address details must be an object." };
  }
  const body = value as Record<string, unknown>;

  const label = readString(body.label).toLowerCase();
  if (!(ADDRESS_TYPES as readonly string[]).includes(label)) {
    return { error: "Choose a valid address type." };
  }

  const addressLine = readString(body.address_line);
  if (!addressLine) return { error: "Enter the complete address." };
  if (addressLine.length > 500) return { error: "Complete address must be 500 characters or fewer." };

  const landmark = readString(body.landmark);
  if (landmark.length > 200) return { error: "Landmark must be 200 characters or fewer." };

  const city = readString(body.city);
  if (!city) return { error: "Enter the city." };
  if (city.length > 100) return { error: "City must be 100 characters or fewer." };

  const state = readString(body.state);
  if (!state) return { error: "Enter the state." };
  if (state.length > 100) return { error: "State must be 100 characters or fewer." };

  // Keep pincodes as text so leading zeros survive.
  const pincode = readString(body.pincode);
  if (!/^[1-9][0-9]{5}$/.test(pincode)) return { error: "Enter a valid 6-digit pincode." };

  const phone = readString(body.phone);
  if (!/^\+[1-9][0-9]{6,14}$/.test(phone.replace(/[\s-]/g, ""))) {
    return { error: "Enter a valid phone number with a country code." };
  }

  return {
    data: {
      label,
      address_line: addressLine,
      landmark: landmark || null,
      city,
      state,
      pincode,
      phone: phone.replace(/[\s-]/g, ""),
      is_default: body.is_default === true,
    },
  };
}
