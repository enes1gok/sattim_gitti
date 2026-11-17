import { ArrowRightIcon, CarIcon, CompassIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { filterGroups } from "./search-data";
import type { Onboarding as Setup } from "./marketplace-guidance";

export function Onboarding({ value, onChange, onFinish, onSkip }: { value: Setup; onChange: (value: Setup) => void; onFinish: (intent: "buy" | "sell" | "browse") => void; onSkip: () => void }) {
  const groups = value.step === 1 ? filterGroups.slice(0, 2) : filterGroups.slice(2, 4);
  return <section className="onboarding app-content-enter" aria-label="Başlangıç tercihleri">
    <div className="onboarding-step"><span>ADIM {value.step + 1} / 3</span><span>İstediğin zaman değiştirebilirsin</span></div>
    <div className="sell-intro"><h2>{value.step === 0 ? "Bugün ne yapmak istersin?" : value.step === 1 ? "Nerede, hangi bütçeyle?" : "Senin için neler önemli?"}</h2><p>{value.step === 0 ? "Sana uygun yerden başlayalım. Hesap açmadan keşfedebilirsin." : value.step === 1 ? "İstersen sınır koymadan da devam edebilirsin." : "Tercihlerin arama filtrelerine uygulanır. Sonuçlarda neden eşleştiğini görebilirsin."}</p></div>
    {value.step === 0 ? <div className="onboarding-intents">
      <button onClick={() => onChange({ ...value, intent: "buy", step: 1 })}><MagnifyingGlassIcon size={25} /><span><strong>Araç arıyorum</strong><small>Bütçene ve tercihlerine göre keşfet</small></span><ArrowRightIcon size={19} /></button>
      <button onClick={() => onFinish("sell")}><CarIcon size={25} /><span><strong>Araç satıyorum</strong><small>Aracını seç, ilanını adım adım hazırla</small></span><ArrowRightIcon size={19} /></button>
      <button onClick={() => onFinish("browse")}><CompassIcon size={25} /><span><strong>Sadece keşfediyorum</strong><small>Tüm ilanlara göz at</small></span><ArrowRightIcon size={19} /></button>
    </div> : <>
      <div className="market-filters">{groups.map((group) => <fieldset key={group.key}><legend>{group.label}</legend><div className="filter-options">{group.options.map(([option, label]) => <button key={option} aria-pressed={value.filters[group.key] === option} onClick={() => onChange({ ...value, filters: { ...value.filters, [group.key]: option } })}>{label}</button>)}</div></fieldset>)}</div>
      {value.step === 2 && <div className="onboarding-summary"><strong>Araman hazır</strong><p>{filterGroups.slice(0, 4).map((group) => group.options.find(([option]) => option === value.filters[group.key])?.[1]).join(" · ")}</p><small>İlan yoksa aramanı kaydedip daha sonra yeniden açabilirsin. Otomatik bildirim henüz bağlı değil.</small></div>}
      <div className="sell-actions"><button className="secondary-button" onClick={() => onChange({ ...value, step: value.step === 2 ? 1 : 0 })}>Geri</button><button className="primary-button" onClick={() => value.step === 1 ? onChange({ ...value, step: 2 }) : onFinish("buy")}>{value.step === 1 ? "Devam et" : "Bana uygun ilanları göster"}<ArrowRightIcon size={19} /></button></div>
    </>}
    <button className="market-text-button" onClick={onSkip}>Şimdilik atla</button>
    <p className="market-data-note">Tercihlerin bu cihazda saklanır. Hesabım → Başlangıç tercihlerim bölümünden değiştirebilirsin.</p>
  </section>;
}
