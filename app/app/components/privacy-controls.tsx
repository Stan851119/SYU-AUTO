"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CHOICE_KEY, CHOICE_LIFETIME, parseChoice, serializeChoice } from "../../lib/privacy-choice";
const Analytics = dynamic(() => import("@vercel/analytics/next").then(m => m.Analytics), { ssr: false });
function allowed() {
  try { return parseChoice(localStorage.getItem(CHOICE_KEY))?.analytics === true; } catch { return false; }
}
export default function PrivacyControls() {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let expiry: ReturnType<typeof setTimeout>;
    function sync() {
      let choice = null;
      try { choice = parseChoice(localStorage.getItem(CHOICE_KEY)); } catch { /* Deny when storage is unavailable. */ }
      setEnabled(choice?.analytics === true);
      setAnalytics(choice?.analytics === true);
      setOpen(!choice);
      clearTimeout(expiry);
      if (choice) {
        const remaining = choice.savedAt + CHOICE_LIFETIME - Date.now();
        expiry = setTimeout(remaining > 2_147_483_647 ? sync : () => window.location.reload(), Math.max(1, Math.min(remaining, 2_147_483_647)));
      }
    }
    sync();
    function changed(event: StorageEvent) { if (event.key === CHOICE_KEY || event.key === null) window.location.reload(); }
    window.addEventListener("storage", changed);
    return () => { clearTimeout(expiry); window.removeEventListener("storage", changed); };
  }, []);
  function save(value: boolean) {
    try {
      localStorage.setItem(CHOICE_KEY, serializeChoice(value));
      // A fresh document removes any previously loaded analytics listeners on withdrawal.
      window.location.reload();
    } catch { setEnabled(false); setAnalytics(false); setStorageError(true); }
  }
  return <>
    {enabled && <Analytics beforeSend={event => {
      if (!allowed()) return null;
      // Query strings can contain sign-in links or search text; never send them.
      const url = new URL(event.url, window.location.origin);
      return { ...event, url: url.origin + url.pathname };
    }} />}
    <nav className="legal-footer" aria-label="Поверителност и безопасност">
      <a href="/privacy">Поверителност</a><a href="/cookies">Бисквитки</a><a href="/terms">Общи условия</a><a href="/safety">Безопасни сделки</a><a href="/data-rights">Моите данни / сигнал</a>
      <button type="button" aria-expanded={open} aria-controls="privacy-panel" onClick={() => { setAnalytics(allowed()); setOpen(true); }}>Настройки за поверителност</button>
    </nav>
    {open && <section id="privacy-panel" className="privacy-panel" role="region" aria-labelledby="privacy-heading">
      <h2 id="privacy-heading">Твоят избор за поверителност</h2>
      <p>Необходимото съхранение поддържа входа, избраните от теб функции и този избор. Статистиката на Vercel е изключена, докато не я разрешиш. Отказът не пречи да използваш сайта.</p>
      <label className="privacy-toggle"><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /> Разрешавам статистика за посещенията (Vercel)</label>
      <p><a href="/cookies">Какво се съхранява</a> · <a href="/privacy">Как използваме данните</a></p>
      {storageError && <p role="alert">Браузърът не позволява запазване на избора. Статистиката остава изключена.</p>}
      <div className="privacy-actions"><button onClick={() => save(false)}>Само необходимите</button><button onClick={() => save(true)}>Разреши статистика</button><button onClick={() => save(analytics)}>Запази избора</button></div>
      <small>Можеш да промениш избора от долната част на всяка страница. При запазване страницата се презарежда; запази незавършената си обява предварително.</small>
    </section>}
  </>;
}
