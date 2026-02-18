import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kid Brokerage",
  description: "Manage kid brokerage accounts with backdated transactions."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
