import "./globals.css";
import { DM_Sans, Syne } from "next/font/google";
import { Providers } from "../components/Providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-dm-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata = {
  title: "Scasi AI — Your Intelligent Email Assistant",
  description: "Scasi AI uses advanced AI agents to summarise, prioritise, and reply to your emails automatically.",
};


export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <head>
        {/* Playfair + Outfit: legacy page fonts loaded via <link> in <head> */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font — App Router root layout (equivalent to _document.js) */}
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${dmSans.variable} ${syne.variable} relative m-0 p-0`}>
        <Providers>
          {children}
        </Providers>

      </body>
    </html>
  );
}