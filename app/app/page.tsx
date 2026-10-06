"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { loadActiveListings, loadListingInquiries, loadMyListings, loadPendingListings, marketplace, type InquiryRow, type ListingRow } from "../lib/marketplace";
import { estimateCar, type Exterior, type Valuation } from "../lib/valuation";
import { cityCoordinates, distanceBetweenCitiesKm } from "../lib/locations";
import { preparePhoto } from "../lib/prepare-photo";

type Car = {
  id: number | string;
  make: string;
  model: string;
  title: string;
  year: number;
  mileage: number;
  price: number;
  fuel: string;
  gearbox: string;
  emissionClass?: string | null;
  co2GKm?: number | null;
  city: string;
  body: string;
  photo: number;
  draft?: boolean;
  pending?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  details?: string;
  sellerId?: string;
  contactPhone?: string | null;
};

type View = "home" | "results" | "detail" | "favorites" | "post" | "valuation" | "compare";
type Filters = { make: string; model: string; min: string; max: string; fuel: string; city: string; body: string; year: string; yearMax: string; mileageMin: string; mileageMax: string; originCity: string; radiusKm: string; gearbox: string; emissionClass: string };

const initialFilters: Filters = { make: "", model: "", min: "", max: "", fuel: "", city: "", body: "", year: "", yearMax: "", mileageMin: "", mileageMax: "", originCity: "", radiusKm: "", gearbox: "", emissionClass: "" };
const emissionClasses = ["Euro 1", "Euro 2", "Euro 3", "Euro 4", "Euro 5", "Euro 6"];
const zeroEmissions = "Нулеви емисии";
const emissionClassOf = (car: Car) => car.fuel === "Електрически" ? zeroEmissions : car.emissionClass;
const co2Of = (car: Car) => car.fuel === "Електрически" ? 0 : car.co2GKm;
const demoCars: Car[] = [
  { id: 1, make: "Škoda", model: "Superb", title: "Škoda Superb 2.0 TDI", year: 2019, mileage: 124000, price: 18900, fuel: "Дизел", gearbox: "Автоматична", city: "София", body: "Седан", photo: 0 },
  { id: 2, make: "Toyota", model: "Corolla", title: "Toyota Corolla 1.8 Hybrid", year: 2021, mileage: 68000, price: 21900, fuel: "Хибрид", gearbox: "Автоматична", city: "Пловдив", body: "Седан", photo: 1 },
  { id: 3, make: "Volkswagen", model: "Passat", title: "Volkswagen Passat Variant", year: 2018, mileage: 141000, price: 16450, fuel: "Дизел", gearbox: "Автоматична", city: "Варна", body: "Комби", photo: 2 },
  { id: 4, make: "Volkswagen", model: "Golf", title: "Volkswagen Golf 7", year: 2020, mileage: 89000, price: 15900, fuel: "Бензин", gearbox: "Ръчна", city: "Бургас", body: "Хечбек", photo: 3 },
  { id: 5, make: "Dacia", model: "Duster", title: "Dacia Duster 4x4", year: 2021, mileage: 76000, price: 17800, fuel: "Дизел", gearbox: "Ръчна", city: "София", body: "SUV / Джип", photo: 4 },
  { id: 6, make: "Mazda", model: "MX-5", title: "Mazda MX-5 Roadster", year: 2019, mileage: 48000, price: 22900, fuel: "Бензин", gearbox: "Ръчна", city: "Бургас", body: "Кабрио", photo: 5 },
];
const categories = ["Хечбек", "Седан", "Комби", "SUV / Джип", "Купе", "Кабрио", "Бусове"];
const categoryImages: Record<string, string> = {
  "Хечбек": "/category-hatchback.webp",
  "Седан": "/category-sedan.webp",
  "Комби": "/category-wagon.webp",
  "SUV / Джип": "/category-suv.webp",
  "Купе": "/category-coupe.webp",
  "Кабрио": "/category-convertible.webp",
  "Бусове": "/category-van.webp",
};
const euro = (n: number) => new Intl.NumberFormat("bg-BG").format(n) + " €";
const number = (n: number) => new Intl.NumberFormat("bg-BG").format(n);
const exteriorLabels: Record<Exterior, string> = { excellent: "Без забележки", normal: "Нормални следи от употреба", scratches: "Леки драскотини", dents: "Видими драскотини или вдлъбнатини", damage: "Сериозни външни забележки" };

const socialProfiles: { name: string; icon: string; href?: string }[] = [
  { name: "Instagram", icon: "instagram" },
  { name: "TikTok", icon: "tiktok" },
  { name: "Facebook", icon: "facebook", href: "https://www.facebook.com/share/1YHe2YxqSo/?mibextid=wwXIfr" },
  { name: "YouTube", icon: "youtube" },
];

function SocialIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.3" /></>,
    tiktok: <path d="M15 2h3c.4 2.5 1.8 4 4 4.5v3a9 9 0 0 1-4-1.5v8a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V2Z" />,
    facebook: <path d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5c-.7-.1-1.8-.3-3-.3-3.4 0-5 2-5 5.4V9H7v4h3v9h4Z" />,
    youtube: <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 8 6 4-6 4V8Z" fill="#0c111a" /></>,
  };
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paths[name]}</svg>;
}

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
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 17l.7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z" /></>,
    phone: <path d="M7 3H4a2 2 0 0 0-2 2c0 9.4 7.6 17 17 17a2 2 0 0 0 2-2v-3l-5-2-2 2a14 14 0 0 1-7-7l2-2-2-5Z" />,
    message: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function CarPhoto({ photo, imageUrl, className = "" }: { photo: number; imageUrl?: string; className?: string }) {
  return <div className={`car-photo ${imageUrl ? "" : `photo-${photo}`} ${className}`} style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} role="img" aria-label={imageUrl ? "Снимка на автомобила" : "Илюстративна снимка на автомобил"} />;
}

function PhotoGallery({ photo, imageUrls = [], className = "" }: { photo: number; imageUrls?: string[]; className?: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = imageUrls[selectedIndex] || imageUrls[0];
  return <div className={`photo-gallery ${className}`}>
    <div className="photo-stage">
      <CarPhoto photo={photo} imageUrl={selected} className="detail-photo" />
      {imageUrls.length > 1 && <>
        <button className="photo-arrow photo-arrow-prev" type="button" aria-label="Предишна снимка"
          onClick={() => setSelectedIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length)}>‹</button>
        <button className="photo-arrow photo-arrow-next" type="button" aria-label="Следваща снимка"
          onClick={() => setSelectedIndex((index) => (index + 1) % imageUrls.length)}>›</button>
      </>}
    </div>
    {imageUrls.length > 1 && <div className="photo-thumbnails" aria-label="Снимки на автомобила">
      {imageUrls.map((url, index) => <button key={index} type="button" className={selectedIndex === index ? "selected" : ""}
        onClick={() => setSelectedIndex(index)} aria-label={`Покажи снимка ${index + 1} от ${imageUrls.length}`} aria-pressed={selectedIndex === index}>
        <img src={url} alt="" loading="lazy" />
      </button>)}
    </div>}
  </div>;
}

