import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { Footer } from "@/components/layout/Footer";
import { ShopChrome } from "@/components/layout/ShopChrome";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-accent",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Digital Auto Shop | Premium Tech",
    template: "%s | Digital Auto Shop",
  },
  description:
    "Discover premium tech and vehicle accessories. Elevate your drive with Digital Auto Shop — where technology meets the open road.",
  keywords: ["tech accessories", "vehicle accessories", "car gadgets", "Zimbabwe", "Digital Auto Shop"],
  openGraph: {
    title: "Digital Auto Shop",
    description: "Premium tech and vehicle accessories.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          {/*
            ShopChrome (client) checks usePathname() and hides navbar + footer
            on portal routes (/admin, /agent, /delivery).
            NavbarWrapper and Footer are passed as props so they stay server-rendered.
          */}
          <ShopChrome navbar={<NavbarWrapper />} footer={<Footer />}>
            <CartDrawer />
            <main className="flex-1">{children}</main>
          </ShopChrome>
        </Providers>
      </body>
    </html>
  );
}
