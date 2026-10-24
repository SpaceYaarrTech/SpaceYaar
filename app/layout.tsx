import type { Metadata } from "next";
import { Analytics } from "@/components/analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpaceYaar | Find your next space",
  description: "A better way to connect people with places.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  console.log("[app/layout.tsx] rendering RootLayout");
  return (
    <html lang="en">
      <body>
        <Analytics />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}