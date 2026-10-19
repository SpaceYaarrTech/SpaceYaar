"use client";

import { ChevronLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { AddressCard } from "@/components/renter/profile/AddressCard";
import { useAddresses, type SavedAddress } from "@/lib/renter/profile-data";

export function SavedAddresses() {
  const router = useRouter();
  const { addresses, loading, error, setAddresses } = useAddresses();
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");
  const [status, setStatus] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setDefault = async (address: SavedAddress) => {
    setBusyId(address.id);
    setActionError("");
    setStatus("");
    try {
      const response = await fetch(`/api/profile/addresses/${address.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      const result = await response.json() as { address?: SavedAddress; error?: string };
      if (!response.ok || !result.address) throw new Error(result.error || "Could not set the default address.");
      setAddresses((current) => current.map((item) => ({
        ...item,
        is_default: item.id === address.id,
      })));
      setStatus("Default address updated.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not set the default address.");
    } finally {
      setBusyId("");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setActionError("");
    try {
      const response = await fetch(`/api/profile/addresses/${pendingDelete.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !result.deleted) throw new Error(result.error || "Could not delete the address.");
      setAddresses((current) => current.filter((item) => item.id !== pendingDelete.id));
      setStatus("Address deleted.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not delete the address.");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <main className="renter-flow-page renter-profile-subpage">
      <header className="renter-subpage-header">
        <button type="button" className="renter-back-button" aria-label="Back to profile" onClick={() => router.push("/profile")}>
          <ChevronLeft size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className="renter-subpage-title">Saved Addresses</h1>
      </header>

      {loading && <p className="renter-flow-state" role="status">Loading your addresses…</p>}
      {actionError && <p className="renter-flow-error" role="alert">{actionError}</p>}
      {!loading && error && <p className="renter-flow-error" role="alert">{error}</p>}
      {status && !actionError && <p className="renter-form-status" role="status">{status}</p>}

      {!loading && !error && addresses.length === 0 && (
        <p className="renter-flow-empty">You have no saved addresses yet. Add one below.</p>
      )}

      {addresses.length > 0 && (
        <div className="renter-address-list">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              busy={busyId === address.id}
              onEdit={(target) => router.push(`/profile/addresses/${target.id}/edit`)}
              onSetDefault={setDefault}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      <div className="renter-sticky-action">
        <button type="button" className="renter-primary-button" onClick={() => router.push("/profile/addresses/new")}>
          <Plus size={15} strokeWidth={2.4} aria-hidden /> Add New Address
        </button>
      </div>

      {pendingDelete && (
        <div className="renter-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPendingDelete(null);
        }}>
          <div className="renter-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-address-title">
            <h3 id="delete-address-title">Delete this address?</h3>
            <p>This saved address will be removed from your account. This cannot be undone.</p>
            {actionError && <p className="renter-flow-error" role="alert">{actionError}</p>}
            <div className="renter-dialog-actions">
              <button type="button" className="renter-dialog-cancel" disabled={deleting} onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="renter-dialog-confirm" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <RenterBottomNavigation />
    </main>
  );
}
