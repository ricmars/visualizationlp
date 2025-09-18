import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { ResponsiveProvider } from "./contexts/ResponsiveContext";
import HeaderHamburgerMenu from "./components/HeaderHamburgerMenu";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Case Designer",
  description: "Case Designer",
  icons: {
    icon: "/favicon-32x32.png",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <body className={`${notoSans.className} antialiased`}>
        <ResponsiveProvider>
          <header className="app-header">
            <div className="app-header-content">
              <div className="app-header-left">
                <HeaderHamburgerMenu />
                <Image
                  src="/dot-9-solid.svg"
                  alt="Menu"
                  className="icon"
                  width={16}
                  height={16}
                />
                <Link href="/" aria-label="Go to home">
                  <Image
                    src="/Launchpad logo.svg"
                    alt="Launchpad"
                    className="logo"
                    width={90}
                    height={13}
                    priority
                  />
                </Link>
              </div>
              <div className="app-header-right">
                <Image
                  src="/help.svg"
                  alt="Help"
                  className="icon"
                  width={16}
                  height={16}
                />
              </div>
            </div>
          </header>
          {children}
        </ResponsiveProvider>
      </body>
    </html>
  );
}
