import type { CSSProperties, ReactNode } from "react";

type RoleChip = {
  icon: ReactNode;
  label: string;
};

type RoleCardProps = {
  role: "renter" | "owner";
  roleLabel: string;
  heading: string;
  description: string;
  illustrationSrc: string;
  illustrationAlt: string;
  accentColor: string;
  chips: RoleChip[];
  selected?: boolean;
  onSelect: () => void;
};

/**
 * Shared selection card used by both the Renter/Seeker and Owner/Host options.
 * The accent colour, illustration and feature chips are passed in so the two
 * cards stay visually identical apart from their content.
 */
export function RoleCard({
  role,
  roleLabel,
  heading,
  description,
  illustrationSrc,
  illustrationAlt,
  accentColor,
  chips,
  selected = false,
  onSelect,
}: RoleCardProps) {
  const style = { "--role-accent": accentColor } as CSSProperties;

  return (
    <button
      type="button"
      className={`role-card role-card--${role}${selected ? " role-card--selected" : ""}`}
      style={style}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="role-card-main">
        <img
          className="role-card-illustration"
          src={illustrationSrc}
          alt={illustrationAlt}
          width={75}
          height={99}
        />
        <span className="role-card-copy">
          <span className="role-card-label">{roleLabel}</span>
          <span className="role-card-heading">{heading}</span>
          <span className="role-card-description">{description}</span>
        </span>
      </span>

      <span className="role-card-divider" />

      <span className="role-card-chips">
        {chips.map((chip) => (
          <span className="role-chip" key={chip.label}>
            <span className="role-chip-icon" aria-hidden="true">
              {chip.icon}
            </span>
            <span className="role-chip-label">{chip.label}</span>
          </span>
        ))}
      </span>
    </button>
  );
}
