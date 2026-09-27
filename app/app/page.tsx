"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { loadActiveListings, loadListingInquiries, loadMyListings, loadPendingListings, marketplace, type InquiryRow, type ListingRow } from "../lib/marketplace";
import { estimateCar, type Exterior, type Valuation } from "../lib/valuation";

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
  city: string;
  body: string;
  photo: number;
  draft?: boolean;
  pending?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  details?: string;
  sellerId?: string;
};

type View = "home" | "results" | "detail" | "favorites" | "post" | "valuation" | "compare";
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
const exteriorLabels: Record<Exterior, string> = { excellent: "Без забележки", normal: "Нормални следи от употреба", scratches: "Леки драскотини", dents: "Видими драскотини или вдлъбнатини", damage: "Сериозни външни забележки" };

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
  const level = ratio < 0.9 ? "Ниска спрямо ориентира" : ratio > 1.1 ? "Висока спрямо ориентира" : "Близка до ориентира";
  const color = ratio < 0.9 ? "#166534" : ratio > 1.1 ? "#9f1239" : "#805800";
  const position = Math.max(3, Math.min(97, 50 + (ratio - 1) * 125));
  return <section className="price-guide" aria-label="Ориентир за цената">
    <strong>Ориентир за цената</strong>
    <div className="price-guide-heading"><span style={{ color }}>{level}</span><b>{euro(car.price)}</b></div>
    <div className="price-guide-meter" role="img" aria-label={level}>
      <div className="price-guide-bands"><span /><span /><span /></div>
      <span className="price-guide-marker" style={{ left: `${position}%` }} />
    </div>
    <div className="price-guide-labels"><span>Ниска</span><span>Средна</span><span>Висока</span></div>
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [listingError, setListingError] = useState("");
  const [valuationForm, setValuationForm] = useState<{ make: string; model: string; year: string; mileage: string; exterior: Exterior }>({ make: "", model: "", year: "", mileage: "", exterior: "normal" });
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [valuationSubmitted, setValuationSubmitted] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string; demo?: boolean }[]>([
    { role: "assistant", content: "Здравей! Мога да помогна да потърсиш кола сред наличните обяви или да те насоча към оценката.", demo: true },
  ]);
  const [sort, setSort] = useState("newest");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [draftForm, setDraftForm] = useState({ make: "", model: "", year: "", mileage: "", price: "", fuel: "Бензин", gearbox: "Ръчна", city: "", body: "Седан", details: "" });

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
        fuel: row.fuel, gearbox: row.gearbox, city: row.city, body: row.body,
        photo: 0, imageUrl: row.imageUrl, imageUrls: row.imageUrls, details: row.details, sellerId: row.seller_id })));
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
    (!filters.gearbox || car.gearbox === filters.gearbox)
  ).sort((a, b) => sort === "priceAsc" ? a.price - b.price : sort === "priceDesc" ? b.price - a.price : 0), [cars, filters, sort]);

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
    if (!marketplace) return;
    if (view === "detail" && selected && typeof selected.id === "string") {
      localStorage.setItem("mmc-return-listing", selected.id);
    }
    setBusy(true); setListingError("");
    const { error } = await marketplace.auth.signInWithOtp({ email: email.trim(),
      options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    setNotice(error ? `Не успяхме да изпратим линк: ${error.message}` : "Изпратихме линк за вход на посочения имейл.");
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

  async function saveLiveListing(event: FormEvent) {
    event.preventDefault();
    if (!marketplace || !user || busy) return;
    setBusy(true); setListingError(""); setNotice("");
    try {
      const { data, error } = await marketplace.from("car_listings").insert({
        seller_id: user.id, make: draftForm.make.trim(), model: draftForm.model.trim(),
        year: Number(draftForm.year), mileage_km: Number(draftForm.mileage), price_eur: Number(draftForm.price),
        fuel: draftForm.fuel, gearbox: draftForm.gearbox, city: draftForm.city.trim(), body: draftForm.body,
        details: draftForm.details.trim(), status: "draft"
      }).select("id").single();
      if (error || !data) throw error || new Error("Обявата не е запазена.");
      const paths: string[] = [];
      for (const file of photos) {
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${user.id}/${data.id}/${crypto.randomUUID()}.${extension}`;
        const uploaded = await marketplace.storage.from("car-photos").upload(path, file, { contentType: file.type, upsert: false });
        if (uploaded.error) throw uploaded.error;
        paths.push(path);
      }
      const updated = await marketplace.from("car_listings").update({ photo_paths: paths, status: "pending" }).eq("id", data.id).select("id").single();
      if (updated.error) throw updated.error;
      setPhotos([]);
      setDraftForm({ make: "", model: "", year: "", mileage: "", price: "", fuel: "Бензин", gearbox: "Ръчна", city: "", body: "Седан", details: "" });
      try { setMyListings(await loadMyListings(user.id)); }
      catch { setListingError("Обявата е изпратена, но списъкът в профила не се обнови. Презареди страницата."); }
      setNotice("Обявата е изпратена за преглед. Ще се вижда публично след одобрение.");
    } catch (error) {
      setListingError(`Не успяхме да изпратим обявата: ${error instanceof Error ? error.message : "Опитай отново."} Ако е създадена чернова, тя остава в профила ти.`);
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
            fuel: row.fuel, gearbox: row.gearbox, city: row.city, body: row.body,
            photo: 0, imageUrl: row.imageUrl, imageUrls: row.imageUrls, details: row.details, sellerId: row.seller_id })));
        } catch { setListingError("Обявата е одобрена, но каталогът не се обнови. Презареди страницата."); }
      }
      setNotice(status === "active" ? "Обявата е одобрена и вече е публична." : "Обявата е отхвърлена.");
    }
    setBusy(false);
  }

  function selectPhotos(files: FileList | null) {
    const chosen = Array.from(files || []);
    if (chosen.length > 8 || chosen.some((file) => file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
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
      gearbox: draftForm.gearbox, city: draftForm.city.trim(), body: draftForm.body, photo: 0, draft: true,
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
      year: Number(valuationForm.year), mileage: Number(valuationForm.mileage), exterior: valuationForm.exterior }, cars, !marketplace);
    setValuation(result);
    setValuationSubmitted(true);
  }

  function localAssistantReply(question: string) {
    const query = question.toLocaleLowerCase("bg");
    if (/оцен|струва|цена на моя/.test(query)) return "Отвори „Оцени кола“ и въведи модел, година, пробег и външно състояние. При малко сравними обяви няма да показваме измислена пазарна цена.";
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
        <span className="car-meta">{car.year} · {number(car.mileage)} км · {car.fuel}</span>
        <b className="price">{euro(car.price)}</b>
        <span className="car-location"><Icon name="pin" size={14} />{car.city}</span>
      </button>
      <button className={`compare-card-button ${compareIds.includes(car.id) ? "selected" : ""}`} onClick={() => toggleCompare(car.id)} aria-pressed={compareIds.includes(car.id)}>{compareIds.includes(car.id) ? "✓ Добавена за сравнение" : "+ Сравни"}</button>
    </article>;
  }

  return <div className="site-shell">
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => navigate("home")} aria-label="MMC AUTO начало"><span><em>MMC</em> AUTO</span><small>Твоят път към следващата кола</small></button>
        <nav className={`main-nav ${mobileMenu ? "open" : ""}`} aria-label="Основна навигация">
          <button className={view === "home" ? "active" : ""} onClick={() => navigate("home")}>Начало</button>
          <button className={view === "results" ? "active" : ""} onClick={() => { setFilters(initialFilters); navigate("results"); }}>Обяви</button>
          <button onClick={() => { navigate("home"); setTimeout(() => document.getElementById("search")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Търсене</button>
          <button className={view === "valuation" ? "active" : ""} onClick={() => navigate("valuation")}>Оцени кола</button>
          <button className={view === "favorites" ? "active" : ""} onClick={() => navigate("favorites")}>Любими {favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>
          <button className={view === "compare" ? "active" : ""} onClick={() => navigate("compare")}>Сравни {comparedCars.length > 0 && <span className="nav-count">{comparedCars.length}</span>}</button>
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
        <div className="section-head"><div><span className="section-kicker">РАЗГЛЕДАЙ ПАЗАРА</span><h2>Търси по категория</h2></div><button className="text-link" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Всички обяви <Icon name="arrow" size={17} /></button></div>
        <div className="category-grid">{categories.map((category, index) => <button key={category} className="category-tile" onClick={() => categorySearch(category)}><span className={`category-image photo-${[3,0,2,4,5,5,4][index]}`} /><span>{category}</span><Icon name="arrow" size={16} /></button>)}</div>
        <section className="valuation-promo"><div><span className="section-kicker">НОВО В MMC AUTO</span><h2>Колко струва твоята кола?</h2><p>Въведи година, пробег и външни забележки за ориентировъчен диапазон.</p></div><button className="primary-button" onClick={() => navigate("valuation")}>Оцени кола <Icon name="arrow" size={17} /></button></section>
        <div className="section-head listings-head"><div><span className="section-kicker">ПЪРВА ВЕРСИЯ</span><h2>{marketplace ? "Последни обяви" : "Примерни обяви"}</h2><p>{marketplace ? "Обявите се показват след преглед." : "Данните и снимките тук са демонстрационни."}</p></div><button className="text-link" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Виж всички <Icon name="arrow" size={17} /></button></div>
        {cars.length ? <div className="cards-grid">{cars.slice(0, 4).map((car) => <CarCard car={car} key={car.id} />)}</div> : <div className="empty-state"><Icon name="car" size={36} /><h2>Очакваме първите обяви</h2><p>Публикуваните след преглед автомобили ще се появят тук.</p></div>}
        {listingError && <p role="alert" className="notice">{listingError}</p>}<div className="benefits"><div><Icon name="search" size={30} /><strong>Търсене с филтри</strong><p>Марка, бюджет, гориво и още.</p></div><div><Icon name="heart" size={30} /><strong>Любими автомобили</strong><p>Запази интересните обяви.</p></div><div><Icon name="car" size={30} /><strong>Обяви на едно място</strong><p>Разгледай детайлите удобно.</p></div><div><Icon name="plus" size={30} /><strong>Подготви обява</strong><p>{marketplace ? "Изпрати за преглед." : "Създай чернова в браузъра."}</p></div></div>
      </main>
    </>}

    {view === "compare" && <main className="page-width interior compare-page"><div className="interior-heading"><span className="section-kicker">MMC AUTO · СРАВНЕНИЕ</span><h1>Сравни автомобили</h1><p>Избери до 3 автомобила от обявите. Данните са от публикуваното от продавачите; примерните обяви са демонстрационни.</p></div>
      {comparedCars.length ? <div className="compare-scroll" role="region" aria-label="Сравнение на автомобили" tabIndex={0}><table className="compare-table"><thead><tr><th scope="col">Характеристика</th>{comparedCars.map((car) => <th scope="col" key={car.id}><CarPhoto photo={car.photo} imageUrl={car.imageUrl} /><strong>{car.title}</strong><button onClick={() => toggleCompare(car.id)} aria-label={`Премахни ${car.title} от сравнение`}>Премахни</button></th>)}</tr></thead><tbody>
        {([ ["Цена", (car: Car) => euro(car.price)], ["Година", (car: Car) => String(car.year)], ["Пробег", (car: Car) => `${number(car.mileage)} км`], ["Гориво", (car: Car) => car.fuel], ["Скоростна кутия", (car: Car) => car.gearbox], ["Купе", (car: Car) => car.body], ["Град", (car: Car) => car.city] ] as [string, (car: Car) => string][]).map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{comparedCars.map((car) => <td key={car.id}>{value(car)}</td>)}</tr>)}
        <tr><th scope="row">Обява</th>{comparedCars.map((car) => <td key={car.id}><button className="text-link" onClick={() => openCar(car.id)}>Виж детайли <Icon name="arrow" size={15} /></button></td>)}</tr>
      </tbody></table></div> : <div className="empty-state"><Icon name="car" size={38} /><h2>Още няма избрани автомобили</h2><p>Избери „Сравни“ под обявите, които те интересуват.</p><button className="primary-button" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Разгледай обявите</button></div>}
    </main>}

    {(view === "results" || view === "favorites") && <main className="page-width interior"><div className="interior-heading"><div><span className="section-kicker">MMC AUTO · {marketplace ? "ОБЯВИ" : "ДЕМО КАТАЛОГ"}</span><h1>{view === "favorites" ? "Любими автомобили" : "Автомобили"}</h1><p>{view === "favorites" ? `${shownCars.length} ${shownCars.length === 1 ? "запазена обява" : "запазени обяви"} в този браузър` : `${shownCars.length} ${shownCars.length === 1 ? "резултат" : "резултата"} ${marketplace ? "в каталога" : "от примерните обяви и твоите чернови"}`}</p></div></div>
      {view === "results" && <div className="results-search">{SearchForm()}</div>}
      <div className="results-toolbar"><span>{shownCars.length} {shownCars.length === 1 ? "обява" : "обяви"}</span>{view === "results" && <label>Подреди по <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Най-нови</option><option value="priceAsc">Цена: ниска към висока</option><option value="priceDesc">Цена: висока към ниска</option></select></label>}</div>
      {shownCars.length ? <div className="cards-grid results-grid">{shownCars.map((car) => <CarCard car={car} key={car.id} />)}</div> : <div className="empty-state"><Icon name={view === "favorites" ? "heart" : "search"} size={38} /><h2>{view === "favorites" ? "Още нямаш любими обяви" : "Няма съвпадения"}</h2><p>{view === "favorites" ? "Натисни сърцето на автомобил, който ти харесва." : "Промени някой от филтрите, за да видиш повече автомобили."}</p><button className="primary-button" onClick={() => { setFilters(initialFilters); navigate("results"); }}>Разгледай обявите</button></div>}
    </main>}

    {view === "detail" && selected && <main className="page-width interior detail-page"><button className="back-link" onClick={() => navigate("results")}>← Обратно към обявите</button>{notice && <div className="notice">{notice}</div>}<div className="detail-layout"><div><PhotoGallery key={selected.id} photo={selected.photo} imageUrls={selected.imageUrls || (selected.imageUrl ? [selected.imageUrl] : [])} /><p className="photo-note">{selected.draft ? "Черновата използва илюстративна снимка." : marketplace ? selected.imageUrl ? "Снимка, качена от продавача." : "Все още няма добавена снимка." : "Демонстрационна обява · снимката е илюстративна."}</p></div><div className="detail-panel"><span className="section-kicker">{selected.draft ? "ЛОКАЛНА ЧЕРНОВА" : marketplace ? "ОБЯВА" : "ПРИМЕРНА ОБЯВА"}</span><h1>{selected.title}</h1><p className="detail-price">{euro(selected.price)}</p><p className="detail-city"><Icon name="pin" size={17} />{selected.city}</p><PriceGuide car={selected} catalog={cars} demo={!marketplace} /><div className="spec-grid"><span>Година<strong>{selected.year}</strong></span><span>Пробег<strong>{number(selected.mileage)} км</strong></span><span>Гориво<strong>{selected.fuel}</strong></span><span>Скоростна кутия<strong>{selected.gearbox}</strong></span><span>Купе<strong>{selected.body}</strong></span></div><button className="primary-button wide" onClick={() => toggleFavorite(selected.id)}><Icon name="heart" size={19} fill={favorites.includes(selected.id) ? "currentColor" : "none"} />{favorites.includes(selected.id) ? "Запазено в любими" : "Запази в любими"}</button><button className="compare-detail-button" onClick={() => toggleCompare(selected.id)} aria-pressed={compareIds.includes(selected.id)}>{compareIds.includes(selected.id) ? "✓ Добавена за сравнение" : "+ Добави за сравнение"}</button>{selected.details && <p className="detail-description">{selected.details}</p>}{marketplace && !selected.draft && <section className="inquiry-panel"><h2>Попитай продавача</h2>
        {!user ? <form onSubmit={sendSignIn}><p>Влез с имейл, за да изпратиш запитване. След вход ще се върнеш към тази обява.</p><label>Имейл<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><button className="primary-button" disabled={busy}>{busy ? "Изпращане…" : "Изпрати линк за вход"}</button></form>
        : user.id === selected.sellerId ? <p>Това е твоята обява.</p>
        : sentInquiryIds.includes(String(selected.id)) ? <p>Вече си изпратил запитване за тази обява.</p>
        : <form onSubmit={sendInquiry}><label>Съобщение до продавача<textarea required minLength={10} maxLength={2000} rows={4} value={inquiryMessage} onChange={(event) => setInquiryMessage(event.target.value)} placeholder="Здравейте, автомобилът още ли е наличен?" /></label><p>Имейлът ти ({user.email}) ще бъде показан на продавача, за да може да ти отговори.</p><button className="primary-button" type="submit" disabled={busy}>{busy ? "Изпращане…" : "Изпрати запитване"}</button></form>}
        {inquiryNotice && <p role="status" className="inquiry-notice">{inquiryNotice}</p>}
      </section>}{!marketplace && <div className="detail-hint">Примерна обява — запитванията са достъпни за реалните обяви.</div>}</div></div></main>}

    {view === "valuation" && <main className="page-width interior valuation-page"><div className="interior-heading"><span className="section-kicker">MMC AUTO · ОРИЕНТИР</span><h1>Оцени своя автомобил</h1><p>Сравняваме обявени цени за същия модел и правим приблизителна корекция за година, пробег и външен вид.</p></div>
      <div className="valuation-layout"><form className="post-form valuation-form" onSubmit={valueCar}><div className="form-grid">
        <label>Марка<input required list="valuation-makes" value={valuationForm.make} onChange={(event) => { setValuationForm({ ...valuationForm, make: event.target.value, model: "" }); setValuationSubmitted(false); }} placeholder="Напр. Toyota" /><datalist id="valuation-makes">{makes.map((make) => <option key={make} value={make} />)}</datalist></label>
        <label>Модел<input required list="valuation-models" value={valuationForm.model} onChange={(event) => { setValuationForm({ ...valuationForm, model: event.target.value }); setValuationSubmitted(false); }} placeholder="Напр. Corolla" /><datalist id="valuation-models">{[...new Set(cars.filter((car) => car.make.toLocaleLowerCase("bg") === valuationForm.make.toLocaleLowerCase("bg")).map((car) => car.model))].map((model) => <option key={model} value={model} />)}</datalist></label>
        <label>Година<input required type="number" min="1980" max={new Date().getFullYear() + 1} value={valuationForm.year} onChange={(event) => { setValuationForm({ ...valuationForm, year: event.target.value }); setValuationSubmitted(false); }} placeholder="Напр. 2020" /></label>
        <label>Пробег (км)<input required type="number" min="0" max="1000000" value={valuationForm.mileage} onChange={(event) => { setValuationForm({ ...valuationForm, mileage: event.target.value }); setValuationSubmitted(false); }} placeholder="Напр. 85000" /></label>
      </div><label className="valuation-condition">Външно състояние<select value={valuationForm.exterior} onChange={(event) => { setValuationForm({ ...valuationForm, exterior: event.target.value as Exterior }); setValuationSubmitted(false); }}>{(Object.entries(exteriorLabels) as [Exterior, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="primary-button" type="submit"><Icon name="search" size={18} /> Покажи ориентир</button></form>
      <aside className="valuation-result" aria-live="polite">{valuation ? <><span className="section-kicker">{valuation.demo ? "ПРИМЕРНА ОЦЕНКА" : "ОРИЕНТИР ОТ АКТИВНИ ОБЯВИ"}</span><h2>{euro(valuation.low)} – {euro(valuation.high)}</h2><strong>Средна отправна точка: {euro(valuation.mid)}</strong><p>Използвани са {valuation.count} {valuation.count === 1 ? "сравнима обява" : "сравними обяви"} за {valuationForm.make} {valuationForm.model}.</p><p className="valuation-caution">{valuation.demo ? "Това е демонстрация с примерни, измислени обяви. Сумата не е пазарна оценка." : "Това са цени в обяви, не доказани продажни цени. Диапазонът е груб ориентир и не отчита техническо състояние, оборудване, история или ремонти."}</p></> : valuationSubmitted ? <><h2>Няма достатъчно сравними коли</h2><p>{marketplace ? "За реален ориентир трябват поне 3 активни обяви за същия модел в близки години." : "В примерния каталог няма този модел в близки години. Опитай с модел от предложенията."}</p></> : <><Icon name="car" size={32} /><h2>Попълни данните</h2><p>Ще покажем диапазон и колко сравними обяви са използвани.</p></>}</aside></div>
      <p className="valuation-footnote">Алгоритъмът използва приблизителни корекции: до 7% за година и 1,5% за 10 000 км, с ограничение за големи разлики; външните забележки намаляват ориентира. Тези коефициенти са начални допускания и предстои калибриране с реални данни.</p>
    </main>}

    {view === "post" && <main className="page-width interior post-page"><div className="interior-heading"><span className="section-kicker">MMC AUTO</span><h1>{marketplace ? "Публикувай обява" : "Подготви обява"}</h1><p>{marketplace ? "Попълни данните и снимките. Обявата се публикува след преглед." : "Създай чернова на автомобила. Тя се пази само в този браузър и не е публична."}</p></div>
      {notice && <div role="status" className="notice">{notice}</div>}{listingError && <div role="alert" className="notice">{listingError}</div>}
      {marketplace && !user && <form className="post-form signin-form" onSubmit={sendSignIn}><h2>Вход с имейл</h2><p>Ще изпратим линк, с който да влезеш и да подадеш обява.</p><label>Имейл<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><button className="primary-button" disabled={busy}>Изпрати линк</button></form>}
      {(!marketplace || user) && <form className="post-form" onSubmit={marketplace ? saveLiveListing : saveDraft}><div className="form-grid">
      {([ ["make", "Марка", "Напр. Volkswagen"], ["model", "Модел", "Напр. Golf"], ["year", "Година", "Напр. 2020"], ["mileage", "Пробег (км)", "Напр. 85000"], ["price", "Цена (€)", "Напр. 15900"], ["city", "Град", "Напр. Бургас"] ] as const).map(([key, label, placeholder]) => <label key={key}>{label}<input required type={["year", "mileage", "price"].includes(key) ? "number" : "text"} min="0" placeholder={placeholder} value={draftForm[key]} onChange={(e) => setDraftForm({ ...draftForm, [key]: e.target.value })} /></label>)}
      {([ ["fuel", "Гориво", ["Бензин", "Дизел", "Хибрид", "Електрически"]], ["gearbox", "Скоростна кутия", ["Ръчна", "Автоматична"]], ["body", "Купе", categories] ] as const).map(([key, label, options]) => <label key={key}>{label}<select value={draftForm[key]} onChange={(e) => setDraftForm({ ...draftForm, [key]: e.target.value })}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
    </div>{marketplace && <><label className="photo-input">Описание<textarea maxLength={5000} rows={5} placeholder="Състояние, оборудване, сервизна история…" value={draftForm.details} onChange={(event) => setDraftForm({ ...draftForm, details: event.target.value })} /></label><label className="photo-input">Снимки (до 8, по 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectPhotos(event.target.files)} />{photos.length > 0 && <small>{photos.length} избрани</small>}</label></>}<button className="primary-button" type="submit" disabled={busy}><Icon name="plus" size={18} /> {marketplace ? busy ? "Изпращане…" : "Изпрати за преглед" : "Запази чернова"}</button><p className="form-note">{marketplace ? "Ще виждаш състоянието на обявата си по-долу." : "Тази версия не публикува обяви онлайн. Снимките, профилите и публичното публикуване са следваща стъпка."}</p></form>}
      {marketplace && user && <section className="account-section"><div className="account-heading"><div><span className="section-kicker">МОЯТ ПРОФИЛ</span><h2>Моите обяви</h2><p>{user.email}</p></div><button className="text-link" onClick={() => marketplace.auth.signOut()}>Изход</button></div>
        {myListings.length ? <div className="account-list">{myListings.map((row) => <article className="account-row" key={row.id}><CarPhoto photo={0} imageUrl={row.imageUrl} /><div><strong>{row.make} {row.model}</strong><small>{row.year} · {euro(row.price_eur)} · {row.city}</small><span className={`status-pill status-${row.status}`}>{{ draft: "Чернова", pending: "Чака одобрение", active: "Публикувана", archived: "Отхвърлена / архивирана" }[row.status]}</span></div></article>)}</div> : <p className="account-empty">Все още нямаш изпратени обяви.</p>}
        <div className="inbox"><h3>Запитвания за моите обяви</h3>
          {inquiries.length ? <div className="inbox-list">{inquiries.map((item) => {
            const listing = myListings.find((row) => row.id === item.listing_id);
            return <article key={item.id} className="inbox-item"><strong>{listing ? `${listing.make} ${listing.model}` : "Обява"}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("bg-BG")}</time><p>{item.message}</p><a href={`mailto:${item.contact_email}`}>{item.contact_email}</a></article>;
          })}</div> : <p className="account-empty">Все още няма запитвания.</p>}
        </div>
      </section>}
      {marketplace && user?.app_metadata?.role === "admin" && <section className="account-section"><div className="account-heading"><div><span className="section-kicker">АДМИНИСТРАЦИЯ</span><h2>Чакащи обяви</h2></div></div>
        {pendingListings.length ? <div className="account-list">{pendingListings.map((row) => <article className="account-row moderator-row" key={row.id}><PhotoGallery key={row.id} photo={0} imageUrls={row.imageUrls || []} className="moderator-gallery" /><div><strong>{row.make} {row.model}</strong><small>{row.year} · {number(row.mileage_km)} км · {euro(row.price_eur)} · {row.city}</small><small>Продавач: {row.seller_id}</small><p>{row.details || "Няма добавено описание."}</p><div className="moderator-actions"><button disabled={busy} onClick={() => moderateListing(row.id, "active")}>Одобри</button><button disabled={busy} onClick={() => moderateListing(row.id, "archived")}>Отхвърли</button></div></div></article>)}</div> : <p className="account-empty">Няма обяви за преглед.</p>}
      </section>}
    </main>}

    <footer className="site-footer"><div className="page-width footer-inner"><div><strong><em>MMC</em> AUTO</strong><p>Автомобили в България — проект в разработка.</p></div><div><button onClick={() => navigate("home")}>Начало</button><button onClick={() => { setFilters(initialFilters); navigate("results"); }}>Обяви</button><button onClick={() => navigate("valuation")}>Оцени кола</button><button onClick={() => navigate("post")}>Подготви обява</button></div><small>© 2026 MMC AUTO · Демонстрационна версия</small></div></footer>
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
      <label>Град<select value={filters.city} onChange={(e) => updateFilter("city", e.target.value)}><option value="">Всички градове</option>{[...new Set(cars.map((car) => car.city))].sort().map((city) => <option key={city}>{city}</option>)}</select></label>
      <button className="search-button" type="submit"><Icon name="search" size={19} /> Търси {matches.length} {matches.length === 1 ? "обява" : "обяви"}</button>
    </div><div className="search-bottom"><button type="button" onClick={() => setAdvanced(!advanced)}><Icon name="sliders" size={16} /> Разширено търсене <Icon name="chevron" size={15} /></button>{Object.values(filters).some(Boolean) && <button type="button" onClick={() => setFilters(initialFilters)}>Изчисти филтрите</button>}</div>
    {advanced && <div className="advanced-fields"><label>Купе<select value={filters.body} onChange={(e) => updateFilter("body", e.target.value)}><option value="">Всички категории</option>{categories.map((body) => <option key={body}>{body}</option>)}</select></label><label>Година от<input type="number" min="1950" max="2030" placeholder="Година" value={filters.year} onChange={(e) => updateFilter("year", e.target.value)} /></label><label>Скоростна кутия<select value={filters.gearbox} onChange={(e) => updateFilter("gearbox", e.target.value)}><option value="">Всички</option><option>Ръчна</option><option>Автоматична</option></select></label></div>}
    </form>;
  }
}
