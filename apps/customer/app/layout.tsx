import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Order ahead",
  description: "Scan, browse, and order your meal before it's ready."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fraunces for menu-card headings, Inter for everything else - see
            packages/config design tokens for the rationale. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
