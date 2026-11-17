import { useEffect, useState } from "react";
import { ArrowRightIcon, BellIcon, BookmarkSimpleIcon, CameraIcon, CarSimpleIcon, SparkleIcon, UsersIcon, SuitcaseRollingIcon, ScalesIcon, ChartLineIcon, CaretRightIcon, HeartIcon, MagnifyingGlassIcon, MapPinIcon, SlidersHorizontalIcon, UserIcon, WalletIcon, XIcon } from "@phosphor-icons/react";
import { BottomSheet, Carousel, KeyboardInput, MobileScroll, useKeyboard } from "./mobile";
import { demoListing } from "./listing-data";
import { exampleVehicle, money, needDefinition, needs, type DecisionTab, type NeedId } from "./decision-data";
import { defaults, filterGroups, matchesListing, matchNotification, type Filters, type Search } from "./search-data";

export type MarketplaceTab = "explore" | "tracking" | "favorites" | "account";
export function SavedHeader({ activeTab, onNavigate }: { activeTab: MarketplaceTab; onNavigate: (tab: MarketplaceTab) => void }) {
  return <><div className="market-heading saved-heading"><span className="eyebrow">SANA ÖZEL</span><h1>Kaydedilenler.</h1><p>Beğendiğin araçlar ve aramaların bir arada.</p></div><div className="saved-switch" role="group" aria-label="Kaydedilenler"><button type="button" aria-pressed={activeTab === "favorites"} onClick={() => onNavigate("favorites")}>Araçlar</button><button type="button" aria-pressed={activeTab === "tracking"} onClick={() => onNavigate("tracking")}>Aramalar</button></div></>;
}
type Preferences = { lastSearch: Search | null; followed: Search[]; priceUpdates: boolean; newMatches: boolean };
const storageKey = "sattim-gitti-marketplace-v1";
function readSearch(value: unknown): Search | null {
  if (!value || typeof value !== "object") return null;
  const search = value as Search;
  if (typeof search.query !== "string" || (search.need !== undefined && !needs.some(({ id }) => id === search.need)) || !search.filters || typeof search.filters !== "object") return null;
  // Searches saved before condition filters existed retain their original meaning.
  const filters = { ...defaults, ...search.filters };
  return filterGroups.every((group) => group.options.some(([value]) => value === filters[group.key])) ? { ...search, filters } : null;
}
function loadPreferences(): Preferences {
  const empty: Preferences = { lastSearch: null, followed: [], priceUpdates: false, newMatches: false };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!stored || typeof stored !== "object") return empty;
    return { lastSearch: readSearch(stored.lastSearch), followed: Array.isArray(stored.followed) ? stored.followed.map(readSearch).filter((search: Search | null): search is Search => search !== null) : [], priceUpdates: stored.priceUpdates === true, newMatches: stored.newMatches === true };
  } catch { return empty; }
}
function searchSummary(search: Search, describeNeed = false) {
  const labels = filterGroups.flatMap((group) => group.options.filter(([value]) => value !== "any" && value === search.filters[group.key]).map(([, label]) => label));
  return [describeNeed ? needDefinition(search.need)?.criteria : needDefinition(search.need)?.label, search.query.trim(), ...labels].filter(Boolean).join(" · ") || "Tüm araçlar";
}
function sameSearch(a: Search, b: Search) {
  return a.need === b.need && a.query === b.query && filterGroups.every(({ key }) => a.filters[key] === b.filters[key]);
}
// Check each criterion against the same listing matcher; only offer a search that returns a result.
function searchRecovery(search: Search) {
  const next: Search = { ...search, filters: { ...search.filters } };
  const changes: string[] = [];
  const price = Number(demoListing.price.replaceAll(".", ""));
  if (search.filters.budget !== "any" && price > Number(search.filters.budget)) {
    const budget = filterGroups[0].options.find(([value]) => value !== "any" && Number(value) >= price);
    next.filters.budget = budget?.[0] ?? "any";
    changes.push(`Bütçe sınırını ${budget ? `${money(Number(budget[0]))} yap` : "kaldır"}. Örnek ilan ${money(price)}; mevcut sınırından ${money(price - Number(search.filters.budget))} daha yüksek.`);
  }
  for (const key of ["location", "transmission", "body", "paint", "replacement"] as const) {
    if (!matchesListing({ query: "", filters: { ...defaults, [key]: search.filters[key] } })) {
      next.filters[key] = "any";
      const group = filterGroups.find((item) => item.key === key)!;
      const label = group.options.find(([value]) => value === search.filters[key])?.[1];
      changes.push(key === "paint" || key === "replacement" ? `${label} koşulunu kaldır; örnek ilanın boya ve değişen bilgisi bilinmiyor.` : `${group.label}: ${label} yerine ${group.options[0][1]} seç.`);
    }
  }
  if (!matchesListing({ query: search.query, filters: defaults })) {
    next.query = "";
    changes.push(`“${search.query.trim()}” arama metnini kaldır; örnek ilan bu kelimelerle eşleşmiyor.`);
  }
  if (!matchesListing({ query: "", filters: defaults, need: search.need })) {
    next.need = undefined;
    changes.push(`“${needDefinition(search.need)?.label}” koşulunu kaldır; örnek araç bu ihtiyacın ölçütlerini karşılamıyor.`);
  }
  return changes.length && matchesListing(next) ? { search: next, changes } : null;
}

