"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Car = {
  id: number;
  make: string;
  model: string;
  title: string;
  year: number;
  mileage: number;
  price: number;
  fuel: string;
  gearbox: string;
  city: string;
  body: string;
  photo: number;
  draft?: boolean;
};

type View = "home" | "results" | "detail" | "favorites" | "post";
type Filters = { make: string; model: string; min: string; max: string; fuel: string; city: string; body: string; year: string; gearbox: string };

const initialFilters: Filters = { make: "", model: "", min: "", max: "", fuel: "", city: "", body: "", year: "", gearbox: "" };
const demoCars: Car[] = [
  { id: 1, make: "Škoda", model: "Superb", title: "Škoda Superb 2.0 TDI", year: 2019, mileage: 124000, price: 18900, fuel: "Дизел", gearbox: "Автоматична", city: "София", body: "Седан", photo: 0 },
  { id: 2, make: "Toyota", model: "Corolla", title: "Toyota Corolla 1.8 Hybrid", year: 2021, mileage: 68000, price: 21900, fuel: "Хибрид", gearbox: "Автоматична", city: "Пловдив", body: "Седан", photo: 1 },
  { id: 3, make: "Volkswagen", model: "Passat", title: "Volkswagen Passat Variant", year: 2018, mileage: 141000, price: 16450, fuel: "Дизел", gearbox: "Автоматична", city: "Варна", body: "Комби", photo: 2 },
  { id: 4, make: "Volkswagen", model: "Golf", title: "Volkswagen Golf 7", year: 2020, mileage: 89000, price: 15900, fuel: "Бензин", gearbox: "Ръчна", city: "Бургас", body: "Хечбек", photo: 3 },
  { id: 5, make: "Dacia", model: "Duster", title: "Dacia Duster 4x4", year: 2021, mileage: 76000, price: 17800, fuel: "Дизел", gearbox: "Ръчна", city: "София", body: "SUV / Джип", photo: 4 },
  { id: 6, make: "Mazda", model: "MX-5", title: "Mazda MX-5 Roadster", year: 2019, mileage: 48000, price: 22900, fuel: "Бензин", gearbox: "Ръчна", city: "Бургас", body: "Кабрио", photo: 5 },
];
const categories = ["Хечбек", "Седан", "Комби", "SUV / Джип", "Купе", "Кабрио", "Бусове"];
const euro = (n: number) => new Intl.NumberFormat("bg-BG").format(n) + " €";
const number = (n: number) => new Intl.NumberFormat("bg-BG").format(n);

