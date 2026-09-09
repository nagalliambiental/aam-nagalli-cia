import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AAM Ambiental & Mineral",
  description:
    "Sistema de gestão integrada de processos minerários (ANM) e ambientais (IAT) da AAM Nagalli & Cia LTDA.",
  icons: {
    icon: [{ url: "/favicon.jpeg", type: "image/jpeg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
