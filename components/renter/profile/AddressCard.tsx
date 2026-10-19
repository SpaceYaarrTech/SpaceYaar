"use client";

import { BriefcaseBusiness, House, MapPin, MoreVertical, PencilLine, Star, Trash2, Warehouse } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ADDRESS_TYPE_LABELS, formatAddressLines, type SavedAddress } from "@/lib/renter/profile-data";

const TYPE_ICONS = {
  home: House,
  office: BriefcaseBusiness,
  warehouse: Warehouse,
  other: MapPin,
} as const;

type AddressCardProps = {
  address: SavedAddress;
  onEdit: (address: SavedAddress) => void;
  onSetDefault: (address: SavedAddress) => void;
  onDelete: (address: SavedAddress) => void;
  busy?: boolean;
};

export function AddressCard({ address, onEdit, onSetDefault, onDelete, busy }: AddressCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const Icon = TYPE_ICONS[address.label];

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <article className="renter-address-card">
      <span className={`renter-address-icon renter-address-icon-${address.label}`} aria-hidden>
        <Icon size={15} strokeWidth={2} />
      </span>
      <div className="renter-address-body">
        <div className="renter-address-heading">
          <h3>{ADDRESS_TYPE_LABELS[address.label]}</h3>
          {address.is_default && <span className="renter-address-default-chip">Default</span>}
        </div>
        <p className="renter-address-text">{formatAddressLines(address)}</p>
        <p className="renter-address-phone">{address.phone}</p>
      </div>
      <div className="renter-address-menu-wrap" ref={menuRef}>
        <button
          type="button"
          className="renter-address-menu-button"
          aria-label={`More actions for ${ADDRESS_TYPE_LABELS[address.label]}`}
          aria-expanded={menuOpen}
          disabled={busy}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreVertical size={16} strokeWidth={2} aria-hidden />
        </button>
        {menuOpen && (
          <div className="renter-address-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(address); }}>
              <PencilLine size={13} strokeWidth={2} aria-hidden /> Edit Address
            </button>
            {!address.is_default && (
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onSetDefault(address); }}>
                <Star size={13} strokeWidth={2} aria-hidden /> Set as Default
              </button>
            )}
            <button type="button" role="menuitem" className="renter-address-menu-danger" onClick={() => { setMenuOpen(false); onDelete(address); }}>
              <Trash2 size={13} strokeWidth={2} aria-hidden /> Delete Address
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
