import type { Metadata } from "next";
import { Inter, Outfit, Manrope } from "next/font/google";
import "./globals.css";
import CursorGlowBackground from "@/components/CursorGlowBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireAI - Next Generation Technical Screening",
  description: "AI adaptive technical interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-transparent text-white">
        <div className="page-shell">
          <CursorGlowBackground />
          <div className="relative z-10 min-h-screen">{children}</div>
        </div>
      </body>
    </html>
  );
}