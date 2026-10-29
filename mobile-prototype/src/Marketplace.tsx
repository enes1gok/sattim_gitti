import { useEffect, useState } from "react";
import { ArrowRightIcon, BellIcon, BookmarkSimpleIcon, CameraIcon, CarProfileIcon, CaretRightIcon, ClockCounterClockwiseIcon, GearIcon, HeartIcon, MagnifyingGlassIcon, MapPinIcon, SlidersHorizontalIcon, UserIcon, WalletIcon, XIcon } from "@phosphor-icons/react";
import { BottomSheet, Carousel, KeyboardInput, MobileScroll, useKeyboard } from "./mobile";
import { demoListing } from "./listing-data";

export type MarketplaceTab = "explore" | "tracking" | "favorites" | "account";
type Filters = { budget: string; location: string; transmission: string; body: string };
type Search = { query: string; filters: Filters };
type Preferences = { lastSearch: Search | null; followed: Search[]; priceUpdates: boolean; newMatches: boolean };
const defaults: Filters = { budget: "any", location: "any", transmission: "any", body: "any" };
const filterGroups = [
  { key: "budget", label: "Bütçe", options: [["any", "Fark etmez"], ["1500000", "1,5 milyon ₺'ye kadar"], ["2000000", "2 milyon ₺'ye kadar"]] },
  { key: "location", label: "Konum", options: [["any", "Tüm Türkiye"], ["istanbul", "İstanbul"], ["ankara", "Ankara"]] },
  { key: "transmission", label: "Vites", options: [["any", "Fark etmez"], ["auto", "Otomatik"], ["manual", "Manuel"]] },
  { key: "body", label: "Kasa tipi", options: [["any", "Fark etmez"], ["suv", "SUV"], ["sedan", "Sedan"]] },
] as const;
const storageKey = "sattim-gitti-marketplace-v1";
function isSearch(value: unknown): value is Search {
  if (!value || typeof value !== "object") return false;
  const search = value as Search;
  return typeof search.query === "string" && !!search.filters && filterGroups.every((group) => group.options.some(([value]) => value === search.filters[group.key]));
}
function loadPreferences(): Preferences {
  const empty: Preferences = { lastSearch: null, followed: [], priceUpdates: false, newMatches: false };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!stored || typeof stored !== "object") return empty;
    return { lastSearch: isSearch(stored.lastSearch) ? stored.lastSearch : null, followed: Array.isArray(stored.followed) ? stored.followed.filter(isSearch) : [], priceUpdates: stored.priceUpdates === true, newMatches: stored.newMatches === true };
  } catch { return empty; }
}
function searchSummary(search: Search) {
  const labels = filterGroups.flatMap((group) => group.options.filter(([value]) => value !== "any" && value === search.filters[group.key]).map(([, label]) => label));
  return [search.query.trim(), ...labels].filter(Boolean).join(" · ") || "Tüm araçlar";
}
function sameSearch(a: Search, b: Search) {
  return a.query === b.query && filterGroups.every(({ key }) => a.filters[key] === b.filters[key]);
}
function matchesListing(search: Search) {
  const text = `${demoListing.name} ${demoListing.version} ${demoListing.year} ${demoListing.fuel} ${demoListing.transmission} ${demoListing.location} SUV`.toLocaleLowerCase("tr");
  const { budget, location, transmission, body } = search.filters;
  return search.query.trim().toLocaleLowerCase("tr").split(/\s+/).every((word) => text.includes(word))
    && (budget === "any" || Number(demoListing.price.replaceAll(".", "")) <= Number(budget))
    && (location === "any" || location === "istanbul") && transmission !== "manual" && body !== "sedan";
}

type Props = {
  activeTab: MarketplaceTab | "listing";
  favorite: boolean;
  onFavorite: () => void;
  onListing: () => void;
  onNavigate: (tab: MarketplaceTab) => void;
  onPhotos: () => void;
  photoCount: number;
};

