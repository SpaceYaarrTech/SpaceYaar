"use client";

import { useParams } from "next/navigation";
import { ProfileSettingsScreen } from "@/components/renter/profile/ProfileSettingsScreen";

const SECTIONS = ["notifications", "language", "payment-methods", "contact", "faqs"] as const;

export default function ProfileSettingsPage() {
  const params = useParams<{ section: string }>();
  const section = SECTIONS.includes(params.section as typeof SECTIONS[number]) ? params.section : "";
  return <ProfileSettingsScreen section={section} />;
}
