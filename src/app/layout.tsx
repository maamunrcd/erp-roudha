import { Inter, Hind_Siliguri } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const hindSiliguri = Hind_Siliguri({ weight: ["400", "500", "600", "700"], subsets: ["bengali"], variable: "--font-hind-siliguri" });

export const metadata = {
  title: "Raudha Properties ERP",
  description: "Real Estate ERP & Customer Ledger System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${hindSiliguri.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
