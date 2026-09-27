import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MMC AUTO — Автомобили в България",
    template: "%s | MMC AUTO",
  },
  description: "Купувай и продавай автомобили в България. Обяви от частни лица и автокъщи.",
  keywords: ["автомобили", "коли", "автокъщи", "автомобили в България", "MMC AUTO"],
  openGraph: {
    title: "MMC AUTO — Автомобили в България",
    description: "Пазар за автомобили от частни лица и автокъщи.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="bg"><body>{children}</body></html>;
}
