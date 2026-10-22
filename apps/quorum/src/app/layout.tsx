import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Quorum", description: "Quorum — hackathon prototype" };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
