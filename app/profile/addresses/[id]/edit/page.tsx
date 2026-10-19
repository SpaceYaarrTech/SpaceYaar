"use client";

import { useParams } from "next/navigation";
import { AddressForm } from "@/components/renter/profile/AddressForm";

export default function EditAddressPage() {
  const params = useParams<{ id: string }>();
  return <AddressForm editingId={params.id} />;
}
