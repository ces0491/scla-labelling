import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCLA labelling",
  description: "Frame labelling for the SCLA research project.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
