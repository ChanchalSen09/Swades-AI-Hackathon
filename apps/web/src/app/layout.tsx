import type { Metadata } from "next";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: "my-better-t-app",
  description: "my-better-t-app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Providers>
          <div className="grid grid-rows-[auto_1fr] h-svh">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
