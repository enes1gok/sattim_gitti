export type JourneyRole = "buyer" | "seller";
type Check = { id: string; buyer: string; seller: string; requires?: string[] };
type Step = { id: string; title: string; subtitle: string; buyer: string; seller: string; checks: Check[]; source?: { title: string; url: string } };

export const journeySteps: Step[] = [
  { id: "contact", title: "Mesajlaşma", subtitle: "Sorularını netleştir", buyer: "Bakım kayıtlarını, hasar beyanını ve aracı görme koşullarını sor. Görüşme notunu burada tut.", seller: "Aracın durumunu, bakım kayıtlarını ve bilinen kusurları açıkça paylaş. Alıcının sorularını not al.", checks: [{ id: "contact", buyer: "Satıcıyla görüştüm, sorularımı sordum", seller: "Alıcıyla görüştüm, araç bilgilerini paylaştım" }] },
  { id: "appointment", title: "Randevu", subtitle: "Görüşme zamanını planla", buyer: "Satıcıyla tarih, saat ve herkese açık bir buluşma yeri üzerinde anlaş.", seller: "Alıcıyla görüşme zamanını ve buluşma yerini birlikte belirle.", checks: [{ id: "appointment", buyer: "Randevuyu satıcıyla karşılıklı teyit ettim", seller: "Randevuyu alıcıyla karşılıklı teyit ettim" }] },
  { id: "expertise", title: "Ekspertiz", subtitle: "Beyanı raporla karşılaştır", buyer: "Bağımsız ekspertiz planla. Raporun tarihini ve araçla eşleşmesini kontrol et; boya, değişen ve mekanik bulguları satıcı beyanıyla karşılaştır.", seller: "Ekspertiz koşullarını alıcıyla konuş. Rapor ve bakım kayıtlarını paylaş; tespit edilen kusurları birlikte değerlendir.", checks: [{ id: "expertise", buyer: "Ekspertiz raporunu ve araç bilgilerini inceledim", seller: "Ekspertiz raporunu alıcıyla değerlendirdim" }] },
  { id: "offer", title: "Fiyat teklifi", subtitle: "Son bedeli netleştir", buyer: "Ekspertiz sonrası teklifini ve masrafların kimde kalacağını konuş. Buraya yazdığın tutar yalnızca kişisel taslağındır.", seller: "Teklifi değerlendir; satış bedelini ve masraf paylaşımını alıcıyla netleştir. Buradaki taslak karşı tarafa iletilmez.", checks: [{ id: "offer", buyer: "Son fiyatı ve masraf paylaşımını satıcıyla teyit ettim", seller: "Son fiyatı ve masraf paylaşımını alıcıyla teyit ettim" }] },
  { id: "insurance", title: "Trafik sigortası", subtitle: "Noterden önce hazırla", buyer: "Standart ikinci el araç devrinde noter öncesinde kendi adına, satış tarihinde geçerli zorunlu trafik sigortanı yaptır. Teklif alınması, poliçenin düzenlendiği anlamına gelmez.", seller: "Alıcının kendi adına geçerli trafik sigortasını noter öncesinde hazırlamasını hatırlat. Satış sonrasında kendi poliçenin iptal ve prim iadesi koşullarını sigortacınla görüş.", checks: [{ id: "policy", buyer: "Adıma düzenlenen poliçenin satış tarihinde geçerli olduğunu kontrol ettim", seller: "Alıcı, adına geçerli poliçesini hazırladığını teyit etti" }], source: { title: "TSB · Satış öncesi trafik sigortası", url: "https://www.tsb.org.tr/content/MediaReleases/TSB_%C4%B0kinci%20El%20Ara%C3%A7%20Yeni%20D%C3%B6nem%20Bas%C4%B1n%20Duyurusu_04.12.2024.pdf" } },
  { id: "tax", title: "MTV ve borç kontrolü", subtitle: "Resmî kayıttan sorgula", buyer: "Satıcıdan satışa engel borçların kontrolünü ve gerekiyorsa ödenmesini iste. Kendi MTV yükümlülüğünü GİB üzerinden öğren; burada borç tutarı sorgulanmaz.", seller: "GİB üzerinden MTV ve trafik cezası borçlarını sorgula; satışa engel borçları resmî kanaldan öde. Ödeme durumunu ve satışa engel kayıtları noterde teyit et.", checks: [{ id: "tax", buyer: "Satışa engel borçların kontrolünü satıcıyla teyit ettim", seller: "Borçlarımı sorguladım, gereken ödemeleri kontrol ettim" }], source: { title: "GİB · MTV ve trafik cezası bilgileri", url: "https://mus.gib.gov.tr/vergi-konulari/1_bireysel/4_motorlu_tasitlar_vergisi_mtv_ve_trafik_idari_para_cezalari_tpc/4" } },
  { id: "payment", title: "Güvenli ödeme hazırlığı", subtitle: "Bankanın resmî kanalında", buyer: "Yetkili banka veya ödeme kuruluşunun resmî kanalında, satıcının başlattığı işlemdeki araç, taraf ve tutar bilgilerini kontrol et. Ödemeyi o kuruluşun yönlendirmesiyle tamamla.", seller: "Yetkili kuruluşun resmî güvenli ödeme kanalında işlemi başlat; taraf, araç ve tutar bilgilerini kontrol et. Referansı alıcıyla paylaş ve kuruluşun işlem durumunu teyit et.", checks: [{ id: "payment-details", buyer: "Araç, taraflar ve satış tutarını resmî kanalda kontrol ettim", seller: "Araç, taraflar ve satış tutarını resmî kanalda kontrol ettim" }, { id: "payment", buyer: "Yetkili kuruluşta ödemenin noter işlemine hazır olduğunu teyit ettim", seller: "Yetkili kuruluşta ödemenin noter işlemine hazır olduğunu teyit ettim", requires: ["payment-details"] }], source: { title: "Ticaret Bakanlığı · Güvenli Ödeme Sistemi", url: "https://ticaret.gov.tr/haberler/ticaret-bakanligi-ve-noterler-birligi-tarafindan-kurulan-guvenli-odeme-sistemi-27-eylul-2024-tarihinde-zorunlu-hale-geliyor" } },
  { id: "notary", title: "Noter kontrol listesi", subtitle: "Belgeleri birlikte gözden geçir", buyer: "Kimliğini hazırla; ruhsat ve şasi bilgilerini, geçerli muayeneyi ve devir engellerini satıcı ve noterle kontrol et. Resmî devir ve ödeme durumunu noterde teyit et.", seller: "Kimlik ve ruhsatını hazırla; varsa temsil yetkisini, geçerli muayeneyi ve devir engellerini noterle kontrol et. Resmî devir ve ödeme durumunu teyit et.", checks: [{ id: "identity", buyer: "Kimlik, ruhsat, araç bilgileri ve devir koşullarını kontrol ettim", seller: "Kimlik, ruhsat, araç bilgileri ve devir koşullarını kontrol ettim" }, { id: "notary", buyer: "Resmî noter devrinin tamamlandığını teyit ettim", seller: "Resmî noter devrinin tamamlandığını teyit ettim", requires: ["policy", "tax", "payment", "identity"] }] },
  { id: "handover", title: "Teslim ve sonrası", subtitle: "Son ayrıntıları unutma", buyer: "Anahtarları, belgeleri ve teslim kilometresini birlikte kontrol et. HGS, bakım takvimi ve sonraki MTV dönemini kendi adına takip etmeyi planla.", seller: "Anahtarları ve belgeleri teslim et; teslim kilometresini kaydet. HGS ve sigorta iptal/iade işlemlerini ilgili kuruluşlardan kontrol et.", checks: [{ id: "handover", buyer: "Aracı, anahtarları ve belgeleri teslim aldım", seller: "Aracı, anahtarları ve belgeleri teslim ettim", requires: ["notary"] }, { id: "aftercare", buyer: "HGS, bakım ve MTV takibimi planladım", seller: "HGS ve sigorta için satış sonrası işlemlerimi kontrol ettim", requires: ["handover"] }] },
];