export default function Marketplace({ activeTab, favorite, onFavorite, onListing, onNavigate, onPhotos, photoCount }: Props) {
  const keyboard = useKeyboard();
  const [preferences, setPreferences] = useState(loadPreferences);
  const [query, setQuery] = useState(() => preferences.lastSearch?.query ?? "");
  const [filters, setFilters] = useState<Filters>(() => preferences.lastSearch?.filters ?? defaults);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [results, setResults] = useState<Search | null>(null);
  const [panel, setPanel] = useState<"filters" | "notifications" | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [preferences]);

  function runSearch(search: Search = { query, filters }) {
    keyboard.hide();
    setQuery(search.query);
    setFilters(search.filters);
    setResults(search);
    setPreferences((previous) => ({ ...previous, lastSearch: search }));
    onNavigate("explore");
  }
  function openFilters(next = filters) { keyboard.hide(); setDraft({ ...next }); setPanel("filters"); }
  function toggleFollow(search: Search) {
    setPreferences((previous) => ({ ...previous, followed: previous.followed.some((item) => sameSearch(item, search)) ? previous.followed.filter((item) => !sameSearch(item, search)) : [...previous.followed, search] }));
  }
  function listingCard() {
    return <article className="market-listing">
      <div className="market-listing-visual"><button className="market-listing-image" aria-label="Jeep Compass örnek ilanını incele" onClick={onListing}><img src="/assets/car-front.png" alt="Gümüş Jeep Compass, örnek ilan görseli" draggable={false} /></button><span className="market-example">Örnek ilan</span><button className="card-favorite icon-button" aria-label={favorite ? "Favorilerden çıkar" : "Favorilere ekle"} aria-pressed={favorite} onClick={onFavorite}><HeartIcon size={23} weight={favorite ? "fill" : "regular"} /></button></div>
      <button className="market-listing-info" onClick={onListing}><div><strong>{demoListing.price} ₺</strong><CameraIcon size={20} weight="light" /></div><h3>{demoListing.name}</h3><p>{demoListing.year} · {demoListing.mileage} km · {demoListing.transmission}</p><span><MapPinIcon size={13} />{demoListing.location}<CaretRightIcon size={17} /></span></button>
    </article>;
  }
  function emptyState(icon: "heart" | "search" | "bookmark", heading: string, copy: string) {
    const Icon = icon === "heart" ? HeartIcon : icon === "search" ? MagnifyingGlassIcon : BookmarkSimpleIcon;
    return <div className="market-empty"><span><Icon size={32} weight="light" /></span><h2>{heading}</h2><p>{copy}</p><button className="primary-button" onClick={() => { setResults(null); onNavigate("explore"); }}>Araçları keşfet<ArrowRightIcon size={20} /></button></div>;
  }
  if (activeTab === "listing") return null;
  const currentSearch = results ?? { query, filters };
  const followed = preferences.followed.some((item) => sameSearch(item, currentSearch));
  const filterCount = Object.values(filters).filter((value) => value !== "any").length;

  return <>
    <MobileScroll key={`${activeTab}-${results ? "results" : "home"}`} className="market-scroll">
      <main className="market-content" onClickCapture={(event) => {
        if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) keyboard.hide();
      }}>
        {activeTab === "explore" && <>
          <div className={`market-heading ${results ? "results-intro" : ""}`}>{results ? <h1>Arama sonuçları.</h1> : <><span className="eyebrow">BİR SONRAKİ ARACIN</span><h1>Sana uyanı bul.</h1><p>Önce keşfet. Sonra her ayrıntısını gör.</p></>}</div>
          <form className="market-search" onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
            <label className="market-search-input"><MagnifyingGlassIcon size={23} weight="light" /><KeyboardInput aria-label="Marka, model veya kelime ara" placeholder="Marka, model veya kelime" value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => keyboard.hide()} enterKeyHint="search" />{query && <button type="button" className="icon-button" aria-label="Arama metnini temizle" onClick={() => setQuery("")}><XIcon size={16} /></button>}</label>
            <button className="market-filter-button" type="button" onClick={() => openFilters()}><SlidersHorizontalIcon size={20} />Filtreler{filterCount > 0 && <span>{filterCount}</span>}<CaretRightIcon size={17} /></button>
            <button className="primary-button" type="submit"><MagnifyingGlassIcon size={21} /><span>Araç ara</span><ArrowRightIcon size={20} /></button>
          </form>
          {!results && <>
            <div className="market-shortcuts" aria-label="Hızlı arama"><button onClick={() => runSearch({ query: "", filters: { ...defaults, body: "suv" } })}><span><CarProfileIcon size={25} weight="light" /></span>SUV</button><button onClick={() => runSearch({ query: "", filters: { ...defaults, transmission: "auto" } })}><span><GearIcon size={25} weight="light" /></span>Otomatik</button><button onClick={() => openFilters()}><span><WalletIcon size={25} weight="light" /></span>Bütçeme göre</button></div>
            {preferences.lastSearch && <button className="resume-search" onClick={() => runSearch(preferences.lastSearch!)}><ClockCounterClockwiseIcon size={24} weight="light" /><span><strong>Aramana devam et</strong><small>{searchSummary(preferences.lastSearch)}</small></span><ArrowRightIcon size={20} /></button>}
            <div className="market-section-heading"><h2>Yakından bak.</h2><span>1 örnek ilan</span></div>
            {listingCard()}
          </>}
          {results && <>
            <Carousel className="market-filter-rail" ariaLabel="Uygulanan filtreler" contentClassName="market-filter-track">{filterGroups.filter(({ key }) => filters[key] !== "any").map((group) => <button key={group.key} aria-label={`${group.label} filtresini kaldır`} onClick={() => runSearch({ query: results.query, filters: { ...filters, [group.key]: "any" } })}>{group.options.find(([value]) => value === filters[group.key])?.[1]}<XIcon size={13} /></button>)}</Carousel>
            <div className="market-section-heading results-heading"><h2>{matchesListing(results) ? "1 örnek ilan" : "Sonuç bulunamadı"}</h2><button className={followed ? "is-followed" : ""} onClick={() => toggleFollow(currentSearch)} aria-pressed={followed}><BookmarkSimpleIcon size={18} weight={followed ? "fill" : "regular"} />{followed ? "Takipte" : "Aramayı takip et"}</button></div>
            {matchesListing(results) ? listingCard() : <div className="search-empty"><MagnifyingGlassIcon size={30} weight="light" /><h3>Biraz daha geniş bakalım.</h3><p>Bu prototipte tek örnek ilan var. Kelimeleri veya filtreleri değiştirerek tekrar dene.</p><button className="secondary-button" onClick={() => { setQuery(""); runSearch({ query: "", filters: defaults }); }}>Aramayı sıfırla</button></div>}
            <button className="market-text-button" onClick={() => { keyboard.hide(); setResults(null); }}>Keşfet'e dön</button>
          </>}
          <p className="market-data-note">İlanlar ve fiyatlar örnektir. Canlı ilan kaynağı bağlı değil.</p>
        </>}
        {activeTab === "favorites" && <><div className="market-heading"><span className="eyebrow">AKLINDA KALANLAR</span><h1>Favorilerin.</h1><p>Beğendiğin araçlar bir arada.</p></div>{favorite ? listingCard() : emptyState("heart", "İlk favorin seni bekliyor.", "Bir ilandaki kalbe dokun; yeniden aramadan buradan ulaş.")}</>}
        {activeTab === "tracking" && <><div className="market-heading"><span className="eyebrow">SENİN KRİTERLERİN</span><h1>Takip ettiklerin.</h1><p>Aramalarını kaydet, kaldığın yerden devam et.</p></div>{preferences.followed.length ? <div className="followed-list">{preferences.followed.map((search, index) => <article key={JSON.stringify(search)}><BookmarkSimpleIcon size={23} weight="light" /><button onClick={() => runSearch(search)}><strong>{search.query.trim() || "Araç aramam"}</strong><small>{searchSummary(search)}</small><span>Aramayı aç<ArrowRightIcon size={15} /></span></button><button className="icon-button" aria-label={`${index + 1}. aramayı takipten çıkar`} onClick={() => toggleFollow(search)}><XIcon size={19} /></button></article>)}</div> : emptyState("bookmark", "Aramanı bir kez kaydet.", "Arama sonuçlarında “Aramayı takip et” seçeneğine dokun. Kriterlerin burada seni beklesin.")}<button className="market-setting-row" onClick={() => setPanel("notifications")}><BellIcon size={23} weight="light" /><span><strong>Bildirim tercihlerin</strong><small>Yalnızca ilgilendiğin gelişmeler</small></span><CaretRightIcon size={18} /></button></>}
        {activeTab === "account" && <><div className="market-heading"><span className="eyebrow">SANA AİT ALAN</span><h1>Hoş geldin.</h1><p>Üye olmadan keşfetmeye devam et.</p></div><div className="market-profile"><span><UserIcon size={30} weight="light" /></span><div><strong>Misafir olarak keşfediyorsun</strong><p>Seçimlerin bu tarayıcıda saklanır.</p></div></div><div className="market-account-rows"><button className="market-setting-row" onClick={() => onNavigate("favorites")}><HeartIcon size={23} weight="light" /><span><strong>Favorilerin</strong></span><small>{favorite ? "1 araç" : "Henüz yok"}</small><CaretRightIcon size={18} /></button><button className="market-setting-row" onClick={() => onNavigate("tracking")}><BookmarkSimpleIcon size={23} weight="light" /><span><strong>Takip ettiğin aramalar</strong></span><small>{preferences.followed.length}</small><CaretRightIcon size={18} /></button><button className="market-setting-row" onClick={onPhotos}><CameraIcon size={23} weight="light" /><span><strong>İlan fotoğrafların</strong><small>Yalnızca bu oturumda tutulur</small></span><small>{photoCount}</small><CaretRightIcon size={18} /></button><button className="market-setting-row" onClick={() => setPanel("notifications")}><BellIcon size={23} weight="light" /><span><strong>Bildirim tercihlerin</strong></span><CaretRightIcon size={18} /></button></div></>}
        {storageError && <p className="market-data-note" role="status">Tarayıcı depolaması kullanılamıyor. Arama tercihlerin bu oturumla sınırlı.</p>}
      </main>
    </MobileScroll>
    <BottomSheet open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }} title={panel === "filters" ? "Aramanı daralt." : "Sadece ilgilendiklerin."} description={panel === "filters" ? "Sana uyan kriterleri seç." : "Hangi gelişmeleri görmek istediğini seç."} snap={panel === "filters" ? 0.84 : 0.65}>
      <button className="sheet-close icon-button" aria-label="Paneli kapat" onClick={() => setPanel(null)}><XIcon size={20} /></button>
      {panel === "filters" && <div className="market-filters"><div className="filter-reset"><span>{Object.values(draft).filter((value) => value !== "any").length} filtre seçili</span><button onClick={() => setDraft({ ...defaults })}>Sıfırla</button></div>{filterGroups.map((group) => <fieldset key={group.key}><legend>{group.label}</legend><div className="filter-options">{group.options.map(([value, label]) => <button key={value} aria-pressed={draft[group.key] === value} onClick={() => setDraft((previous) => ({ ...previous, [group.key]: value }))}>{label}</button>)}</div></fieldset>)}<button className="primary-button" onClick={() => { runSearch({ query, filters: draft }); setPanel(null); }}>Sonuçları göster<ArrowRightIcon size={20} /></button></div>}
      {panel === "notifications" && <div className="notification-preferences"><label><span><strong>Fiyat değişimleri</strong><small>Favori araçlarının fiyatı değiştiğinde</small></span><input type="checkbox" role="switch" checked={preferences.priceUpdates} onChange={(event) => setPreferences((previous) => ({ ...previous, priceUpdates: event.target.checked }))} /></label><label><span><strong>Aramana uyan yeni ilanlar</strong><small>Yalnızca takip ettiğin aramalar için</small></span><input type="checkbox" role="switch" checked={preferences.newMatches} onChange={(event) => setPreferences((previous) => ({ ...previous, newMatches: event.target.checked }))} /></label><p>Tercihlerin bu tarayıcıda saklanır. Bu prototip henüz gerçek bildirim göndermez.</p><button className="primary-button" onClick={() => setPanel(null)}>Tamam</button></div>}
    </BottomSheet>
  </>;
}