function Icon({ name, size = 20, fill = "none" }: { name: string; size?: number; fill?: string }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    car: <><path d="m5 12 2-6h10l2 6M4 12h16v7H4zM4 16H2v-3l2-1m16 4h2v-3l-2-1M7 19v2m10-2v2" /></>,
    sliders: <><path d="M4 7h16M4 17h16M9 4v6m6 4v6" /></>,
    shield: <><path d="M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    tag: <><path d="M3 4h9l9 9-8 8-9-9V4Z" /><circle cx="8" cy="8" r="1" /></>,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    close: <path d="M5 5 19 19M19 5 5 19" />,
    chevron: <path d="m7 10 5 5 5-5" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function CarPhoto({ photo, className = "" }: { photo: number; className?: string }) {
  return <div className={`car-photo photo-${photo} ${className}`} role="img" aria-label="Илюстративна снимка на автомобил" />;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [advanced, setAdvanced] = useState(false);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Car[]>([]);
  const [sort, setSort] = useState("newest");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [draftForm, setDraftForm] = useState({ make: "", model: "", year: "", mileage: "", price: "", fuel: "Бензин", gearbox: "Ръчна", city: "", body: "Седан" });

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("syu-favorites") || "[]"));
      setDrafts(JSON.parse(localStorage.getItem("syu-drafts") || "[]"));
    } catch { /* Ignore outdated local data. */ }
  }, []);

  const cars = useMemo(() => [...drafts, ...demoCars], [drafts]);
  const matches = useMemo(() => cars.filter((car) =>
    (!filters.make || car.make === filters.make) &&
    (!filters.model || car.model.toLocaleLowerCase("bg").includes(filters.model.toLocaleLowerCase("bg"))) &&
    (!filters.min || car.price >= Number(filters.min)) &&
    (!filters.max || car.price <= Number(filters.max)) &&
    (!filters.fuel || car.fuel === filters.fuel) &&
    (!filters.city || car.city === filters.city) &&
    (!filters.body || car.body === filters.body) &&
    (!filters.year || car.year >= Number(filters.year)) &&
    (!filters.gearbox || car.gearbox === filters.gearbox)
  ).sort((a, b) => sort === "priceAsc" ? a.price - b.price : sort === "priceDesc" ? b.price - a.price : b.year - a.year), [cars, filters, sort]);

  const selected = cars.find((car) => car.id === selectedId) || cars[0];
  const shownCars = view === "favorites" ? cars.filter((car) => favorites.includes(car.id)) : matches;
  const makes = [...new Set(cars.map((car) => car.make))].sort();

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function updateFilter(key: keyof Filters, value: string) {
    setFilters((old) => ({ ...old, [key]: value, ...(key === "make" ? { model: "" } : {}) }));
  }
  function runSearch(event?: FormEvent) {
    event?.preventDefault();
    navigate("results");
  }
  function categorySearch(body: string) {
    setFilters({ ...initialFilters, body });
    navigate("results");
  }
  function toggleFavorite(id: number) {
    setFavorites((old) => {
      const next = old.includes(id) ? old.filter((item) => item !== id) : [...old, id];
      localStorage.setItem("syu-favorites", JSON.stringify(next));
      return next;
    });
  }
  function openCar(id: number) { setSelectedId(id); navigate("detail"); }
  function saveDraft(event: FormEvent) {
    event.preventDefault();
    const newCar: Car = {
      id: Date.now(), make: draftForm.make.trim(), model: draftForm.model.trim(),
      title: `${draftForm.make.trim()} ${draftForm.model.trim()}`, year: Number(draftForm.year),
      mileage: Number(draftForm.mileage), price: Number(draftForm.price), fuel: draftForm.fuel,
      gearbox: draftForm.gearbox, city: draftForm.city.trim(), body: draftForm.body, photo: 0, draft: true,
    };
    const next = [newCar, ...drafts];
    setDrafts(next);
    localStorage.setItem("syu-drafts", JSON.stringify(next));
    setSelectedId(newCar.id);
    navigate("detail");
    setNotice("Черновата е запазена само в този браузър. За публични обяви ще добавим профили и база данни.");
  }

  function CarCard({ car }: { car: Car }) {
    return <article className="car-card">
      <button className="car-image-button" onClick={() => openCar(car.id)} aria-label={`Виж ${car.title}`}>
        <CarPhoto photo={car.photo} />
        <span className="image-label">{car.draft ? "ЛОКАЛНА ЧЕРНОВА" : "ПРИМЕРНА ОБЯВА"}</span>
      </button>
      <button className={`favorite-button ${favorites.includes(car.id) ? "is-favorite" : ""}`} onClick={() => toggleFavorite(car.id)} aria-label={favorites.includes(car.id) ? "Премахни от любими" : "Добави в любими"}><Icon name="heart" size={20} fill={favorites.includes(car.id) ? "currentColor" : "none"} /></button>
      <button className="car-card-body" onClick={() => openCar(car.id)}>
        <strong>{car.title}</strong>
        <span className="car-meta">{car.year} · {number(car.mileage)} км · {car.fuel}</span>
        <b className="price">{euro(car.price)}</b>
        <span className="car-location"><Icon name="pin" size={14} />{car.city}</span>
      </button>
    </article>;
  }

  return <div className="site-shell">
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => navigate("home")} aria-label="SYU AUTO начало"><span><em>SYU</em> AUTO</span><small>Твоят път към следващата кола</small></button>
        <nav className={`main-nav ${mobileMenu ? "open" : ""}`} aria-label="Основна навигация">
          <button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}>Начало</button>
          <button className={view === "results" ? "active" : ""} onClick={() => { setFilters(initialFilters); navigate("results"); }}>Обяви</button>
          <button onClick={() => { navigate("home"); setTimeout(() => document.getElementById("search")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Търсене</button>
          <button className={view === "favorites" ? "active" : ""} onClick={() => navigate("favorites")}>Любими {favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>
        </nav>
        <div className="header-actions">
          <button className="header-heart" onClick={() => navigate("favorites")} aria-label="Любими"><Icon name="heart" size={22} />{favorites.length > 0 && <span className="heart-count">{favorites.length}</span>}</button>
          <button className="post-button" onClick={() => navigate("post")}><Icon name="plus" size={18} /> Публикувай обява</button>
          <button className="menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Отвори менюто"><Icon name={mobileMenu ? "close" : "menu"} size={25} /></button>
        </div>
      </div>
    </header>

    {view === "home" && <>
      <section className="hero"><div className="hero-overlay"><div className="hero-content page-width">
        <span className="eyebrow">SYU AUTO · АВТОМОБИЛИ В БЪЛГАРИЯ</span>
        <h1>Намери автомобила,<br />който <span>търсиш.</span></h1>
        <p>Разгледай обяви, сравни предложенията и запази любимите си автомобили на едно място.</p>
        <div className="hero-points"><span><Icon name="car" size={25} /> Лесно търсене</span><span><Icon name="heart" size={24} /> Запазени обяви</span><span><Icon name="shield" size={25} /> Ясна информация</span></div>
      </div></div></section>
      <div className="home-search page-width" id="search">{SearchForm()}</div>
      <main className="page-width home-content">
        <div className="section-head"><div><span className="section-kicker">РАЗГЛЕДАЙ ПАЗАРА</span><h2>Търси по категория</h2></div><button className="text-link" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Всички обяви <Icon name="arrow" size={17} /></button></div>
        <div className="category-grid">{categories.map((category, index) => <button key={category} className="category-tile" onClick={() => categorySearch(category)}><span className={`category-image photo-${[3,0,2,4,5,5,4][index]}`} /><span>{category}</span><Icon name="arrow" size={16} /></button>)}</div>
        <div className="section-head listings-head"><div><span className="section-kicker">ПЪРВА ВЕРСИЯ</span><h2>Примерни обяви</h2><p>Данните и снимките тук са демонстрационни.</p></div><button className="text-link" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Виж всички <Icon name="arrow" size={17} /></button></div>
        <div className="cards-grid">{demoCars.slice(0, 4).map((car) => <CarCard car={car} key={car.id} />)}</div>
        <div className="benefits"><div><Icon name="search" size={30} /><strong>Търсене с филтри</strong><p>Марка, бюджет, гориво и още.</p></div><div><Icon name="heart" size={30} /><strong>Любими автомобили</strong><p>Запази интересните обяви.</p></div><div><Icon name="car" size={30} /><strong>Обяви на едно място</strong><p>Разгледай детайлите удобно.</p></div><div><Icon name="plus" size={30} /><strong>Подготви обява</strong><p>Създай чернова в браузъра.</p></div></div>
      </main>
    </>}

    {(view === "results" || view === "favorites") && <main className="page-width interior"><div className="interior-heading"><div><span className="section-kicker">SYU AUTO · ДЕМО КАТАЛОГ</span><h1>{view === "favorites" ? "Любими автомобили" : "Автомобили"}</h1><p>{view === "favorites" ? `${shownCars.length} ${shownCars.length === 1 ? "запазена обява" : "запазени обяви"} в този браузър` : `${shownCars.length} ${shownCars.length === 1 ? "резултат" : "резултата"} от примерните обяви и твоите чернови`}</p></div></div>
      {view === "results" && <div className="results-search">{SearchForm()}</div>}
      <div className="results-toolbar"><span>{shownCars.length} {shownCars.length === 1 ? "обява" : "обяви"}</span>{view === "results" && <label>Подреди по <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Най-нови</option><option value="priceAsc">Цена: ниска към висока</option><option value="priceDesc">Цена: висока към ниска</option></select></label>}</div>
      {shownCars.length ? <div className="cards-grid results-grid">{shownCars.map((car) => <CarCard car={car} key={car.id} />)}</div> : <div className="empty-state"><Icon name={view === "favorites" ? "heart" : "search"} size={38} /><h2>{view === "favorites" ? "Още нямаш любими обяви" : "Няма съвпадения"}</h2><p>{view === "favorites" ? "Натисни сърцето на автомобил, който ти харесва." : "Промени някой от филтрите, за да видиш повече автомобили."}</p><button className="primary-button" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Разгледай обявите</button></div>}
    </main>}

    {view === "detail" && selected && <main className="page-width interior detail-page"><button className="back-link" onClick={() => navigate("results")}>← Обратно към обявите</button>{notice && <div className="notice">{notice}</div>}<div className="detail-layout"><div><CarPhoto photo={selected.photo} className="detail-photo" /><p className="photo-note">{selected.draft ? "Черновата използва илюстративна снимка." : "Демонстрационна обява · снимката е илюстративна."}</p></div><div className="detail-panel"><span className="section-kicker">{selected.draft ? "ЛОКАЛНА ЧЕРНОВА" : "ПРИМЕРНА ОБЯВА"}</span><h1>{selected.title}</h1><p className="detail-price">{euro(selected.price)}</p><p className="detail-city"><Icon name="pin" size={17} />{selected.city}</p><div className="spec-grid"><span>Година<strong>{selected.year}</strong></span><span>Пробег<strong>{number(selected.mileage)} км</strong></span><span>Гориво<strong>{selected.fuel}</strong></span><span>Скоростна кутия<strong>{selected.gearbox}</strong></span><span>Купе<strong>{selected.body}</strong></span></div><button className="primary-button wide" onClick={() => toggleFavorite(selected.id)}><Icon name="heart" size={19} fill={favorites.includes(selected.id) ? "currentColor" : "none"} />{favorites.includes(selected.id) ? "Запазено в любими" : "Запази в любими"}</button><div className="detail-hint">За реални запитвания към продавачи ще добавим профили и система за съобщения.</div></div></div></main>}

    {view === "post" && <main className="page-width interior post-page"><div className="interior-heading"><span className="section-kicker">SYU AUTO</span><h1>Подготви обява</h1><p>Създай чернова на автомобила. Тя се пази само в този браузър и не е публична.</p></div><form className="post-form" onSubmit={saveDraft}><div className="form-grid">
      {([ ["make", "Марка", "Напр. Volkswagen"], ["model", "Модел", "Напр. Golf"], ["year", "Година", "Напр. 2020"], ["mileage", "Пробег (км)", "Напр. 85000"], ["price", "Цена (€)", "Напр. 15900"], ["city", "Град", "Напр. Бургас"] ] as const).map(([key, label, placeholder]) => <label key={key}>{label}<input required type={["year", "mileage", "price"].includes(key) ? "number" : "text"} min="0" placeholder={placeholder} value={draftForm[key]} onChange={(e) => setDraftForm({ ...draftForm, [key]: e.target.value })} /></label>)}
      {([ ["fuel", "Гориво", ["Бензин", "Дизел", "Хибрид", "Електрически"]], ["gearbox", "Скоростна кутия", ["Ръчна", "Автоматична"]], ["body", "Купе", categories] ] as const).map(([key, label, options]) => <label key={key}>{label}<select value={draftForm[key]} onChange={(e) => setDraftForm({ ...draftForm, [key]: e.target.value })}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
    </div><button className="primary-button" type="submit"><Icon name="plus" size={18} /> Запази чернова</button><p className="form-note">Тази версия не публикува обяви онлайн. Снимките, профилите и публичното публикуване са следваща стъпка.</p></form></main>}

    <footer className="site-footer"><div className="page-width footer-inner"><div><strong><em>SYU</em> AUTO</strong><p>Автомобили в България — проект в разработка.</p></div><div><button onClick={() => navigate("home")}>Начало</button><button onClick={() => { setFilters(initialFilters); navigate("results"); }}>Обяви</button><button onClick={() => navigate("post")}>Подготви обява</button></div><small>© 2026 SYU AUTO · Демонстрационна версия</small></div></footer>
  </div>;

  function SearchForm() {
    return <form className="search-panel" onSubmit={runSearch}><div className="search-fields">
      <label>Марка<select value={filters.make} onChange={(e) => updateFilter("make", e.target.value)}><option value="">Всички марки</option>{makes.map((make) => <option key={make}>{make}</option>)}</select></label>
      <label>Модел<input value={filters.model} onChange={(e) => updateFilter("model", e.target.value)} placeholder="Всички модели" /></label>
      <label>Цена от<input type="number" min="0" value={filters.min} onChange={(e) => updateFilter("min", e.target.value)} placeholder="Мин. €" /></label>
      <label>Цена до<input type="number" min="0" value={filters.max} onChange={(e) => updateFilter("max", e.target.value)} placeholder="Макс. €" /></label>
      <label>Гориво<select value={filters.fuel} onChange={(e) => updateFilter("fuel", e.target.value)}><option value="">Всички</option>{["Бензин", "Дизел", "Хибрид", "Електрически"].map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label>
      <label>Град<select value={filters.city} onChange={(e) => updateFilter("city", e.target.value)}><option value="">Всички градове</option>{[...new Set(cars.map((car) => car.city))].sort().map((city) => <option key={city}>{city}</option>)}</select></label>
      <button className="search-button" type="submit"><Icon name="search" size={19} /> Търси {matches.length} {matches.length === 1 ? "обява" : "обяви"}</button>
    </div><div className="search-bottom"><button type="button" onClick={() => setAdvanced(!advanced)}><Icon name="sliders" size={16} /> Разширено търсене <Icon name="chevron" size={15} /></button>{Object.values(filters).some(Boolean) && <button type="button" onClick={() => setFilters(initialFilters)}>Изчисти филтрите</button>}</div>
    {advanced && <div className="advanced-fields"><label>Купе<select value={filters.body} onChange={(e) => updateFilter("body", e.target.value)}><option value="">Всички категории</option>{categories.map((body) => <option key={body}>{body}</option>)}</select></label><label>Година от<input type="number" min="1950" max="2030" placeholder="Година" value={filters.year} onChange={(e) => updateFilter("year", e.target.value)} /></label><label>Скоростна кутия<select value={filters.gearbox} onChange={(e) => updateFilter("gearbox", e.target.value)}><option value="">Всички</option><option>Ръчна</option><option>Автоматична</option></select></label></div>}
    </form>;
  }
}
