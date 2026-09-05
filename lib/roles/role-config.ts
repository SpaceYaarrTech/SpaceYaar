import type { RoleConfig, UserRole } from "@/types/roles";

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  owner: {
    label: "Owner",
    description: "List and manage your spaces",
    eyebrow: "Build your portfolio",
    homeTitle: "Welcome to SpaceYaar, Owner",
    homeDescription: "Your owner experience is ready for the spaces, people, and opportunities ahead.",
  },
  renter: {
    label: "Renter",
    description: "Discover your next space",
    eyebrow: "Find your next place",
    homeTitle: "Welcome to SpaceYaar, Renter",
    homeDescription: "Your renter experience is ready for the spaces and possibilities that fit your life.",
  },
};

export const ROLE_OPTIONS = Object.entries(ROLE_CONFIG) as [UserRole, RoleConfig][];