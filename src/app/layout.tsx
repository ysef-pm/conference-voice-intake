import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conference Voice Intake",
  description: "Answer questions about yourself via voice conversation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
