import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Product Hunter — Analise produtos do Mercado Livre",
  description: "Encontre os melhores produtos para vender: fornecedores, lucro, comissão e frete em segundos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
