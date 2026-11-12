import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Origin — Know what’s real",
  description: "Product verification and traceability for brands and the people who trust them.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
