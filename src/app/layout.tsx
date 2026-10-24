import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#060810",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

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
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voxelle — Ambient Voice AI & Command Center",
    description:
      "Voice-first AI assistant with streaming responses and real tool execution.",
    images: ["/og-image.png"],
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
      <body
        className="min-h-full flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
