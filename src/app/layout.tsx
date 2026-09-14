import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Praja — Think it through. Build it well.",
  description: "A human-led workspace for developing software projects.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
