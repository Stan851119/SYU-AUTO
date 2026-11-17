import Link from "next/link";
import type { ReactNode } from "react";
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="legal-page"><header><Link href="/" className="legal-brand"><span>MMC</span> AUTO</Link><Link href="/">Към автомобилите</Link></header><article><p className="legal-kicker">ТВОИТЕ ДАННИ И СИГУРНОСТ</p><h1>{title}</h1><p className="legal-date">Версия за преглед · 17 ноември 2026 г.</p>{children}</article></main>;
}
