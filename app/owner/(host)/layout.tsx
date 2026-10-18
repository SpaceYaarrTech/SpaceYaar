import type { ReactNode } from "react";
import { HostPortal } from "@/components/owner/HostPortal";

export default function HostLayout({ children }: { children: ReactNode }) {
  return <HostPortal>{children}</HostPortal>;
}
