import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bg by inbound",
  description: "Transform emails into code with AI-powered background agents",
  metadataBase: new URL('https://bg.inbound.dev'),
  openGraph: {
    title: 'bg by inbound',
    description: 'Transform emails into code with AI-powered background agents',
    url: 'https://bg.inbound.dev',
    siteName: 'bg by inbound',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bg by inbound',
    description: 'Transform emails into code with AI-powered background agents',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navigation />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
