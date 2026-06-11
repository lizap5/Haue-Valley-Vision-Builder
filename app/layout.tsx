import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haue Valley Vision Builder",
  description: "Haue Valley Weddings in Pacific, MO.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
