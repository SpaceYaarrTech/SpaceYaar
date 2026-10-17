"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Heart,
  House,
  MapPin,
  Search,
  ShieldCheck,
  Tag,
  UserRound,
  Zap,
} from "lucide-react";
import { LISTINGS, type Listing } from "@/data/listings";
import { getSelectedRole, setSelectedRole } from "@/lib/roles/role-storage";
import type { UserRole } from "@/types/roles";

type FilterKey =
  | "priceRange"
  | "availability"
  | "within1km"
  | "for15Days"
  | "threeMonths"
  | "discount";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "priceRange", label: "Price Range" },
  { key: "availability", label: "Availability" },
  { key: "within1km", label: "Within 1KM" },
  { key: "for15Days", label: "For 15 Days" },
  { key: "threeMonths", label: "3 Months" },
  { key: "discount", label: "Discount" },
];

const INITIAL_FILTERS: Record<FilterKey, boolean> = {
  priceRange: true,
  availability: false,
  within1km: false,
  for15Days: false,
  threeMonths: false,
  discount: false,
};

function getBadgeClasses(type: Listing["badge"]["type"]) {
  switch (type) {
    case "instant":
      return "listing-badge listing-badge--instant";
    case "cheapest":
      return "listing-badge listing-badge--cheapest";
    default:
      return "listing-badge listing-badge--verified";
  }
}

function getBadgeIcon(type: Listing["badge"]["type"]) {
  switch (type) {
    case "instant":
      return <Zap size={10} strokeWidth={2.2} />;
    case "cheapest":
      return <Tag size={10} strokeWidth={2.2} />;
    default:
      return <ShieldCheck size={10} strokeWidth={2.2} />;
  }
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="listing-card" aria-label={listing.title}>
      <div className="listing-image-wrap">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          sizes="(max-width: 390px) 100vw, 390px"
          className="listing-image"
        />
        <div className={getBadgeClasses(listing.badge.type)}>
          {getBadgeIcon(listing.badge.type)}
          <span>{listing.badge.label}</span>
        </div>
      </div>

      <div className="listing-body">
        <h3>{listing.title}</h3>
        <p>{listing.description}</p>

        <div className="listing-meta">
          <span className="meta-chip">{listing.distance}</span>
          <span className="meta-chip">{listing.feature}</span>
          <span className="meta-chip">{listing.area}</span>
        </div>

        <div className="listing-footer">
          <span className="listing-price">{listing.pricePerDay}</span>
          <button type="button" className="book-button" aria-label={`Book ${listing.title}`}>
            Book
          </button>
        </div>
      </div>
    </article>
  );
}

