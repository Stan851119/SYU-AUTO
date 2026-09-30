import Link from "next/link";

export function LegalLinks() {
  return <nav className="legal-links" aria-label="Правна информация">
    <Link href="/privacy">Поверителност</Link>
    <Link href="/terms">Общи условия</Link>
    <Link href="/cookies">Бисквитки и съхранение</Link>
    <Link href="/contact">Контакти</Link>
  </nav>;
}

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="legal-page">
    <header className="legal-header"><Link href="/" className="brand"><span><em>MMC</em> AUTO</span></Link><Link href="/">Към сайта</Link></header>
    <article className="legal-article">
      <p className="section-kicker">MMC AUTO · 30 септември 2026</p>
      <h1>{title}</h1>
      <p className="legal-draft" role="note">Проект за преглед. Преди публикуване предстои допълване на адреса и имейла на оператора и потвърждаване на сроковете за съхранение и настройките на доставчиците.</p>
      {children}
      <LegalLinks />
    </article>
  </main>;
}
