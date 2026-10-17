import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import SiteHeader from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZAWIYA - Design Your Space",
  description:
    "An AI-powered multi-vendor furniture marketplace for Jordan. Browse furniture from partner shops, or photograph your room and get AI-ranked furniture suggestions sized for it.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#faf7f1] text-[#21201b]">
        <CartProvider>
          <SiteHeader user={user} />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-black/10 py-6 text-center text-xs text-stone-500">
            ZAWIYA is a graduation-project prototype. Partner shops and
            products are placeholder data, not a real retail integration.
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
