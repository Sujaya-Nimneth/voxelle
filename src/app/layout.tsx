import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Voxelle — Voice-Enabled Multimodal Assistant",
  description:
    "A sleek, voice-powered AI assistant with multimodal capabilities. Schedule events, control smart home devices, and analyze images — all by voice.",
  keywords: [
    "voice assistant",
    "AI",
    "multimodal",
    "speech recognition",
    "smart home",
    "calendar",
  ],
  authors: [{ name: "Voxelle" }],
  openGraph: {
    title: "Voxelle — Voice-Enabled Multimodal Assistant",
    description:
      "A sleek, voice-powered AI assistant with multimodal capabilities.",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
