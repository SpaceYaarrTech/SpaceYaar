export type ListingBadgeType = "verified" | "instant" | "cheapest";

export type Listing = {
  id: string;
  title: string;
  description: string;
  image: string;
  distance: string;
  distanceValue: number;
  feature: string;
  area: string;
  pricePerDay: string;
  priceValue: number;
  badge: {
    label: string;
    type: ListingBadgeType;
  };
};

export const LISTINGS: Listing[] = [
  {
    id: "krishna-tower-empty-room",
    title: "Krishna Tower Empty Room",
    description: "Suitable for Packed storage stuff",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    distance: "1.2 km away",
    distanceValue: 1.2,
    feature: "CCTV",
    area: "500 Sq Ft",
    pricePerDay: "₹350/Day",
    priceValue: 350,
    badge: { label: "KYC Verified", type: "verified" },
  },
  {
    id: "lakshmi-storage-basement-area",
    title: "Lakshmi Storage Basement Area",
    description: "Perfect for temperature-sensitive goods",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    distance: "2 km away",
    distanceValue: 2,
    feature: "Climate Control",
    area: "750 Sq Ft",
    pricePerDay: "₹1200/Day",
    priceValue: 1200,
    badge: { label: "Instant", type: "instant" },
  },
  {
    id: "arjun-warehouse-large-space",
    title: "Arjun Warehouse Large Space",
    description: "Ideal for bulk inventory",
    image:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80",
    distance: "800 m away",
    distanceValue: 0.8,
    feature: "Alarm System",
    area: "1000 Sq Ft",
    pricePerDay: "₹660/Day",
    priceValue: 660,
    badge: { label: "Verified", type: "verified" },
  },
  {
    id: "somdutt-cold-storage",
    title: "Somdutt Cold Storage",
    description: "Best for stuffing low-temp sustained goods",
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    distance: "500m away",
    distanceValue: 0.5,
    feature: "24/7 Security",
    area: "100 Sq Ft",
    pricePerDay: "₹210/Day",
    priceValue: 210,
    badge: { label: "Cheapest", type: "cheapest" },
  },
];
