import "./globals.css";
import { SessionProvider } from "next-auth/react";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="relative m-0 p-0">
        <SessionProvider>
          {children}
        </SessionProvider>

      </body>
    </html>
  );
}