export type JourneyDraft = { completed: string[]; message: string; date: string; time: string; place: string; expertise: string; offer: string };
export type JourneyState = { role: JourneyRole; buyer: JourneyDraft; seller: JourneyDraft };
export const journeyStorageKey = "sattim-gitti-demo-sale-v1";
export const emptyJourney = (): JourneyDraft => ({ completed: [], message: "", date: "", time: "", place: "", expertise: "", offer: "" });
const checks = journeySteps.flatMap((step) => step.checks);

// Removing an earlier confirmation also reopens any dependent confirmations.
export function normalizeChecks(ids: string[]): string[] {
  let next = checks.filter((check) => ids.includes(check.id)).map((check) => check.id);
  while (true) {
    const valid = next.filter((id) => checks.find((check) => check.id === id)!.requires?.every((required) => next.includes(required)) ?? true);
    if (valid.length === next.length) return valid;
    next = valid;
  }
}
export function toggleJourneyCheck(draft: JourneyDraft, id: string): JourneyDraft {
  return { ...draft, completed: normalizeChecks(draft.completed.includes(id) ? draft.completed.filter((value) => value !== id) : [...draft.completed, id]) };
}
export function journeyProgress(draft: JourneyDraft) {
  const completed = normalizeChecks(draft.completed);
  const done = journeySteps.filter((step) => step.checks.every((check) => completed.includes(check.id))).length;
  return { done, total: journeySteps.length, next: journeySteps.find((step) => step.checks.some((check) => !completed.includes(check.id))) };
}
export function parseJourneyState(value: unknown): JourneyState {
  const result: JourneyState = { role: "buyer", buyer: emptyJourney(), seller: emptyJourney() };
  if (!value || typeof value !== "object") return result;
  const stored = value as Record<string, unknown>;
  result.role = stored.role === "seller" ? "seller" : "buyer";
  for (const role of ["buyer", "seller"] as const) {
    if (!stored[role] || typeof stored[role] !== "object") continue;
    const draft = stored[role] as Record<string, unknown>;
    for (const key of ["message", "date", "time", "place", "expertise", "offer"] as const) {
      result[role][key] = typeof draft[key] === "string" ? draft[key].slice(0, key === "message" || key === "expertise" ? 1200 : 160) : "";
    }
    if (!/^\d{1,9}$/.test(result[role].offer) || Number(result[role].offer) <= 0) result[role].offer = "";
    result[role].completed = Array.isArray(draft.completed) ? normalizeChecks(draft.completed.filter((id): id is string => typeof id === "string")) : [];
  }
  return result;
}
export function validAppointment(date: string, time: string, place: string): boolean {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  if (!match || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !place.trim()) return false;
  const [, day, month, year] = match.map(Number);
  const parsed = new Date(year, month - 1, day);
  return year >= 2026 && parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}
