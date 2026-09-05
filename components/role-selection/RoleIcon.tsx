import type { UserRole } from "@/types/roles";

export function RoleIcon({ role }: { role: UserRole }) {
  if (role === "owner") {
    return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><path d="M5 27V13.5L16 5l11 8.5V27H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M11 27v-8h10v8M3 14l13-10 13 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="11" r="5" stroke="currentColor" strokeWidth="1.8" /><path d="M7 27c.8-5.2 3.8-8 9-8s8.2 2.8 9 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M24 6v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}