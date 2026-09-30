import type { Metadata } from "next";
import Link from "next/link";
import { LegalLinks } from "../../components/LegalPage";

export const metadata: Metadata = {
  title: "Контакти",
  description: "Свържете се с MMC AUTO по телефон.",
};

export default function ContactPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fb" }}>
      <header style={{ background: "#090d15", color: "white", padding: "22px max(24px, calc((100vw - 1200px) / 2))", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <Link href="/" style={{ color: "white", textDecoration: "none", fontSize: 25, fontWeight: 900 }}><span style={{ color: "#e91e31" }}>MMC</span> AUTO</Link>
        <Link href="/" style={{ color: "#fff", textDecoration: "none" }}>Начало</Link>
      </header>
      <section style={{ maxWidth: 780, margin: "0 auto", padding: "72px 24px" }}>
        <p style={{ color: "#d7192d", fontSize: 13, fontWeight: 800, letterSpacing: "0.12em" }}>MMC AUTO</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", margin: "12px 0 12px" }}>Контакти</h1>
        <p style={{ color: "#596171", lineHeight: 1.6 }}>За въпроси относно сайта и обявите можете да се свържете с нас по телефон.</p>
        <div style={{ marginTop: 32, padding: "32px", background: "#fff", border: "1px solid #e5e8ee", borderRadius: 14 }}>
          <strong style={{ color: "#596171" }}>Телефон</strong>
          <p style={{ margin: "12px 0 0", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800 }}>
            <a href="tel:+359878255677" style={{ color: "#d7192d", textDecoration: "none" }}>+359 87 825 5677</a>
          </p>
        </div>
        <LegalLinks />
      </section>
    </main>
  );
}
