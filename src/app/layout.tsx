import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Voxelle — Voice-first AI workspace",
  description:
    "A voice-first, multimodal AI assistant. Talk naturally, stream replies, and run real tools — calendar events with downloadable files, image analysis, and honest session telemetry.",
  keywords: ["voice assistant", "AI", "multimodal", "speech recognition", "streaming"],
  authors: [{ name: "Voxelle" }],
  openGraph: {
    title: "Voxelle — Voice-first AI workspace",
    description: "Voice-first AI assistant with streaming replies and real tool execution.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voxelle — Voice-first AI workspace",
    description: "Voice-first AI assistant with streaming replies and real tool execution.",
    images: ["/og-image.png"],
  },
};

// Applies the persisted (or OS) theme before paint to avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('voxelle-theme');if(!t){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
