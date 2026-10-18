export type SearchFilters = {
  location: string;
  spaceType: string;
  maxArea: number;
  budget: number;
  security: string[];
  utilities: string[];
  logistics: string[];
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  location: "Kanpur, Uttar Pradesh",
  spaceType: "warehouse",
  maxArea: 41_500,
  budget: 13_500,
  security: [],
  utilities: [],
  logistics: [],
};

const FILTER_GROUPS = {
  security: ["Keycard Access", "24/7 CCTV", "Security Guard", "Alarm System", "Fire Suppression", "Sprinklers"],
  utilities: ["Power Backup", "100% Uptime", "WiFi / LAN", "Ventilation", "Humidity Control", "Water Supply"],
  logistics: ["Loading Dock", "Forklift", "Racking System", "Freight Lift", "Truck Parking", "Weighbridge"],
} as const;

export type FilterGroup = keyof typeof FILTER_GROUPS;
export const FILTER_OPTIONS = FILTER_GROUPS;

export function readSearchFilters(params: URLSearchParams): SearchFilters {
  const boundedNumber = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value >= 0 ? Math.min(value, 50_000) : fallback;
  };
  const readGroup = (group: FilterGroup) => {
    const selected = params.getAll(group);
    return FILTER_GROUPS[group].filter((item) => selected.includes(item));
  };

  return {
    location: params.has("location") ? params.get("location")?.trim() || "" : DEFAULT_SEARCH_FILTERS.location,
    spaceType: params.get("type")?.trim() || DEFAULT_SEARCH_FILTERS.spaceType,
    maxArea: boundedNumber("area", DEFAULT_SEARCH_FILTERS.maxArea),
    budget: boundedNumber("budget", DEFAULT_SEARCH_FILTERS.budget),
    security: readGroup("security"),
    utilities: readGroup("utilities"),
    logistics: readGroup("logistics"),
  };
}

export function writeSearchParams(params: URLSearchParams, filters: SearchFilters, query = "") {
  params.delete("location");
  params.delete("type");
  params.delete("area");
  params.delete("budget");
  params.delete("security");
  params.delete("utilities");
  params.delete("logistics");
  params.set("location", filters.location.trim());
  if (filters.spaceType) params.set("type", filters.spaceType);
  if (filters.maxArea < 50_000) params.set("area", String(filters.maxArea));
  if (filters.budget < 50_000) params.set("budget", String(filters.budget));
  filters.security.forEach((item) => params.append("security", item));
  filters.utilities.forEach((item) => params.append("utilities", item));
  filters.logistics.forEach((item) => params.append("logistics", item));
  if (query.trim()) params.set("q", query.trim());
  else params.delete("q");
  return params;
}

export function makeSearchHref(filters: SearchFilters, query = "", showAll = false) {
  const params = writeSearchParams(new URLSearchParams(), filters, query);
  if (showAll) params.set("all", "1");
  const queryString = params.toString();
  return `/owner/spaces${queryString ? `?${queryString}` : ""}`;
}