function PriceGuide({ car, catalog, demo }: { car: Car; catalog: Car[]; demo: boolean }) {
  const comparable = catalog.filter((item) => item.id !== car.id &&
    item.make.trim().toLocaleLowerCase("bg") === car.make.trim().toLocaleLowerCase("bg") &&
    item.model.trim().toLocaleLowerCase("bg") === car.model.trim().toLocaleLowerCase("bg") &&
    item.fuel === car.fuel && item.gearbox === car.gearbox &&
    Math.abs(item.year - car.year) <= 3 && Math.abs(item.mileage - car.mileage) <= 60_000);
  const guide = estimateCar({ make: car.make, model: car.model, year: car.year,
    mileage: car.mileage, exterior: "normal" }, comparable, false);
  if (!guide) return <section className="price-guide" aria-label="Ориентир за цената">
    <strong>Ориентир за цената</strong>
    <p>Ще покажем сравнение, когато има поне 3 сходни обяви за този модел.</p>
  </section>;
  const ratio = car.price / guide.mid;
  const level = ratio < 0.9 ? "Изгодна цена" : ratio > 1.1 ? "Над ориентира" : "Близка до средната";
  const color = ratio < 0.9 ? "#17734a" : ratio > 1.1 ? "#b75235" : "#28754b";
  const needleAngle = Math.max(-82, Math.min(82, (ratio - 1) * 300));
  const arc = (start: number, end: number) => {
    const point = (degrees: number) => ({ x: 120 + 96 * Math.cos(degrees * Math.PI / 180), y: 116 + 96 * Math.sin(degrees * Math.PI / 180) });
    const from = point(start);
    const to = point(end);
    return `M ${from.x} ${from.y} A 96 96 0 0 1 ${to.x} ${to.y}`;
  };
  return <section className="price-guide" aria-label="Ориентир за цената">
    <strong>Ориентир за цената</strong>
    <div className="price-guide-summary">
      <div><b>{euro(car.price)}</b><p>Обявена цена</p></div>
      <div className="price-guide-gauge" role="img" aria-label={`${level}: ${euro(car.price)} при ориентир ${euro(guide.mid)}`}>
        <svg viewBox="0 0 240 125" aria-hidden="true" focusable="false">
          <path d={arc(180, 222)} stroke="#83d5a2" />
          <path d={arc(225, 267)} stroke="#2c8550" />
          <path d={arc(270, 312)} stroke="#f0c663" />
          <path d={arc(315, 360)} stroke="#ef9b6c" />
          <g transform={`rotate(${needleAngle} 120 116)`}><path className="price-guide-needle" d="M120 30 L113 110 Q113 119 120 119 Q127 119 127 110 Z" /></g>
        </svg>
        <span className="price-guide-verdict" style={{ backgroundColor: color }}>{level}</span>
      </div>
    </div>
    <p>Ориентир: {euro(guide.mid)} · приблизителен диапазон {euro(guide.low)} – {euro(guide.high)}.</p>
    <small>Сравнени са {guide.count} {demo ? "примерни" : "активни"} обяви за същия модел, гориво и скоростна кутия с близки година и пробег. Това са обявени, а не продажни цени; оборудването и техническото състояние не са отчетени.</small>
  </section>;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [advanced, setAdvanced] = useState(false);
  const [selectedId, setSelectedId] = useState<number | string>(1);
  const [favorites, setFavorites] = useState<(number | string)[]>([]);
  const [compareIds, setCompareIds] = useState<(number | string)[]>([]);
  const [drafts, setDrafts] = useState<Car[]>([]);
  const [liveCars, setLiveCars] = useState<Car[]>([]);
  const [myListings, setMyListings] = useState<ListingRow[]>([]);
  const [pendingListings, setPendingListings] = useState<ListingRow[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [sentInquiryIds, setSentInquiryIds] = useState<string[]>([]);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryNotice, setInquiryNotice] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [photos, setPhotos] = useState<File[]>([]);
  const [editingListing, setEditingListing] = useState<ListingRow | null>(null);
  const [retainedPhotos, setRetainedPhotos] = useState<{ path: string; url?: string }[]>([]);
  const [photoInputVersion, setPhotoInputVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [listingError, setListingError] = useState("");
  const [valuationForm, setValuationForm] = useState<{ make: string; model: string; year: string; mileage: string; fuel: string; gearbox: string; exterior: Exterior }>({ make: "", model: "", year: "", mileage: "", fuel: "", gearbox: "", exterior: "normal" });
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [valuationSubmitted, setValuationSubmitted] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string; demo?: boolean }[]>([
    { role: "assistant", content: "Здравей! Мога да помогна да потърсиш кола сред наличните обяви или да те насоча към оценката.", demo: true },
  ]);
  const [sort, setSort] = useState("newest");
  useEffect(() => { if (!filters.originCity && sort === "distanceAsc") setSort("newest"); }, [filters.originCity, sort]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [draftForm, setDraftForm] = useState({ make: "", model: "", year: "", mileage: "", price: "", fuel: "Бензин", gearbox: "Ръчна", emissionClass: "", co2GKm: "", city: "", body: "Седан", details: "", contactPhone: "" });

  useEffect(() => {
    if (editingListing && user?.id !== editingListing.seller_id) resetListingForm();
  }, [user, editingListing]);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("syu-favorites") || "[]"));
      setDrafts(JSON.parse(localStorage.getItem("syu-drafts") || "[]"));
      const savedCompare = JSON.parse(localStorage.getItem("syu-compare") || "[]");
      if (Array.isArray(savedCompare)) setCompareIds(savedCompare.filter((id) => typeof id === "string" || typeof id === "number").slice(0, 3));
    } catch { /* Ignore outdated local data. */ }
  }, []);

  useEffect(() => {
    if (!user || !marketplace) { setMyListings([]); setPendingListings([]); setInquiries([]); setSentInquiryIds([]); return; }
    let active = true;
    Promise.all([loadMyListings(user.id), user.app_metadata?.role === "admin" ? loadPendingListings() : Promise.resolve([])])
      .then(async ([own, pending]) => {
        if (!active) return;
        setMyListings(own); setPendingListings(pending);
        const [received, sent] = await Promise.all([
          loadListingInquiries(own.map((row) => row.id)),
          marketplace.from("listing_inquiries").select("listing_id").eq("buyer_id", user.id).limit(100),
        ]);
        if (sent.error) throw sent.error;
        if (active) { setInquiries(received); setSentInquiryIds((sent.data || []).map((row) => row.listing_id)); }
      })
      .catch(() => { if (active) setListingError("Не успяхме да заредим обявите в профила."); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!marketplace) return;
    let active = true;
    marketplace.auth.getUser().then(({ data }) => { if (active) setUser(data.user); });
    const { data: subscription } = marketplace.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    loadActiveListings().then((rows) => {
      if (active) {
        setLiveCars(rows.map((row) => ({ id: row.id, make: row.make, model: row.model,
        title: `${row.make} ${row.model}`, year: row.year, mileage: row.mileage_km, price: row.price_eur,
        fuel: row.fuel, gearbox: row.gearbox, emissionClass: row.emission_class, co2GKm: row.co2_g_km, city: row.city, body: row.body,
        photo: 0, imageUrl: row.imageUrl, imageUrls: row.imageUrls, details: row.details, sellerId: row.seller_id, contactPhone: row.contact_phone })));
        const returnId = localStorage.getItem("mmc-return-listing");
        if (returnId && rows.some((row) => row.id === returnId)) {
          localStorage.removeItem("mmc-return-listing");
          setSelectedId(returnId);
          setView("detail");
        }
      }
    }).catch(() => { if (active) setListingError("Обявите не могат да се заредят в момента."); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  const cars = useMemo(() => marketplace ? liveCars : [...drafts, ...demoCars], [liveCars, drafts]);
  const matches = useMemo(() => cars.filter((car) =>
    (!filters.make || car.make === filters.make) &&
    (!filters.model || car.model.toLocaleLowerCase("bg").includes(filters.model.toLocaleLowerCase("bg"))) &&
    (!filters.min || car.price >= Number(filters.min)) &&
    (!filters.max || car.price <= Number(filters.max)) &&
    (!filters.fuel || car.fuel === filters.fuel) &&
    (!filters.city || car.city === filters.city) &&
    (!filters.body || car.body === filters.body) &&
    (!filters.year || car.year >= Number(filters.year)) &&
    (!filters.yearMax || car.year <= Number(filters.yearMax)) &&
    (!filters.mileageMin || car.mileage >= Number(filters.mileageMin)) &&
    (!filters.mileageMax || car.mileage <= Number(filters.mileageMax)) &&
    (!filters.radiusKm || !filters.originCity || (distanceBetweenCitiesKm(filters.originCity, car.city) ?? Infinity) <= Number(filters.radiusKm)) &&
    (!filters.gearbox || car.gearbox === filters.gearbox) &&
    (!filters.emissionClass || emissionClassOf(car) === filters.emissionClass)
  ).sort((a, b) => sort === "priceAsc" ? a.price - b.price : sort === "priceDesc" ? b.price - a.price :
    sort === "mileageAsc" ? a.mileage - b.mileage : sort === "yearDesc" ? b.year - a.year :
    sort === "distanceAsc" && filters.originCity ? (distanceBetweenCitiesKm(filters.originCity, a.city) ?? Infinity) - (distanceBetweenCitiesKm(filters.originCity, b.city) ?? Infinity) : 0), [cars, filters, sort]);

  const selected = cars.find((car) => car.id === selectedId) || cars[0];
  const shownCars = view === "favorites" ? cars.filter((car) => favorites.includes(car.id)) : matches;
  const makes = [...new Set(cars.map((car) => car.make))].sort();
  const comparedCars = compareIds.map((id) => cars.find((car) => car.id === id)).filter((car): car is Car => !!car);

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseAuthMode(mode: "login" | "register") {
    setAuthMode(mode);
    setNotice("");
    setListingError("");
  }
  function openAuth(mode: "login" | "register") {
    chooseAuthMode(mode);
    navigate("post");
  }
  function updateFilter(key: keyof Filters, value: string) {
    setFilters((old) => ({ ...old, [key]: value, ...(key === "make" ? { model: "" } : {}), ...(key === "originCity" && !value ? { radiusKm: "" } : {}) }));
    if (key === "originCity" && !value && sort === "distanceAsc") setSort("newest");
  }
  function runSearch(event?: FormEvent) {
    event?.preventDefault();
    navigate("results");
  }
  function toggleFavorite(id: number | string) {
    setFavorites((old) => {
      const next = old.includes(id) ? old.filter((item) => item !== id) : [...old, id];
      localStorage.setItem("syu-favorites", JSON.stringify(next));
      return next;
    });
  }
  function toggleCompare(id: number | string) {
    if (!compareIds.includes(id) && comparedCars.length >= 3) {
      setNotice("Можеш да сравниш до 3 автомобила. Махни един от избраните, за да добавиш друг.");
      return;
    }
    setCompareIds((old) => {
      if (old.includes(id)) {
        const next = old.filter((item) => item !== id);
        localStorage.setItem("syu-compare", JSON.stringify(next));
        return next;
      }
      const next = [...old.filter((item) => cars.some((car) => car.id === item)), id];
      localStorage.setItem("syu-compare", JSON.stringify(next));
      return next;
    });
    setNotice("");
  }
  function openCar(id: number | string) { setSelectedId(id); navigate("detail"); }
  async function sendSignIn(event: FormEvent) {
    event.preventDefault();
    if (!marketplace || busy) return;
    if (view === "detail" && selected && typeof selected.id === "string") {
      localStorage.setItem("mmc-return-listing", selected.id);
    }
    setBusy(true); setListingError(""); setNotice("");
    try {
      const { error } = await marketplace.auth.signInWithOtp({ email: email.trim(),
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: authMode === "register" } });
      if (error) {
        setNotice(error.status === 429 || error.code === "over_email_send_rate_limit"
          ? "Достигнат е лимитът за изпращане на имейли. Изчакай преди нов опит и провери вече получените писма."
          : authMode === "login"
            ? "Не успяхме да изпратим линк за вход. Провери имейла си. Ако нямаш профил, избери „Регистрация“."
            : "Не успяхме да изпратим линк за регистрация. Опитай отново по-късно.");
      } else {
        setNotice(authMode === "register"
          ? "Провери имейла си и отвори линка, за да потвърдиш регистрацията и да влезеш. Ако вече имаш профил, линкът ще те въведе в него."
          : "Ако имаш профил с този имейл, ще получиш линк за вход. Провери и папката „Спам“.");
      }
    } catch {
      setNotice("Не успяхме да се свържем. Провери интернет връзката и опитай отново.");
    } finally { setBusy(false); }
  }

  function AuthForm({ inquiry = false }: { inquiry?: boolean } = {}) {
    return <form className="post-form signin-form" onSubmit={sendSignIn}>
      <div className="auth-modes" role="group" aria-label="Избери вход или регистрация">
        <button type="button" aria-pressed={authMode === "login"} disabled={busy} onClick={() => chooseAuthMode("login")}>Вход</button>
        <button type="button" aria-pressed={authMode === "register"} disabled={busy} onClick={() => chooseAuthMode("register")}>Регистрация</button>
      </div>
      <h2>{authMode === "login" ? "Вход в профила" : "Създай профил"}</h2>
      <p>{authMode === "login" ? "Въведи имейла на съществуващия си профил. Ще получиш сигурен линк за вход, без парола." : "Въведи имейла си, за да създадеш нов профил. Потвърди го чрез линка, който ще получиш по имейл."}</p>
      {inquiry && <p>След вход ще се върнеш към тази обява, за да изпратиш запитване.</p>}
      <label>Имейл<input type="email" autoComplete="email" required disabled={busy} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Изпращане…" : authMode === "login" ? "Изпрати линк за вход" : "Изпрати линк за регистрация"}</button>
      {inquiry && notice && <p role="status">{notice}</p>}
    </form>;
  }

  async function sendInquiry(event: FormEvent) {
    event.preventDefault();
    if (!marketplace || !user?.email || !selected || typeof selected.id !== "string" || busy) return;
    setBusy(true); setInquiryNotice("");
    const { error } = await marketplace.from("listing_inquiries").insert({
      listing_id: selected.id, buyer_id: user.id, contact_email: user.email, message: inquiryMessage.trim(),
    });
    if (error) setInquiryNotice(error.code === "23505" ? "Вече си изпратил запитване за тази обява." : "Не успяхме да изпратим запитването. Опитай отново.");
    else {
      setSentInquiryIds((old) => [...old, selected.id as string]);
      setInquiryMessage("");
      setInquiryNotice("Запитването е изпратено. Продавачът ще го види в профила си.");
    }
    setBusy(false);
  }

  function resetListingForm() {
    setEditingListing(null);
    setRetainedPhotos([]);
    setPhotos([]);
    setPhotoInputVersion((old) => old + 1);
    setDraftForm({ make: "", model: "", year: "", mileage: "", price: "", fuel: "Бензин", gearbox: "Ръчна", emissionClass: "", co2GKm: "", city: "", body: "Седан", details: "", contactPhone: "" });
  }

  async function startEditingListing(row: ListingRow) {
    if (!marketplace || !user || row.seller_id !== user.id || row.status === "archived" || busy) return;
    if (editingListing && !window.confirm("Да заменим ли незаписаните промени с избраната обява?")) return;
    setBusy(true); setListingError(""); setNotice("");
    try {
      const images = await Promise.all(row.photo_paths.map(async (path) => {
        const { data } = await marketplace.storage.from("car-photos").createSignedUrl(path, 3600);
        return { path, url: data?.signedUrl };
      }));
      setEditingListing(row);
      setRetainedPhotos(images);
      setPhotos([]); setPhotoInputVersion((old) => old + 1);
      setDraftForm({ make: row.make, model: row.model, year: String(row.year), mileage: String(row.mileage_km),
        price: String(row.price_eur), fuel: row.fuel, gearbox: row.gearbox, emissionClass: row.emission_class || "",
        co2GKm: row.co2_g_km == null ? "" : String(row.co2_g_km), city: row.city, body: row.body,
        details: row.details, contactPhone: row.contact_phone || "" });
      setTimeout(() => document.getElementById("listing-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch { setListingError("Не успяхме да отворим обявата за редактиране. Опитай отново."); }
    finally { setBusy(false); }
  }

  async function saveLiveListing(event: FormEvent) {
    event.preventDefault();
    if (!marketplace || !user || busy) return;
    if (editingListing && editingListing.seller_id !== user.id) return;
    if (retainedPhotos.length + photos.length > 8) {
      setListingError("Обявата може да има до 8 снимки. Премахни някоя преди да запишеш."); return;
    }
    const enteredPhone = draftForm.contactPhone.replace(/[\s()-]/g, "");
    const contactPhone = enteredPhone.startsWith("0") ? `+359${enteredPhone.slice(1)}` : enteredPhone;
    if (contactPhone && !/^\+[1-9][0-9]{7,14}$/.test(contactPhone)) {
      setListingError("Въведи телефон с международен код, например +359 87 123 4567, или остави полето празно.");
      return;
    }
    setBusy(true); setListingError(""); setNotice("");
    const uploadedPaths: string[] = [];
    try {
      const fields = {
        make: draftForm.make.trim(), model: draftForm.model.trim(),
        year: Number(draftForm.year), mileage_km: Number(draftForm.mileage), price_eur: Number(draftForm.price),
        fuel: draftForm.fuel, gearbox: draftForm.gearbox,
        emission_class: draftForm.fuel === "Електрически" ? zeroEmissions : draftForm.emissionClass || null,
        co2_g_km: draftForm.fuel === "Електрически" ? 0 : draftForm.co2GKm === "" ? null : Number(draftForm.co2GKm),
        city: draftForm.city.trim(), body: draftForm.body, contact_phone: contactPhone || null,
        details: draftForm.details.trim()
      };
      let listingId = editingListing?.id;
      if (!listingId) {
        const { data, error } = await marketplace.from("car_listings").insert({ ...fields, seller_id: user.id, status: "draft" }).select("id").single();
        if (error || !data) throw error || new Error("Обявата не е запазена.");
        listingId = data.id;
      }
      const paths: string[] = retainedPhotos.map((photo) => photo.path);
      for (const file of photos) {
        const prepared = await preparePhoto(file);
        const uploaded = await marketplace.functions.invoke("secure-car-photo", {
          body: prepared, headers: { "Content-Type": "image/jpeg", "x-listing-id": listingId },
        });
        if (uploaded.error || typeof uploaded.data?.path !== "string") {
          let message = "Не успяхме да проверим снимката. Опитай отново.";
          if (uploaded.error && "context" in uploaded.error && uploaded.error.context instanceof Response) {
            const detail = await uploaded.error.context.json().catch(() => null);
            if (typeof detail?.error === "string") message = detail.error;
          }
          throw new Error(message);
        }
        const path = uploaded.data.path;
        paths.push(path); uploadedPaths.push(path);
      }
      let update = marketplace.from("car_listings").update({ ...fields, photo_paths: paths, status: "pending" })
        .eq("id", listingId).eq("seller_id", user.id);
      if (editingListing) update = update.eq("updated_at", editingListing.updated_at).eq("status", editingListing.status);
      const updated = await update.select("id").single();
      if (updated.error) throw new Error(editingListing && updated.error.code === "PGRST116"
        ? "Обявата е променена междувременно. Презареди страницата и отвори редакцията отново." : updated.error.message);
      uploadedPaths.length = 0;
      setLiveCars((old) => old.filter((car) => car.id !== listingId));
      resetListingForm();
      try {
        const [own, pending] = await Promise.all([loadMyListings(user.id), user.app_metadata?.role === "admin" ? loadPendingListings() : Promise.resolve([])]);
        setMyListings(own); setPendingListings(pending);
      }
      catch { setListingError("Обявата е изпратена, но списъкът в профила не се обнови. Презареди страницата."); }
      setNotice(editingListing ? "Промените са запазени. Обявата чака повторно одобрение и временно не се вижда публично." : "Обявата е изпратена за преглед. Ще се вижда публично след одобрение.");
    } catch (error) {
      if (uploadedPaths.length) await marketplace.storage.from("car-photos").remove(uploadedPaths).catch(() => { /* Unreferenced uploads remain private if cleanup fails. */ });
      setListingError(`${editingListing ? "Не успяхме да запазим промените" : "Не успяхме да изпратим обявата"}: ${error instanceof Error ? error.message : "Опитай отново."}`);
    } finally { setBusy(false); }
  }

  async function moderateListing(id: string, status: "active" | "archived") {
    if (!marketplace || user?.app_metadata?.role !== "admin" || busy) return;
    setBusy(true); setListingError("");
    const { error } = await marketplace.from("car_listings").update({ status }).eq("id", id).eq("status", "pending").select("id").single();
    if (error) setListingError(`Не успяхме да променим обявата: ${error.message}`);
    else {
      setPendingListings((old) => old.filter((row) => row.id !== id));
      if (status === "active") {
        try {
          const rows = await loadActiveListings();
          setLiveCars(rows.map((row) => ({ id: row.id, make: row.make, model: row.model,
            title: `${row.make} ${row.model}`, year: row.year, mileage: row.mileage_km, price: row.price_eur,
            fuel: row.fuel, gearbox: row.gearbox, emissionClass: row.emission_class, co2GKm: row.co2_g_km, city: row.city, body: row.body,
            photo: 0, imageUrl: row.imageUrl, imageUrls: row.imageUrls, details: row.details, sellerId: row.seller_id, contactPhone: row.contact_phone })));
        } catch { setListingError("Обявата е одобрена, но каталогът не се обнови. Презареди страницата."); }
      }
      setNotice(status === "active" ? "Обявата е одобрена и вече е публична." : "Обявата е отхвърлена.");
    }
    setBusy(false);
  }

  async function removeMyListing(row: ListingRow) {
    if (!marketplace || !user || row.seller_id !== user.id || busy) return;
    const published = row.status === "active";
    if (!window.confirm(published ? "Да свалим ли тази обява от сайта?" : "Да изтрием ли тази обява?")) return;
    setBusy(true); setListingError(""); setNotice("");
    const result = published
      ? await marketplace.from("car_listings").update({ status: "archived" }).eq("id", row.id).eq("seller_id", user.id).eq("status", "active").select("id").single()
      : await marketplace.from("car_listings").delete().eq("id", row.id).eq("seller_id", user.id).in("status", ["draft", "pending"]).select("id").single();
    if (result.error) setListingError(`Не успяхме да премахнем обявата: ${result.error.message}`);
    else {
      if (editingListing?.id === row.id) resetListingForm();
      setMyListings((old) => published ? old.map((item) => item.id === row.id ? { ...item, status: "archived" } : item) : old.filter((item) => item.id !== row.id));
      setLiveCars((old) => old.filter((item) => item.id !== row.id));
      setNotice(published ? "Обявата е свалена от сайта." : "Обявата е изтрита.");
    }
    setBusy(false);
  }

  function selectPhotos(files: FileList | null) {
    const chosen = Array.from(files || []);
    if (chosen.length + retainedPhotos.length > 8 || chosen.some((file) => file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setListingError("Добави до 8 снимки във формат JPG, PNG или WebP, всяка до 5 MB.");
      setPhotos([]); return;
    }
    setListingError(""); setPhotos(chosen);
  }

  function saveDraft(event: FormEvent) {
    event.preventDefault();
    const newCar: Car = {
      id: Date.now(), make: draftForm.make.trim(), model: draftForm.model.trim(),
      title: `${draftForm.make.trim()} ${draftForm.model.trim()}`, year: Number(draftForm.year),
      mileage: Number(draftForm.mileage), price: Number(draftForm.price), fuel: draftForm.fuel,
      gearbox: draftForm.gearbox, emissionClass: draftForm.fuel === "Електрически" ? zeroEmissions : draftForm.emissionClass || null,
      co2GKm: draftForm.fuel === "Електрически" ? 0 : draftForm.co2GKm === "" ? null : Number(draftForm.co2GKm),
      city: draftForm.city.trim(), body: draftForm.body, photo: 0, draft: true,
    };
    const next = [newCar, ...drafts];
    setDrafts(next);
    localStorage.setItem("syu-drafts", JSON.stringify(next));
    setSelectedId(newCar.id);
    navigate("detail");
    setNotice("Черновата е запазена само в този браузър. За публични обяви ще добавим профили и база данни.");
  }

  function valueCar(event: FormEvent) {
    event.preventDefault();
    const result = estimateCar({ make: valuationForm.make.trim(), model: valuationForm.model.trim(),
      year: Number(valuationForm.year), mileage: Number(valuationForm.mileage), exterior: valuationForm.exterior }, cars.filter((car) =>
        !car.draft && !car.pending &&
        car.fuel === valuationForm.fuel && car.gearbox === valuationForm.gearbox &&
        Math.abs(car.year - Number(valuationForm.year)) <= 3 &&
        Math.abs(car.mileage - Number(valuationForm.mileage)) <= 60_000), !marketplace);
    setValuation(result);
    setValuationSubmitted(true);
  }

  function localAssistantReply(question: string) {
    const query = question.toLocaleLowerCase("bg");
    if (/оцен|струва|цена на моя/.test(query)) return "Отвори „Оцени и продай“ и въведи модел, година, пробег и външно състояние. При малко сравними обяви няма да показваме измислена пазарна цена.";
    if (/публику|прода|кач/.test(query)) return "От „Публикувай обява“ можеш да попълниш данните и снимките. При свързана база обявата се изпраща за преглед.";
    const budgetMatch = query.match(/до\s*([\d\s.,]+)\s*(?:€|евро)?/);
    const budget = budgetMatch ? Number(budgetMatch[1].replace(/[^\d]/g, "")) : null;
    const make = makes.find((name) => query.includes(name.toLocaleLowerCase("bg")));
    const fuel = ["дизел", "бензин", "хибрид", "електрически"].find((name) => query.includes(name));
    const city = [...new Set(cars.map((car) => car.city))].find((name) => query.includes(name.toLocaleLowerCase("bg")));
    const suggestions = cars.filter((car) => (!budget || car.price <= budget) && (!make || car.make === make) &&
      (!fuel || car.fuel.toLocaleLowerCase("bg") === fuel) && (!city || car.city === city)).slice(0, 3);
    if (!cars.length) return "Все още няма публикувани обяви. Опитай пак, когато се появят първите автомобили.";
    if (!suggestions.length) return "Няма съвпадение сред наличните обяви. Опитай с по-висок бюджет или друга марка.";
    return `${marketplace ? "В каталога има" : "В примерния каталог има"}: ${suggestions.map((car) => `${car.title} (${car.year}, ${euro(car.price)})`).join("; ")}. Използвай филтрите за повече подробности.`;
  }

  async function askAssistant(event: FormEvent) {
    event.preventDefault();
    const question = assistantInput.trim().slice(0, 500);
    if (!question || assistantBusy) return;
    setAssistantInput(""); setAssistantBusy(true);
    const previous = chat.slice(-6);
    setChat((old) => [...old, { role: "user", content: question }]);
    let answer = "";
    let demo = true;
    if (marketplace && user) {
      try {
        const { data } = await marketplace.auth.getSession();
        if (data.session?.access_token) {
          const response = await fetch("/api/assistant", { method: "POST", headers: {
            "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
            body: JSON.stringify({ message: question, history: previous.map(({ role, content }) => ({ role, content })) }) });
          if (response.ok) { const result = await response.json() as { answer?: string }; answer = result.answer || ""; demo = !answer; }
        }
      } catch { /* The local guide stays available when the AI service is offline. */ }
    }
    setChat((old) => [...old, { role: "assistant", content: answer || localAssistantReply(question), demo }]);
    setAssistantBusy(false);
  }

  function CarCard({ car }: { car: Car }) {
    return <article className="car-card">
      <button className="car-image-button" onClick={() => openCar(car.id)} aria-label={`Виж ${car.title}`}>
        <CarPhoto photo={car.photo} imageUrl={car.imageUrl} />
        <span className="image-label">{car.draft ? "ЛОКАЛНА ЧЕРНОВА" : marketplace ? "ОБЯВА" : "ПРИМЕРНА ОБЯВА"}</span>
      </button>
      <button className={`favorite-button ${favorites.includes(car.id) ? "is-favorite" : ""}`} onClick={() => toggleFavorite(car.id)} aria-label={favorites.includes(car.id) ? "Премахни от любими" : "Добави в любими"}><Icon name="heart" size={20} fill={favorites.includes(car.id) ? "currentColor" : "none"} /></button>
      <button className="car-card-body" onClick={() => openCar(car.id)}>
        <strong>{car.title}</strong>
        <span className="car-meta">{car.year} · {number(car.mileage)} км · {car.fuel}{emissionClassOf(car) ? ` · ${emissionClassOf(car)}` : ""}</span>
        <b className="price">{euro(car.price)}</b>
        <span className="car-location"><Icon name="pin" size={14} />{car.city}{filters.originCity && distanceBetweenCitiesKm(filters.originCity, car.city) !== null ? ` · около ${distanceBetweenCitiesKm(filters.originCity, car.city)} км от ${filters.originCity}` : ""}</span>
      </button>
      <button className={`compare-card-button ${compareIds.includes(car.id) ? "selected" : ""}`} onClick={() => toggleCompare(car.id)} aria-pressed={compareIds.includes(car.id)}>{compareIds.includes(car.id) ? "✓ Добавена за сравнение" : "+ Сравни"}</button>
    </article>;
  }

  function SellerContactActions({ car }: { car: Car }) {
    return <div className="seller-contact-actions">
      {car.contactPhone && <a className="seller-contact-call" href={`tel:${car.contactPhone}`}><Icon name="phone" size={19} /> Обади се</a>}
      <button type="button" className="seller-contact-message" onClick={() => document.getElementById("seller-message")?.scrollIntoView({ behavior: "smooth", block: "center" })}><Icon name="message" size={19} /> Съобщение</button>
    </div>;
  }

  return <div className="site-shell">
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => navigate("home")} aria-label="MMC AUTO начало"><span><em>MMC</em> AUTO</span><small>Твоят път към следващата кола</small></button>
        <nav className={`main-nav ${mobileMenu ? "open" : ""}`} aria-label="Основна навигация">
          <button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}>Начало</button>
          <button className={view === "results" ? "active" : ""} onClick={() => { setFilters(initialFilters); navigate("results"); }}>Обяви</button>
          <button onClick={() => { navigate("home"); setTimeout(() => document.getElementById("search")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Търсене</button>
          <button className={view === "valuation" ? "active" : ""} onClick={() => navigate("valuation")}>Оцени и продай</button>
          <button className={view === "favorites" ? "active" : ""} onClick={() => navigate("favorites")}>Любими {favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>
          <button className={view === "compare" ? "active" : ""} onClick={() => navigate("compare")}>Сравни {comparedCars.length > 0 && <span className="nav-count">{comparedCars.length}</span>}</button>
          {user ? <button className={view === "post" ? "active" : ""} onClick={() => navigate("post")}>Моите обяви</button> : <>
            <button className={view === "post" && authMode === "login" ? "active" : ""} onClick={() => openAuth("login")}>Вход</button>
            <button className={view === "post" && authMode === "register" ? "active" : ""} onClick={() => openAuth("register")}>Регистрация</button>
          </>}
          <a href="/contact">Контакти</a>
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
        <span className="eyebrow">MMC AUTO · АВТОМОБИЛИ В БЪЛГАРИЯ</span>
        <h1>Намери автомобила,<br />който <span>търсиш.</span></h1>
        <p>Разгледай обяви, сравни предложенията и запази любимите си автомобили на едно място.</p>
        <div className="hero-points"><span><Icon name="car" size={25} /> Лесно търсене</span><span><Icon name="heart" size={24} /> Запазени обяви</span><span><Icon name="shield" size={25} /> Ясна информация</span></div>
      </div></div></section>
      <div className="home-search page-width" id="search">{SearchForm()}</div>
      <main className="page-width home-content">
        <section className="valuation-promo"><div><span className="section-kicker">ОЦЕНИ И ПРОДАЙ</span><h2>Твоята кола. Следващата стъпка.</h2><p>Провери ценовия ориентир и подготви своята обява.</p></div><button className="primary-button" onClick={() => navigate("valuation")}>Започни сега <Icon name="arrow" size={17} /></button></section>
        <div className="section-head listings-head"><div><span className="section-kicker">ПЪРВА ВЕРСИЯ</span><h2>{marketplace ? "Последни обяви" : "Примерни обяви"}</h2><p>{marketplace ? "Обявите се показват след преглед." : "Данните и снимките тук са демонстрационни."}</p></div><button className="text-link" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Виж всички <Icon name="arrow" size={17} /></button></div>
        {cars.length ? <div className="cards-grid">{cars.slice(0, 4).map((car) => <CarCard car={car} key={car.id} />)}</div> : <div className="empty-state"><Icon name="car" size={36} /><h2>Очакваме първите обяви</h2><p>Публикуваните след преглед автомобили ще се появят тук.</p></div>}
        {listingError && <p role="alert" className="notice">{listingError}</p>}<div className="benefits"><div><Icon name="search" size={30} /><strong>Търсене с филтри</strong><p>Марка, бюджет, гориво и още.</p></div><div><Icon name="heart" size={30} /><strong>Любими автомобили</strong><p>Запази интересните обяви.</p></div><div><Icon name="car" size={30} /><strong>Обяви на едно място</strong><p>Разгледай детайлите удобно.</p></div><div><Icon name="plus" size={30} /><strong>Подготви обява</strong><p>{marketplace ? "Изпрати за преглед." : "Създай чернова в браузъра."}</p></div></div>
      </main>
    </>}

    {view === "compare" && <main className="page-width interior compare-page"><div className="interior-heading"><span className="section-kicker">MMC AUTO · СРАВНЕНИЕ</span><h1>Сравни автомобили</h1><p>Избери до 3 автомобила от обявите. Данните са от публикуваното от продавачите; примерните обяви са демонстрационни.</p></div>
      {comparedCars.length ? <div className="compare-scroll" role="region" aria-label="Сравнение на автомобили" tabIndex={0}><table className="compare-table"><thead><tr><th scope="col">Характеристика</th>{comparedCars.map((car) => <th scope="col" key={car.id}><CarPhoto photo={car.photo} imageUrl={car.imageUrl} /><strong>{car.title}</strong><button onClick={() => toggleCompare(car.id)} aria-label={`Премахни ${car.title} от сравнение`}>Премахни</button></th>)}</tr></thead><tbody>
      {([ ["Цена", (car: Car) => euro(car.price)], ["Година", (car: Car) => String(car.year)], ["Пробег", (car: Car) => `${number(car.mileage)} км`], ["Гориво", (car: Car) => car.fuel], ["Екологична категория", (car: Car) => emissionClassOf(car) || "Не е посочена"], ["CO₂", (car: Car) => co2Of(car) == null ? "Не е посочено" : `${co2Of(car)} г/км`], ["Скоростна кутия", (car: Car) => car.gearbox], ["Купе", (car: Car) => car.body], ["Град", (car: Car) => car.city] ] as [string, (car: Car) => string][]).map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{comparedCars.map((car) => <td key={car.id}>{value(car)}</td>)}</tr>)}
        <tr><th scope="row">Обява</th>{comparedCars.map((car) => <td key={car.id}><button className="text-link" onClick={() => openCar(car.id)}>Виж детайли <Icon name="arrow" size={15} /></button></td>)}</tr>
      </tbody></table></div> : <div className="empty-state"><Icon name="car" size={38} /><h2>Още няма избрани автомобили</h2><p>Избери „Сравни“ под обявите, които те интересуват.</p><button className="primary-button" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Разгледай обявите</button></div>}
    </main>}

    {(view === "results" || view === "favorites") && <main className="page-width interior"><div className="interior-heading"><div><span className="section-kicker">MMC AUTO · {marketplace ? "ОБЯВИ" : "ДЕМО КАТАЛОГ"}</span><h1>{view === "favorites" ? "Любими автомобили" : "Автомобили"}</h1><p>{view === "favorites" ? `${shownCars.length} ${shownCars.length === 1 ? "запазена обява" : "запазени обяви"} в този браузър` : `${shownCars.length} ${shownCars.length === 1 ? "резултат" : "резултата"} ${marketplace ? "в каталога" : "от примерните обяви и твоите чернови"}`}</p></div></div>
      {view === "results" && <div className="results-search">{SearchForm()}</div>}
      <div className="results-toolbar"><span>{shownCars.length} {shownCars.length === 1 ? "обява" : "обяви"}</span>{view === "results" && <label>Подреди по <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Най-нови</option><option value="priceAsc">Цена: ниска към висока</option><option value="priceDesc">Цена: висока към ниска</option><option value="mileageAsc">Най-малък пробег</option><option value="yearDesc">Най-нова година</option><option value="distanceAsc" disabled={!filters.originCity}>Най-близо до мен</option></select></label>}</div>
      {shownCars.length ? <div className="cards-grid results-grid">{shownCars.map((car) => <CarCard car={car} key={car.id} />)}</div> : <div className="empty-state"><Icon name={view === "favorites" ? "heart" : "search"} size={38} /><h2>{view === "favorites" ? "Още нямаш любими обяви" : "Няма съвпадения"}</h2><p>{view === "favorites" ? "Натисни сърцето на автомобил, който ти харесва." : "Промени някой от филтрите, за да видиш повече автомобили."}</p><button className="primary-button" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Разгледай обявите</button></div>}
    </main>}

    {view === "detail" && selected && <main className="page-width interior detail-page"><button className="back-link" onClick={() => navigate("results")}>← Обратно към обявите</button>{notice && <div className="notice">{notice}</div>}<div className="detail-layout"><div><PhotoGallery key={selected.id} photo={selected.photo} imageUrls={selected.imageUrls || (selected.imageUrl ? [selected.imageUrl] : [])} /><p className="photo-note">{selected.draft ? "Черновата използва илюстративна снимка." : marketplace ? selected.imageUrl ? "Снимка, качена от продавача." : "Все още няма добавена снимка." : "Демонстрационна обява · снимката е илюстративна."}</p></div><div className="detail-panel"><span className="section-kicker">{selected.draft ? "ЛОКАЛНА ЧЕРНОВА" : marketplace ? "ОБЯВА" : "ПРИМЕРНА ОБЯВА"}</span><h1>{selected.title}</h1><p className="detail-price">{euro(selected.price)}</p><p className="detail-city"><Icon name="pin" size={17} />{selected.city}</p>{marketplace && !selected.draft && (!user || user.id !== selected.sellerId) && <section className="seller-contact"><h2>Връзка с продавача</h2><SellerContactActions car={selected} />{!selected.contactPhone && <p>Продавачът не е посочил телефон. Изпрати му съобщение.</p>}</section>}<PriceGuide car={selected} catalog={cars} demo={!marketplace} /><div className="spec-grid"><span>Година<strong>{selected.year}</strong></span><span>Пробег<strong>{number(selected.mileage)} км</strong></span><span>Гориво<strong>{selected.fuel}</strong></span><span>Скоростна кутия<strong>{selected.gearbox}</strong></span><span>Купе<strong>{selected.body}</strong></span><span>Екологична категория<strong>{emissionClassOf(selected) || "Не е посочена"}</strong></span><span>CO₂<strong>{co2Of(selected) == null ? "Не е посочено" : `${co2Of(selected)} г/км`}</strong></span></div><button className="primary-button wide" onClick={() => toggleFavorite(selected.id)}><Icon name="heart" size={19} fill={favorites.includes(selected.id) ? "currentColor" : "none"} />{favorites.includes(selected.id) ? "Запазено в любими" : "Запази в любими"}</button><button className="compare-detail-button" onClick={() => toggleCompare(selected.id)} aria-pressed={compareIds.includes(selected.id)}>{compareIds.includes(selected.id) ? "✓ Добавена за сравнение" : "+ Добави за сравнение"}</button>{selected.details && <p className="detail-description">{selected.details}</p>}{marketplace && !selected.draft && <section id="seller-message" className="inquiry-panel"><h2>Съобщение до продавача</h2>
        {!user ? AuthForm({ inquiry: true })
        : user.id === selected.sellerId ? <p>Това е твоята обява.</p>
        : sentInquiryIds.includes(String(selected.id)) ? <p>Вече си изпратил запитване за тази обява.</p>
        : <form onSubmit={sendInquiry}><label>Съобщение до продавача<textarea required minLength={10} maxLength={2000} rows={4} value={inquiryMessage} onChange={(event) => setInquiryMessage(event.target.value)} placeholder="Здравейте, автомобилът още ли е наличен?" /></label><p>Имейлът ти ({user.email}) ще бъде показан на продавача, за да може да ти отговори.</p><button className="primary-button" type="submit" disabled={busy}>{busy ? "Изпращане…" : "Изпрати запитване"}</button></form>}
        {inquiryNotice && <p role="status" className="inquiry-notice">{inquiryNotice}</p>}
      </section>}{!marketplace && <div className="detail-hint">Примерна обява — запитванията са достъпни за реалните обяви.</div>}</div></div>{marketplace && !selected.draft && (!user || user.id !== selected.sellerId) && <div className="seller-contact-dock"><SellerContactActions car={selected} /></div>}</main>}

    {view === "valuation" && <main className="page-width valuation-page">
      <section className="sell-hero" aria-labelledby="sell-title">
        <div className="sell-hero-copy"><span className="section-kicker">MMC AUTO · ОЦЕНИ И ПРОДАЙ</span><h1 id="sell-title">Колко струва<br /><span>твоята кола?</span></h1><p>Разбери откъде да започнеш.<br />Подготви обявата си с увереност.</p><button className="primary-button sell-start" onClick={() => document.getElementById("valuation-details")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Започни оценката <Icon name="arrow" size={20} /></button><div className="sell-benefits"><span><Icon name="shield" size={18} /> Без регистрация за оценката</span><span><Icon name="tag" size={18} /> Ти определяш цената</span></div></div>
        <div className="sell-hero-visual" aria-hidden="true"><span className="sell-visual-label">ГОТОВА ЗА СЛЕДВАЩАТА СИ ИСТОРИЯ</span><div className="sell-car-orbit"><img src="/category-sedan.webp" alt="" /></div><div className="sell-visual-card"><span className="sell-visual-icon"><Icon name="car" size={24} /></span><div><small>ТВОЯТ АВТОМОБИЛ</small><strong>От оценката до обявата</strong></div><Icon name="arrow" size={22} /></div></div>
      </section>
      <section className="sell-process" aria-labelledby="sell-process-title"><div className="sell-section-heading"><span className="section-kicker">КАК РАБОТИ</span><h2 id="sell-process-title">Три стъпки към твоята обява</h2></div><ol className="sell-steps"><li><span className="sell-step-number">01</span><Icon name="car" size={25} /><h3>Разкажи за колата</h3><p>Марка, модел, година и пробег. Започни с най-важното.</p></li><li><span className="sell-step-number">02</span><Icon name="tag" size={25} /><h3>Виж ценовия ориентир</h3><p>Диапазон от сходни обяви, когато има достатъчно данни.</p></li><li><span className="sell-step-number">03</span><Icon name="plus" size={25} /><h3>Подготви обявата</h3><p>Добави снимки и описание. Изпрати я за преглед.</p></li></ol></section>
      <section id="valuation-details" className="sell-details" aria-labelledby="valuation-details-title"><div className="sell-section-heading"><span className="section-kicker">ДА ЗАПОЧВАМЕ</span><h2 id="valuation-details-title">Кой автомобил продаваш?</h2><p>Попълни данните ръчно, за да потърсим сходни обяви.</p></div>
      <div className="valuation-layout"><form className="post-form valuation-form" onSubmit={valueCar}><div className="sell-form-heading"><span>01 / ДАННИ ЗА АВТОМОБИЛА</span><Icon name="car" size={22} /></div><div className="form-grid">
        <label>Марка<input required list="valuation-makes" value={valuationForm.make} onChange={(event) => { setValuationForm({ ...valuationForm, make: event.target.value, model: "" }); setValuationSubmitted(false); setValuation(null); }} placeholder="Напр. Toyota" /><datalist id="valuation-makes">{makes.map((make) => <option key={make} value={make} />)}</datalist></label>
        <label>Модел<input required list="valuation-models" value={valuationForm.model} onChange={(event) => { setValuationForm({ ...valuationForm, model: event.target.value }); setValuationSubmitted(false); setValuation(null); }} placeholder="Напр. Corolla" /><datalist id="valuation-models">{[...new Set(cars.filter((car) => car.make.toLocaleLowerCase("bg") === valuationForm.make.toLocaleLowerCase("bg")).map((car) => car.model))].map((model) => <option key={model} value={model} />)}</datalist></label>
        <label>Година<input required type="number" min="1980" max={new Date().getFullYear() + 1} value={valuationForm.year} onChange={(event) => { setValuationForm({ ...valuationForm, year: event.target.value }); setValuationSubmitted(false); setValuation(null); }} placeholder="Напр. 2020" /></label>
        <label>Пробег (км)<input required type="number" min="0" max="1000000" value={valuationForm.mileage} onChange={(event) => { setValuationForm({ ...valuationForm, mileage: event.target.value }); setValuationSubmitted(false); setValuation(null); }} placeholder="Напр. 85000" /></label>
        <label>Гориво<select required value={valuationForm.fuel} onChange={(event) => { setValuationForm({ ...valuationForm, fuel: event.target.value }); setValuationSubmitted(false); setValuation(null); }}><option value="">Избери гориво</option>{["Бензин", "Дизел", "Хибрид", "Електрически"].map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label>
        <label>Скоростна кутия<select required value={valuationForm.gearbox} onChange={(event) => { setValuationForm({ ...valuationForm, gearbox: event.target.value }); setValuationSubmitted(false); setValuation(null); }}><option value="">Избери скоростна кутия</option>{["Ръчна", "Автоматична"].map((gearbox) => <option key={gearbox}>{gearbox}</option>)}</select></label>
      </div><label className="valuation-condition">Външно състояние<select value={valuationForm.exterior} onChange={(event) => { setValuationForm({ ...valuationForm, exterior: event.target.value as Exterior }); setValuationSubmitted(false); setValuation(null); }}>{(Object.entries(exteriorLabels) as [Exterior, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="primary-button sell-form-submit" type="submit">Покажи ценовия ориентир <Icon name="arrow" size={18} /></button><p className="sell-form-note">Оценката не изисква вход в профил.</p></form>
      <aside className="valuation-result" aria-live="polite"><div className="sell-result-heading"><span>02 / ЦЕНОВИ ОРИЕНТИР</span><Icon name="tag" size={22} /></div>{valuation ? <><span className="section-kicker">{valuation.demo ? "ПРИМЕРНА ОЦЕНКА" : "ОРИЕНТИР ОТ АКТИВНИ ОБЯВИ"}</span><h2>{euro(valuation.low)} – {euro(valuation.high)}</h2><strong>Средна отправна точка: {euro(valuation.mid)}</strong><p>Използвани са {valuation.count} {valuation.count === 1 ? "сравнима обява" : "сравними обяви"} за {valuationForm.make} {valuationForm.model}.</p><p className="valuation-caution">{valuation.demo ? "Това е демонстрация с примерни, измислени обяви. Сумата не е пазарна оценка." : "Това са цени в обяви, не доказани продажни цени. Диапазонът е груб ориентир и не отчита техническо състояние, оборудване, история или ремонти."}</p></> : valuationSubmitted ? <><h2>Няма достатъчно сравними коли</h2><p>{marketplace ? "За реален ориентир трябват поне 3 активни обяви за същия модел, гориво и скоростна кутия, с разлика до 3 години и 60 000 км." : "В примерния каталог няма достатъчно сходен автомобил с избраното гориво и скоростна кутия."}</p></> : <><div className="sell-result-placeholder"><Icon name="tag" size={34} /></div><h2>Твоята отправна точка</h2><p>След като попълниш данните, тук ще видиш ценови диапазон от сходни обяви.</p><div className="sell-range" aria-hidden="true"><span /><span /><span /></div><p className="valuation-caution">При недостатъчно сравними автомобили ще ти кажем, вместо да показваме непотвърдена цена.</p></>}</aside></div>
      <details className="valuation-method"><summary>Как получаваме ценовия ориентир?</summary><p>Сравняваме обявени цени за същия модел, гориво и скоростна кутия, с близки година и пробег. Това е ориентир, а не гарантирана продажна цена.</p><p>Използваме начални, приблизителни корекции: до 7% за година и 1,5% за 10 000 км, с ограничение за големи разлики. Външните забележки намаляват ориентира. Предстои калибриране с реални данни.</p></details></section>
      <section className="sell-publish"><div><span className="section-kicker">03 / ТВОЯТА ОБЯВА</span><h2>Готов ли си за следващата стъпка?</h2><p>Добави снимки, опиши автомобила и го предложи в MMC Auto.</p></div><button className="primary-button" onClick={() => navigate("post")}>Подготви обява <Icon name="plus" size={19} /></button></section>
    </main>}

    {view === "post" && <main className="page-width interior post-page"><div className="interior-heading"><span className="section-kicker">MMC AUTO</span><h1>{marketplace ? "Публикувай обява" : "Подготви обява"}</h1><p>{marketplace ? "Попълни данните и снимките. Обявата се публикува след преглед." : "Създай чернова на автомобила. Тя се пази само в този браузър и не е публична."}</p></div>
      {notice && <div role="status" className="notice">{notice}</div>}{listingError && <div role="alert" className="notice">{listingError}</div>}
      {marketplace && !user && AuthForm()}
      {marketplace && user && <section className="account-section"><div className="account-heading"><div><span className="section-kicker">МОЯТ ПРОФИЛ</span><h2>Моите обяви</h2><p>{user.email}</p></div><button className="text-link" onClick={() => marketplace.auth.signOut()}>Изход</button></div>
        {myListings.length ? <div className="account-list">{myListings.map((row) => <article className="account-row" key={row.id}><CarPhoto photo={0} imageUrl={row.imageUrl} /><div><strong>{row.make} {row.model}</strong><small>{row.year} · {euro(row.price_eur)} · {row.city}</small><span className={`status-pill status-${row.status}`}>{{ draft: "Чернова", pending: "Чака одобрение", active: "Публикувана", archived: "Свалена / архивирана" }[row.status]}</span>{row.status !== "archived" && <div className="listing-actions"><button className="edit-listing" type="button" disabled={busy} onClick={() => startEditingListing(row)}>Редактирай</button><button className="remove-listing" type="button" disabled={busy} onClick={() => removeMyListing(row)}>{row.status === "active" ? "Свали обявата" : "Изтрий обявата"}</button></div>}</div></article>)}</div> : <p className="account-empty">Все още нямаш изпратени обяви.</p>}
        <div className="inbox"><h3>Запитвания за моите обяви</h3>
          {inquiries.length ? <div className="inbox-list">{inquiries.map((item) => {
            const listing = myListings.find((row) => row.id === item.listing_id);
            return <article key={item.id} className="inbox-item"><strong>{listing ? `${listing.make} ${listing.model}` : "Обява"}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("bg-BG")}</time><p>{item.message}</p><a href={`mailto:${item.contact_email}`}>{item.contact_email}</a></article>;
          })}</div> : <p className="account-empty">Все още няма запитвания.</p>}
        </div>
      </section>}
      {(!marketplace || user) && <form id="listing-editor" className="post-form listing-editor" onSubmit={marketplace ? saveLiveListing : saveDraft}><div className="editor-heading"><h2>{editingListing ? `Редактирай ${editingListing.make} ${editingListing.model}` : "Нова обява"}</h2>{editingListing && <button type="button" className="text-link" disabled={busy} onClick={() => { resetListingForm(); setListingError(""); setNotice(""); }}>Откажи редакцията</button>}</div>{editingListing && <p className="form-note">След запис обявата ще чака повторно одобрение. Дотогава няма да се вижда публично.</p>}<fieldset className="listing-fields" disabled={busy}><div className="form-grid">
      {([ ["make", "Марка", "Напр. Volkswagen"], ["model", "Модел", "Напр. Golf"], ["year", "Година", "Напр. 2020"], ["mileage", "Пробег (км)", "Напр. 85000"], ["price", "Цена (€)", "Напр. 15900"], ["city", "Град", "Напр. Бургас"] ] as const).map(([key, label, placeholder]) => <label key={key}>{label}<input required type={["year", "mileage", "price"].includes(key) ? "number" : "text"} min="0" placeholder={placeholder} value={draftForm[key]} onChange={(e) => setDraftForm({ ...draftForm, [key]: e.target.value })} /></label>)}
      {([ ["fuel", "Гориво", ["Бензин", "Дизел", "Хибрид", "Електрически"]], ["gearbox", "Скоростна кутия", ["Ръчна", "Автоматична"]], ["body", "Купе", categories] ] as const).map(([key, label, options]) => <label key={key}>{label}<select value={draftForm[key]} onChange={(e) => setDraftForm({ ...draftForm, [key]: e.target.value, ...(key === "fuel" ? { emissionClass: "", co2GKm: "" } : {}) })}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
      <label>Екологична категория<select disabled={draftForm.fuel === "Електрически"} value={draftForm.fuel === "Електрически" ? zeroEmissions : draftForm.emissionClass} onChange={(e) => setDraftForm({ ...draftForm, emissionClass: e.target.value })}><option value="">Не е посочена</option>{draftForm.fuel === "Електрически" && <option>{zeroEmissions}</option>}{emissionClasses.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>CO₂ емисии при движение (г/км)<input type="number" min="0" max="1000" step="1" disabled={draftForm.fuel === "Електрически"} value={draftForm.fuel === "Електрически" ? "0" : draftForm.co2GKm} onChange={(e) => setDraftForm({ ...draftForm, co2GKm: e.target.value })} placeholder="По документи, ако е известно" /></label>
      {marketplace && <label>Телефон за връзка (по желание)<input type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="+359 87 123 4567" value={draftForm.contactPhone} onChange={(e) => setDraftForm({ ...draftForm, contactPhone: e.target.value })} /><small>Ако го попълниш, номерът ще се вижда публично в обявата след одобрение.</small></label>}
    </div>{marketplace && <><label className="photo-input">Описание<textarea maxLength={5000} rows={5} placeholder="Състояние, оборудване, сервизна история…" value={draftForm.details} onChange={(event) => setDraftForm({ ...draftForm, details: event.target.value })} /></label>{editingListing && <div className="existing-photos"><h3>Запазени снимки ({retainedPhotos.length})</h3>{retainedPhotos.length ? <div className="edit-photo-grid">{retainedPhotos.map((photo, index) => <div className="edit-photo" key={photo.path}>{photo.url ? <img src={photo.url} alt={`Снимка ${index + 1} на обявата`} /> : <span>Снимка {index + 1}</span>}<button type="button" disabled={busy} onClick={() => setRetainedPhotos((old) => old.filter((item) => item.path !== photo.path))} aria-label={`Премахни снимка ${index + 1}`}>Премахни</button></div>)}</div> : <p className="form-note">Няма запазени снимки. Можеш да добавиш нови по-долу.</p>}</div>}<label className="photo-input">{editingListing ? "Добави нови снимки (общо до 8, по 5 MB)" : "Снимки (до 8, по 5 MB)"}<input key={photoInputVersion} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectPhotos(event.target.files)} />{photos.length > 0 && <small>{photos.length} нови снимки избрани</small>}</label></>}<button className="primary-button" type="submit" disabled={busy}><Icon name="plus" size={18} /> {marketplace ? busy ? "Записване…" : editingListing ? "Запази промените за преглед" : "Изпрати за преглед" : "Запази чернова"}</button><p className="form-note">{marketplace ? "Ще виждаш състоянието на обявата си в „Моите обяви“ над формата." : "Тази версия не публикува обяви онлайн. Снимките, профилите и публичното публикуване са следваща стъпка."}</p></fieldset></form>}
      {marketplace && user?.app_metadata?.role === "admin" && <section className="account-section"><div className="account-heading"><div><span className="section-kicker">АДМИНИСТРАЦИЯ</span><h2>Чакащи обяви</h2></div></div>
        {pendingListings.length ? <div className="account-list">{pendingListings.map((row) => <article className="account-row moderator-row" key={row.id}><PhotoGallery key={row.id} photo={0} imageUrls={row.imageUrls || []} className="moderator-gallery" /><div><strong>{row.make} {row.model}</strong><small>{row.year} · {number(row.mileage_km)} км · {euro(row.price_eur)} · {row.city}</small><small>Продавач: {row.seller_id}</small><p>{row.details || "Няма добавено описание."}</p><div className="moderator-actions"><button disabled={busy} onClick={() => moderateListing(row.id, "active")}>Одобри</button><button disabled={busy} onClick={() => moderateListing(row.id, "archived")}>Отхвърли</button></div></div></article>)}</div> : <p className="account-empty">Няма обяви за преглед.</p>}
      </section>}
    </main>}

    <footer className="site-footer"><div className="page-width footer-inner"><div><strong><em>MMC</em> AUTO</strong><p>Автомобили в България.</p></div><div><button onClick={() => navigate("home")}>Начало</button><button onClick={() => { setFilters(initialFilters); navigate("results"); }}>Обяви</button><button onClick={() => navigate("valuation")}>Оцени и продай</button><button onClick={() => navigate("post")}>Моят профил</button><a href="/contact">Контакти</a></div><small>© 2026 MMC AUTO</small></div><section className="page-width footer-social" aria-labelledby="footer-social-title"><h2 id="footer-social-title">Следвай ни</h2><p>MMC Auto и в социалните мрежи.</p><div className="footer-social-links">{socialProfiles.map((profile) => <div className="footer-social-item" key={profile.name}>{profile.href ? <a className="footer-social-icon" href={profile.href} target="_blank" rel="noopener noreferrer" aria-label={`Следвай MMC Auto в ${profile.name}`}><SocialIcon name={profile.icon} /></a> : <span className="footer-social-icon social-coming-soon" title="Официалният профил предстои"><SocialIcon name={profile.icon} /></span>}<span>{profile.name}</span></div>)}</div>{!socialProfiles.some((profile) => profile.href) && <small className="footer-social-note">Линковете към официалните ни профили предстоят.</small>}</section></footer>
    {comparedCars.length > 0 && view !== "compare" && <div className="compare-bar" role="status"><div><strong>{comparedCars.length} / 3 автомобила</strong><span>{comparedCars.length < 2 ? "Добави още един за сравнение" : comparedCars.map((car) => car.make + " " + car.model).join(" · ")}</span></div><button onClick={() => navigate("compare")} disabled={comparedCars.length < 2}>Сравни сега <Icon name="arrow" size={16} /></button>{notice && <p>{notice}</p>}</div>}
    <button className="assistant-launch" onClick={() => setAssistantOpen((old) => !old)} aria-label={assistantOpen ? "Затвори асистента" : "Отвори асистента"}><Icon name={assistantOpen ? "close" : "spark"} size={23} /><span>{assistantOpen ? "Затвори" : "Попитай MMC"}</span></button>
    {assistantOpen && <section className="assistant-panel" aria-label="MMC асистент"><div className="assistant-head"><div><strong>MMC помощник</strong><small>{marketplace && user ? "ИИ при свързана услуга · демо при липса на връзка" : "Демо насоки за обявите"}</small></div><button onClick={() => setAssistantOpen(false)} aria-label="Затвори"><Icon name="close" size={18} /></button></div><div className="assistant-messages" role="log" aria-live="polite">{chat.map((entry, index) => <div key={index} className={`assistant-message ${entry.role === "user" ? "from-user" : ""}`}>{entry.content}{entry.demo && <small>Демо отговор</small>}</div>)}{assistantBusy && <p>Подготвям отговор…</p>}</div><form className="assistant-input" onSubmit={askAssistant}><input aria-label="Въпрос към асистента" maxLength={500} value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Напр. Toyota до 22 000 €" /><button type="submit" disabled={assistantBusy || !assistantInput.trim()} aria-label="Изпрати въпроса"><Icon name="arrow" size={20} /></button></form></section>}
  </div>;

  function SearchForm() {
    return <form className="search-panel" onSubmit={runSearch}><div className="search-fields">
      <label>Марка<select value={filters.make} onChange={(e) => updateFilter("make", e.target.value)}><option value="">Всички марки</option>{makes.map((make) => <option key={make}>{make}</option>)}</select></label>
      <label>Модел<input value={filters.model} onChange={(e) => updateFilter("model", e.target.value)} placeholder="Всички модели" /></label>
      <label>Цена от<input type="number" min="0" value={filters.min} onChange={(e) => updateFilter("min", e.target.value)} placeholder="Мин. €" /></label>
      <label>Цена до<input type="number" min="0" value={filters.max} onChange={(e) => updateFilter("max", e.target.value)} placeholder="Макс. €" /></label>
      <label>Гориво<select value={filters.fuel} onChange={(e) => updateFilter("fuel", e.target.value)}><option value="">Всички</option>{["Бензин", "Дизел", "Хибрид", "Електрически"].map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label>
      <label>Град на обявата<select value={filters.city} onChange={(e) => updateFilter("city", e.target.value)}><option value="">Всички градове</option>{[...new Set(cars.map((car) => car.city))].sort().map((city) => <option key={city}>{city}</option>)}</select></label>
      <button className="search-button" type="submit"><Icon name="search" size={19} /> Търси {matches.length} {matches.length === 1 ? "обява" : "обяви"}</button>
    </div><div className="search-bottom"><button type="button" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}><Icon name="sliders" size={16} /> Разширено търсене · Тип, година, пробег и разстояние <Icon name="chevron" size={15} /></button>{Object.values(filters).some(Boolean) && <button type="button" onClick={() => { setFilters(initialFilters); if (sort === "distanceAsc") setSort("newest"); }}>Изчисти филтрите</button>}</div>
    {advanced && <>
      <div className="body-filter">
        <div className="body-filter-head"><strong>Тип автомобил</strong><button type="button" onClick={() => updateFilter("body", "")} className={!filters.body ? "selected" : ""}>Всички</button></div>
        <div className="body-filter-grid">{categories.map((category) => <button type="button" key={category} className={`body-filter-option${filters.body === category ? " selected" : ""}`} aria-pressed={filters.body === category} onClick={() => updateFilter("body", filters.body === category ? "" : category)}><img src={categoryImages[category]} alt="" loading="lazy" /><span>{category}</span></button>)}</div>
      </div>
      <div className="advanced-fields">
        <div className="advanced-fields-heading">Година и пробег</div>
        <label>Година от<input type="number" min="1950" max="2030" placeholder="От" value={filters.year} onChange={(e) => updateFilter("year", e.target.value)} /></label>
        <label>Година до<input type="number" min="1950" max="2030" placeholder="До" value={filters.yearMax} onChange={(e) => updateFilter("yearMax", e.target.value)} /></label>
        <label>Пробег от (км)<input type="number" min="0" step="1000" placeholder="От" value={filters.mileageMin} onChange={(e) => updateFilter("mileageMin", e.target.value)} /></label>
        <label>Пробег до (км)<input type="number" min="0" step="1000" placeholder="До" value={filters.mileageMax} onChange={(e) => updateFilter("mileageMax", e.target.value)} /></label>
        <div className="advanced-fields-heading">Разстояние до автомобила</div>
        <label>Търси около<select value={filters.originCity} onChange={(e) => updateFilter("originCity", e.target.value)}><option value="">Избери твоя град</option>{Object.keys(cityCoordinates).sort((a, b) => a.localeCompare(b, "bg")).map((city) => <option key={city}>{city}</option>)}</select></label>
        <label>В радиус<select value={filters.radiusKm} disabled={!filters.originCity} onChange={(e) => updateFilter("radiusKm", e.target.value)}><option value="">Цяла България</option>{[25, 50, 100, 200, 300, 500].map((km) => <option value={km} key={km}>До {km} км</option>)}</select></label>
        <p className="distance-note">Ориентировъчно разстояние по права линия между центровете на градовете. При избран радиус обяви от непознат град не се включват.</p>
        <div className="advanced-fields-heading">Още условия</div>
        <label>Скоростна кутия<select value={filters.gearbox} onChange={(e) => updateFilter("gearbox", e.target.value)}><option value="">Всички</option><option>Ръчна</option><option>Автоматична</option></select></label>
        <label>Екологична категория<select value={filters.emissionClass} onChange={(e) => updateFilter("emissionClass", e.target.value)}><option value="">Всички</option>{[...emissionClasses, zeroEmissions].map((value) => <option key={value}>{value}</option>)}</select></label>
        <button type="submit" className="advanced-search-submit">Покажи {matches.length} {matches.length === 1 ? "обява" : "обяви"} <Icon name="arrow" size={16} /></button>
      </div>
    </>}
    </form>;
  }
}
