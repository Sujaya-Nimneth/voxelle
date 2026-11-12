import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "@/components/AppThemeProvider";

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
  viewportFit: "cover",
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

// Applies the persisted theme attribute before paint to avoid a flash while
// staying aligned with Astryx's Root Theme (which removes data-theme in 'system').
const themeInit = `(function(){try{document.documentElement.setAttribute('data-astryx-theme','voxelle');var t=localStorage.getItem('voxelle-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-astryx-theme="voxelle"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
