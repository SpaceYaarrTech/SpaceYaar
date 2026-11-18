import { createAdminClient } from "@/lib/supabase/admin";

export type OnBehalfOwner = { id: string; email: string; displayName: string };

export type OnBehalfResolution =
  | { owner: OnBehalfOwner; error?: undefined; status?: undefined }
  | { owner?: undefined; error: string; status: number };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_PAGE_SIZE = 100;
const MAX_USER_PAGES = 10;

/**
 * Resolve the owner an admin is listing a property for.
 *
 * `listings.owner_id` is a NOT NULL foreign key into profiles, so the email
 * must belong to an existing SpaceYaar account. The profiles row is created
 * (or promoted to the owner role) as part of the designation: listing writes
 * are tied by RLS to `profiles.role = 'owner'`, so without the role the owner
 * could not manage the listing that now belongs to them.
 */
export async function resolveOwnerForOnBehalfListing(rawEmail: string): Promise<OnBehalfResolution> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter the owner's email address.", status: 400 };
  }

  const admin = createAdminClient();
  let account: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;
  for (let page = 1; page <= MAX_USER_PAGES && !account; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USER_PAGE_SIZE });
    if (error) {
      console.error("Could not look up the on-behalf owner account:", error.message);
      return { error: "Could not look up the owner's account. Try again.", status: 500 };
    }
    account = data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;
    if (data.users.length < USER_PAGE_SIZE) break;
  }
  if (!account) {
    return {
      error: "No SpaceYaar account exists for this email. Ask the owner to sign in once, then try again.",
      status: 404,
    };
  }

  const metadataName = account.user_metadata?.full_name ?? account.user_metadata?.name;
  const displayName = (typeof metadataName === "string" && metadataName.trim()) || email.split("@")[0];

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", account.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not read the on-behalf owner profile:", profileError.message);
    return { error: "Could not read the owner's profile. Try again.", status: 500 };
  }
  if (!profile) {
    const { error: insertError } = await admin
      .from("profiles")
      .insert({ id: account.id, display_name: displayName, role: "owner" });
    if (insertError) {
      console.error("Could not create the on-behalf owner profile:", insertError.message);
      return { error: "Could not set up the owner's profile. Try again.", status: 500 };
    }
  } else if (profile.role !== "owner") {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ role: "owner", updated_at: new Date().toISOString() })
      .eq("id", account.id);
    if (updateError) {
      console.error("Could not set the on-behalf owner role:", updateError.message);
      return { error: "Could not set the owner role for this account. Try again.", status: 500 };
    }
  }

  return { owner: { id: account.id, email, displayName } };
}
