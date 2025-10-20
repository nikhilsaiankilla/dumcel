import type { Metadata } from "next";
import "./globals.css";
import { geistMono, geistSans } from "@/fonts/font";

export const metadata: Metadata = {
  title: "Dumcel",
  description: "Dumcel - The Ultimate Cloud Deployment Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
