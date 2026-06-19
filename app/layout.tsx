import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Sacramento } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const sacramento = Sacramento({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-sacramento",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Haue Valley Vision Builder",
  description:
    "See what your wedding at Haue Valley looks like. Before you ever set foot on the property.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${sacramento.variable}`}>
      <body className="antialiased bg-white text-hv-charcoal">{children}</body>
    </html>
  );
}
