import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fredoka", display: "swap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Gut Feeling", template: "%s · Gut Feeling" },
  description: "Everybody poops. Gut Feeling makes bowel health easy to track and easy to talk about with your care team.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#fff8ee", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${atkinson.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
