import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Case Designer",
  description: "Case Designer",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <body className={`${montserrat.className} antialiased`}>
        <header className="app-header">
          <div className="app-header-content">
            <div className="app-header-left">
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
      </body>
    </html>
  );
}
