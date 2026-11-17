import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Music - Spotify x YouTube",
  description: "Stream music with Spotify metadata and YouTube audio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-textPrimary">{children}</body>
    </html>
  );
}