function BottomNavigation({ activeTab = "Home" }: { activeTab?: string }) {
  const router = useRouter();
  const tabs = [
    { label: "Home", icon: House, href: "/renter" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Saved", icon: Heart, href: "/saved" },
    { label: "History", icon: Clock3, href: "/history" },
    { label: "Profile", icon: UserRound, href: "/profile" },
  ];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ label, icon: Icon, href }) => {
        const isActive = activeTab === label;
        return (
          <button
            key={label}
            type="button"
            className={isActive ? "bottom-nav-item bottom-nav-item--active" : "bottom-nav-item"}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => router.push(href)}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

type RenterHomeProps = {
  onRoleChange?: (nextRole: UserRole) => void;
};

export function RenterHome({ onRoleChange }: RenterHomeProps = {}) {
  const router = useRouter();
  const [selectedRole, setSelectedRoleState] = useState<UserRole>(() => getSelectedRole() ?? "renter");
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterKey, boolean>>(INITIAL_FILTERS);

  useEffect(() => {
    const storedRole = getSelectedRole();
    if (storedRole && storedRole !== selectedRole) {
      setSelectedRoleState(storedRole);
    }
  }, [selectedRole]);

  const filteredListings = useMemo(() => {
    const active = Object.entries(selectedFilters).filter(([, isSelected]) => isSelected);

    if (!active.length) {
      return LISTINGS;
    }

    let next = [...LISTINGS];

    if (selectedFilters.within1km) {
      next = next.filter((listing) => listing.distanceValue <= 1);
    }

    if (selectedFilters.discount) {
      next = next.filter((listing) => listing.priceValue <= 500);
    }

    if (selectedFilters.for15Days) {
      next = next.filter((listing) => listing.priceValue <= 700);
    }

    if (selectedFilters.threeMonths) {
      next = next.filter((listing) => listing.priceValue >= 350);
    }

    if (selectedFilters.availability) {
      next = next.filter((listing) => listing.feature !== "24/7 Security");
    }

    if (selectedFilters.priceRange) {
      return next;
    }

    return next.length ? next : [];
  }, [selectedFilters]);

  const handleRoleChange = (nextRole: UserRole) => {
    setSelectedRoleState(nextRole);
    setSelectedRole(nextRole);

    if (onRoleChange) {
      onRoleChange(nextRole);
      return;
    }

    if (nextRole === "owner") {
      router.replace("/owner");
      return;
    }
    router.replace("/renter");
  };

  const toggleFilter = (filterKey: FilterKey) => {
    setSelectedFilters((current) => {
      const next = { ...current, [filterKey]: !current[filterKey] };
      if (filterKey === "priceRange" && next.priceRange === false) {
        next.priceRange = true;
      }
      if (filterKey !== "priceRange") {
        next.priceRange = false;
      }
      return next;
    });
  };

  return (
    <main className="renter-home-page" aria-label="Renter home screen">
      <div className="status-bar" aria-hidden="true">
        <span className="status-time">9:30</span>
        <div className="status-icons">
          <svg viewBox="0 0 24 24" className="status-signal" aria-hidden="true">
            <path d="M3 15.5h2.2l1.8-3.2 2 5 2.2-4.8 1.8 2.5H21" />
          </svg>
          <svg viewBox="0 0 24 24" className="status-network" aria-hidden="true">
            <path d="M3 10.5h16v8H3z" />
            <path d="M18.5 13.5h2.5v5h-2.5" />
          </svg>
          <span className="battery-indicator" aria-hidden="true" />
        </div>
      </div>

      <div className="renter-toolbar">
        <div className="role-switcher" role="tablist" aria-label="Choose your role">
          <button
            type="button"
            className={selectedRole === "renter" ? "role-option role-option--active" : "role-option"}
            aria-pressed={selectedRole === "renter"}
            onClick={() => handleRoleChange("renter")}
          >
            Renter
          </button>
          <button
            type="button"
            className={selectedRole === "owner" ? "role-option role-option--active" : "role-option"}
            aria-pressed={selectedRole === "owner"}
            onClick={() => handleRoleChange("owner")}
          >
            Owner
          </button>
        </div>

        <button
          type="button"
          className="search-button"
          aria-label="Search"
          onClick={() => router.push("/search")}
        >
          <Search size={15} strokeWidth={2.2} />
        </button>
      </div>

      <div className="header-row">
        <div className="location-greeting">
          <div className="location-line">
            <span>Industrial estate Dada nagar, Kanpur</span>
            <MapPin size={10} strokeWidth={2.3} />
          </div>
          <h1>Hey! Swad?</h1>
        </div>

        <button
          type="button"
          className="profile-button"
          aria-label="Open profile"
          onClick={() => router.push("/profile")}
        >
          <UserRound size={14} strokeWidth={2.2} />
        </button>
      </div>

      <div className="filter-row" aria-label="Filter options">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={selectedFilters[key] ? "filter-chip filter-chip--selected" : "filter-chip"}
            aria-pressed={selectedFilters[key]}
            onClick={() => toggleFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="section-heading">Explore Near by</div>

      <div className="listing-stack">
        {filteredListings.length ? (
          filteredListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
        ) : (
          <div className="empty-state">No spaces match this filter yet.</div>
        )}
      </div>

      <BottomNavigation activeTab="Home" />
    </main>
  );
}
