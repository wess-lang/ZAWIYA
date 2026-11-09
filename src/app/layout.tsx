import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import FloatingCartBar from "@/components/FloatingCartBar";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// A serif display face — the sense of craft and material a furniture
// brand wants for its wordmark and headings — replacing an earlier
// bubbly rounded sans that read as a food-delivery app, not a showroom.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "ZAWIYA - Design Your Space",
  description:
    "An AI-powered multi-vendor furniture marketplace for Jordan. Browse furniture from partner shops, or photograph your room and get AI-ranked furniture suggestions sized for it.",
};

// Runs before paint so switching themes (or loading with a saved
// preference) never flashes the wrong palette.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("zawiya-theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      // The theme-init script below intentionally sets data-theme on this
      // element before React hydrates (so a saved preference never flashes
      // the wrong palette). That makes the attribute legitimately differ
      // from the server-rendered markup — expected, not a bug — so this is
      // the one attribute React is told not to warn about here.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground pb-16 sm:pb-0">
        <CartProvider>
          <SiteHeader user={user} />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomNav user={user} />
          <FloatingCartBar />
        </CartProvider>
      </body>
    </html>
  );
}
