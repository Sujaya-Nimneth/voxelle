import type { Metadata } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Voxelle — Ambient Voice AI & Command Center",
  description:
    "A cyber dark, voice-enabled multimodal AI assistant and workspace command center. Schedule events, coordinate connected tools, and interact by voice.",
  keywords: [
    "voice assistant",
    "AI",
    "command center",
    "multimodal",
    "speech recognition",
    "cyber dark",
  ],
  authors: [{ name: "Voxelle" }],
  openGraph: {
    title: "Voxelle — Ambient Voice AI & Command Center",
    description:
      "A sleek, cyber dark ambient AI assistant and command center.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}

