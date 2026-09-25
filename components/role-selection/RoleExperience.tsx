"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerHome } from "@/components/owner/OwnerHome";
import { RenterHome } from "@/components/renter/RenterHome";
import { getSelectedRole, setSelectedRole } from "@/lib/roles/role-storage";
import type { UserRole } from "@/types/roles";

type RoleExperienceProps = {
  initialRole?: UserRole;
};

export function RoleExperience({ initialRole = "renter" }: RoleExperienceProps) {
  const [selectedRole, setSelectedRoleState] = useState<UserRole>(() => getSelectedRole() ?? initialRole);

  useEffect(() => {
    const storedRole = getSelectedRole();
    if (storedRole && storedRole !== selectedRole) {
      setSelectedRoleState(storedRole);
    }
  }, [selectedRole]);

  const handleRoleChange = (nextRole: UserRole) => {
    setSelectedRoleState(nextRole);
    setSelectedRole(nextRole);
  };

  const cachedScreens = useMemo(
    () => ({
      renter: <RenterHome key="renter-shell" onRoleChange={handleRoleChange} />,
      owner: <OwnerHome key="owner-shell" />,
    }),
    [handleRoleChange],
  );

  return (
    <>
      <div style={{ display: selectedRole === "renter" ? "block" : "none" }}>
        {cachedScreens.renter}
      </div>
      <div style={{ display: selectedRole === "owner" ? "block" : "none" }}>
        {cachedScreens.owner}
      </div>
    </>
  );
}
