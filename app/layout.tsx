import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpaceYaar | Find your next space",
  description: "A better way to connect people with places.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}