type Props = {
  activeTab: MarketplaceTab | "listing";
  favorite: boolean;
  onFavorite: () => void;
  onListing: () => void;
  onDecision: (tab: DecisionTab) => void;
  onJourney: () => void;
  journeySummary: string;
  onNavigate: (tab: MarketplaceTab) => void;
  onPhotos: () => void;
  photoCount: number;
};

export default function Marketplace({ activeTab, favorite, onFavorite, onListing, onDecision, onJourney, journeySummary, onNavigate, onPhotos, photoCount }: Props) {
  const keyboard = useKeyboard();
  const [preferences, setPreferences] = useState(loadPreferences);
  const [query, setQuery] = useState(() => preferences.lastSearch?.query ?? "");
  const [filters, setFilters] = useState<Filters>(() => preferences.lastSearch?.filters ?? defaults);
  const [need, setNeed] = useState<NeedId | undefined>(() => preferences.lastSearch?.need);
  const [draftNeed, setDraftNeed] = useState<NeedId>();
  const [draft, setDraft] = useState<Filters>(defaults);
  const [results, setResults] = useState<Search | null>(null);
  const [panel, setPanel] = useState<"filters" | "notifications" | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [preferences]);

  function runSearch(search: Search = { query, filters, need }) {
    keyboard.hide();
    setQuery(search.query);
    setFilters(search.filters);
    setNeed(search.need);
    setResults(search);
    setPreferences((previous) => ({ ...previous, lastSearch: search }));
    onNavigate("explore");
  }
  function openFilters(next = filters) { keyboard.hide(); setDraft({ ...next }); setDraftNeed(need); setPanel("filters"); }
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
  const currentSearch = results ?? { query, filters, need };
  const hasResults = results !== null && matchesListing(results);
  const recovery = results && !hasResults ? searchRecovery(results) : null;
  const followed = preferences.followed.some((item) => sameSearch(item, currentSearch));
  const filterCount = Object.values(filters).filter((value) => value !== "any").length + (need ? 1 : 0);
  const returningSearch = !results ? preferences.lastSearch : null;
  const resumeSubject = returningSearch?.query.trim() || needDefinition(returningSearch?.need)?.label;
  const previewSearch = preferences.followed.length
    ? preferences.followed.find(matchesListing)
    : { query: "", filters: { ...defaults, budget: "2000000", transmission: "auto" } };
  const notification = previewSearch ? matchNotification(previewSearch) : null;

  function notificationPreview() {
    return <section className="match-preview" aria-label="Bildirim önizlemesi">
      <div className="match-preview-label"><SparkleIcon size={20} weight="light" /><span>Örnek bildirim</span></div>
      {notification && previewSearch ? <>
        <h3>{notification.title}</h3>
        <p>{notification.details}</p>
        <p className="match-preview-reason">{notification.reason}</p>
        <small>{preferences.followed.length ? "Kayıtlı aramana göre" : "Örnek arama"}: {searchSummary(previewSearch, true)}</small>
        <button onClick={() => { setPanel(null); onListing(); }}>Örnek ilanı incele<ArrowRightIcon size={17} /></button>
      </> : <p>Takip ettiğin aramalarla eşleşen örnek ilan yok. Uymayan bir araç için bildirim oluşturulmaz.</p>}
      <small className="match-preview-note">Bu bir önizleme; yeni ilan bulunduğu veya bildirim gönderildiği anlamına gelmez.</small>
    </section>;
  }


  return <>
    <MobileScroll key={`${activeTab}-${results ? "results" : "home"}`} className="market-scroll">
      <main className={`market-content ${activeTab === "explore" && !results ? "market-home" : ""}`} onClickCapture={(event) => {
        if (keyboard.visible && event.target instanceof Element && event.target.closest("button")) keyboard.hide();
      }}>
        {activeTab === "explore" && <>
          {returningSearch && <button className="returning-notice" onClick={() => runSearch(returningSearch)}><BellIcon size={21} weight="light" /><span><strong>{resumeSubject ? `${resumeSubject} aramana devam et` : "Aramana devam et"}</strong><small>Yeni ilanlar kontrol edilemiyor</small></span><CaretRightIcon size={18} weight="light" /></button>}
          <div className={`market-heading ${results ? "results-intro" : "promise-heading"}`}>{results ? <h1>Arama sonuçları.</h1> : <><span className="eyebrow">BİR SONRAKİ ARACIN</span><h1>Sen arama,<span>biz senin için takip edelim.</span></h1><p>İhtiyacını seç. Aramanı bir kez kaydet.</p></>}</div>
          <form className="market-search" onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
            <label className="market-search-input"><MagnifyingGlassIcon size={23} weight="light" /><KeyboardInput aria-label="Marka, model veya kelime ara" placeholder="Marka, model veya kelime" value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => keyboard.hide()} enterKeyHint="search" />{query && <button type="button" className="icon-button" aria-label="Arama metnini temizle" onClick={() => setQuery("")}><XIcon size={16} /></button>}</label>
            <button className="market-filter-button" type="button" onClick={() => openFilters()}><SlidersHorizontalIcon size={20} />Filtreler{filterCount > 0 && <span>{filterCount}</span>}<CaretRightIcon size={17} /></button>
            <button className="primary-button" type="submit"><MagnifyingGlassIcon size={21} /><span>Araç ara</span><ArrowRightIcon size={20} /></button>
            {!results && <small className="market-promise-note">Örnek deneyim · Canlı takip henüz bağlı değil.</small>}
          </form>
          {!results && <>
            <div className="needs-heading"><h2>Neye ihtiyacın var?</h2><span>İhtiyacından başla</span></div>
            <div className="market-shortcuts needs-shortcuts" aria-label="İhtiyacına göre ara">{needs.map((item, index) => { const Icon = [UsersIcon, SuitcaseRollingIcon, WalletIcon][index]; return <button key={item.id} onClick={() => runSearch({ query: "", filters: { ...defaults }, need: item.id })}><span><Icon size={25} weight="light" /></span>{item.shortLabel}</button>; })}</div>
            {(!returningSearch || matchesListing(returningSearch)) && <><div className="market-section-heading"><h2>{returningSearch ? "Aramana uyan örnek ilan" : "Yakından bak."}</h2><span>{returningSearch ? "Örnek veri" : "1 örnek ilan"}</span></div>{listingCard()}</>}
          </>}
          {results && <>
            <Carousel className="market-filter-rail" ariaLabel="Uygulanan filtreler" contentClassName="market-filter-track">{need && <button aria-label="İhtiyaç filtresini kaldır" onClick={() => runSearch({ query: results.query, filters })}>{needDefinition(need)?.label}<XIcon size={13} /></button>}{filterGroups.filter(({ key }) => filters[key] !== "any").map((group) => <button key={group.key} aria-label={`${group.label} filtresini kaldır`} onClick={() => runSearch({ query: results.query, filters: { ...filters, [group.key]: "any" }, need })}>{group.options.find(([value]) => value === filters[group.key])?.[1]}<XIcon size={13} /></button>)}</Carousel>
            {need && <div className="need-explanation"><strong>{needDefinition(need)?.label}</strong><p>{needDefinition(need)?.criteria}</p><small>Doğrulanmamış örnek değerlendirme verilerine göre.{need === "economy" ? " Ayda 1.000 km, 50 ₺/L ve 1.000 ₺ bakım varsayımı." : ""}</small><button onClick={() => onDecision(need === "economy" ? "cost" : "compare")}>{need === "economy" ? "Maliyet varsayımlarını gör" : "Araçları karşılaştır"}<CaretRightIcon size={16} /></button></div>}
            <div className="market-section-heading results-heading"><h2>{hasResults ? "1 örnek ilan" : "Sonuç bulunamadı"}</h2><button className={followed ? "is-followed" : ""} onClick={() => toggleFollow(currentSearch)} aria-pressed={followed}><BookmarkSimpleIcon size={18} weight={followed ? "fill" : "regular"} />{followed ? "Takipte" : "Aramayı takip et"}</button></div>
            {hasResults ? listingCard() : <div className="search-empty"><MagnifyingGlassIcon size={30} weight="light" /><h3>Ne değişirse ilan bulunur?</h3><p>Bu kriterlerle eşleşen örnek ilan yok.{recovery ? " Şu değişikliklerle 1 örnek ilan görebilirsin:" : " Kelimeleri veya filtreleri değiştirerek tekrar dene."}</p>{recovery && <><ul className="search-recovery-changes">{recovery.changes.map((change) => <li key={change}>{change}</li>)}</ul><button className="primary-button" onClick={() => runSearch(recovery.search)}>Değişiklikleri uygula · 1 örnek ilan<ArrowRightIcon size={18} /></button></>}<button className="secondary-button" onClick={() => runSearch({ query: "", filters: defaults })}>Aramayı sıfırla</button></div>}
            <button className="market-text-button" onClick={() => { keyboard.hide(); setResults(null); }}>Keşfet'e dön</button>
          </>}
          <button className="decision-entry" onClick={() => onDecision("compare")}><ScalesIcon size={24} weight="light" /><span><strong>Kararını netleştir</strong><small>Karşılaştır, fiyatı ve kullanımı anla</small></span><CaretRightIcon size={18} /></button>
          <button className="market-setting-row" onClick={onJourney}><CarSimpleIcon size={23} weight="light" /><span><strong>İlandan teslimata yanındayız</strong><small>Randevu, ekspertiz, sigorta, MTV ve noter</small></span><CaretRightIcon size={18} /></button>
          <p className="market-data-note">İlanlar ve fiyatlar örnektir. Canlı ilan kaynağı bağlı değil.</p>
        </>}
        {(activeTab === "favorites" || activeTab === "tracking") && <SavedHeader activeTab={activeTab} onNavigate={onNavigate} />}
        {activeTab === "favorites" && <>{favorite ? listingCard() : emptyState("heart", "İlk favorin seni bekliyor.", "Bir ilandaki kalbe dokun; yeniden aramadan buradan ulaş.")}</>}
        {activeTab === "tracking" && <><div className="tracking-summary"><span><strong>{preferences.followed.length}</strong> kayıtlı arama</span><span><strong>{favorite ? 1 : 0}</strong> fiyat takibi</span></div><button className="journey-entry" onClick={onJourney}><CarSimpleIcon size={25} weight="light" /><span><strong>Alım-satım sürecin</strong><small>{journeySummary} · Mesajdan teslimata</small></span><ArrowRightIcon size={20} /></button>{notificationPreview()}<h2 className="tracking-section-title">Kayıtlı aramaların</h2>{preferences.followed.length ? <div className="followed-list">{preferences.followed.map((search, index) => <article key={JSON.stringify(search)}><BookmarkSimpleIcon size={23} weight="light" /><button onClick={() => runSearch(search)}><strong>{needDefinition(search.need)?.label || search.query.trim() || "Araç aramam"}</strong><small>{searchSummary(search, true)}</small><span>Aramayı aç<ArrowRightIcon size={15} /></span></button><button className="icon-button" aria-label={`${index + 1}. aramayı takipten çıkar`} onClick={() => toggleFollow(search)}><XIcon size={19} /></button></article>)}</div> : emptyState("bookmark", "Aramanı bir kez kaydet.", "Arama sonuçlarında “Aramayı takip et” seçeneğine dokun. Kriterlerin burada seni beklesin.")}<h2 className="tracking-section-title">Fiyat takibin</h2>{favorite ? <button className="tracked-price-card" onClick={() => onDecision("price")}><ChartLineIcon size={23} weight="light" /><span><strong>{demoListing.name}</strong><small>Örnek ilan · Önceki fiyat kaydı yok</small><b>{money(exampleVehicle.price)}</b></span><CaretRightIcon size={18} /></button> : <p className="tracking-muted">Favoriye eklediğin araçların fiyat bilgisi burada görünür.</p>}<h2 className="tracking-section-title">Güncellemeler</h2><div className="tracking-updates"><BellIcon size={23} weight="light" /><p>Henüz güncelleme yok. Canlı ilan ve bildirim kaynağı henüz bağlı değil.</p></div><button className="market-setting-row" onClick={() => setPanel("notifications")}><BellIcon size={23} weight="light" /><span><strong>Bildirim tercihlerin</strong><small>Yalnızca ilgilendiğin gelişmeler</small></span><CaretRightIcon size={18} /></button></>}
        {activeTab === "account" && <><div className="market-heading"><span className="eyebrow">SANA AİT ALAN</span><h1>Hoş geldin.</h1><p>Üye olmadan keşfetmeye devam et.</p></div><div className="market-profile"><span><UserIcon size={30} weight="light" /></span><div><strong>Misafir olarak keşfediyorsun</strong><p>Seçimlerin bu tarayıcıda saklanır.</p></div></div><div className="market-account-rows"><button className="market-setting-row" onClick={() => onNavigate("favorites")}><HeartIcon size={23} weight="light" /><span><strong>Favorilerin</strong></span><small>{favorite ? "1 araç" : "Henüz yok"}</small><CaretRightIcon size={18} /></button><button className="market-setting-row" onClick={() => onNavigate("tracking")}><BookmarkSimpleIcon size={23} weight="light" /><span><strong>Takip ettiğin aramalar</strong></span><small>{preferences.followed.length}</small><CaretRightIcon size={18} /></button><button className="market-setting-row" onClick={onPhotos}><CameraIcon size={23} weight="light" /><span><strong>İlan fotoğrafların</strong><small>Yalnızca bu oturumda tutulur</small></span><small>{photoCount}</small><CaretRightIcon size={18} /></button><button className="market-setting-row" onClick={() => setPanel("notifications")}><BellIcon size={23} weight="light" /><span><strong>Bildirim tercihlerin</strong></span><CaretRightIcon size={18} /></button></div></>}
        {storageError && <p className="market-data-note" role="status">Tarayıcı depolaması kullanılamıyor. Arama tercihlerin bu oturumla sınırlı.</p>}
      </main>
    </MobileScroll>
    <BottomSheet open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }} title={panel === "filters" ? "Aramanı daralt." : "Sadece ilgilendiklerin."} description={panel === "filters" ? "Sana uyan kriterleri seç." : "Hangi gelişmeleri görmek istediğini seç."} snap={0.84}>
      <button className="sheet-close icon-button" aria-label="Paneli kapat" onClick={() => setPanel(null)}><XIcon size={20} /></button>
      {panel === "filters" && <div className="market-filters"><div className="filter-reset"><span>{Object.values(draft).filter((value) => value !== "any").length + (draftNeed ? 1 : 0)} filtre seçili</span><button onClick={() => { setDraft({ ...defaults }); setDraftNeed(undefined); }}>Sıfırla</button></div><fieldset><legend>İhtiyacın</legend><div className="filter-options"><button aria-pressed={!draftNeed} onClick={() => setDraftNeed(undefined)}>Fark etmez</button>{needs.map((item) => <button key={item.id} aria-pressed={draftNeed === item.id} onClick={() => setDraftNeed(item.id)}>{item.shortLabel}</button>)}</div></fieldset>{filterGroups.map((group) => <fieldset key={group.key}><legend>{group.label}</legend><div className="filter-options">{group.options.map(([value, label]) => <button key={value} aria-pressed={draft[group.key] === value} onClick={() => setDraft((previous) => ({ ...previous, [group.key]: value }))}>{label}</button>)}</div>{group.key === "paint" && <p className="tracking-muted">Boyasız tüm boyalı işlemleri dışlar. Durumu bilinmeyen ilanlar seçili koşulla eşleşmez; beyanı ekspertizle doğrula.</p>}{group.key === "replacement" && <p className="tracking-muted">Değişensiz, değişen parça olmadığını ifade eder. Bilinmeyen bilgiler eşleşmez; beyanı ekspertizle doğrula.</p>}</fieldset>)}<button className="primary-button" onClick={() => { runSearch({ query, filters: draft, need: draftNeed }); setPanel(null); }}>Sonuçları göster<ArrowRightIcon size={20} /></button></div>}
      {panel === "notifications" && <div className="notification-preferences"><label><span><strong>Fiyat değişimleri</strong><small>Favori araçlarının fiyatı değiştiğinde</small></span><input type="checkbox" role="switch" checked={preferences.priceUpdates} onChange={(event) => setPreferences((previous) => ({ ...previous, priceUpdates: event.target.checked }))} /></label><label><span><strong>Aramana uyan yeni ilanlar</strong><small>Model, kilometre, bütçe farkı ve neden uyduğu ile</small></span><input type="checkbox" role="switch" checked={preferences.newMatches} onChange={(event) => setPreferences((previous) => ({ ...previous, newMatches: event.target.checked }))} /></label>{notificationPreview()}<p>Tercihlerin bu tarayıcıda saklanır. Bu prototip henüz gerçek bildirim göndermez.</p><button className="primary-button" onClick={() => setPanel(null)}>Tamam</button></div>}
    </BottomSheet>
  </>;
}
