// Fictional listing details; these are not fetched from a live marketplace.
export const demoListing = {
  name: "Jeep Compass",
  version: "1.3 T4 Limited",
  price: "1.685.000",
  year: "2021",
  mileage: "68.400",
  fuel: "Benzin",
  transmission: "Otomatik",
  location: "Kadıköy, İstanbul",
};

// Engine specifications follow Jeep's MY2021 1.3 T4 150 HP DCT FWD catalogue.
// Vehicle condition and installed options still require vehicle-specific evidence.
export const technicalSpecs = [
  ["Marka / seri", "Jeep / Compass"],
  ["Versiyon", "1.3 T4 Limited"],
  ["Motor gücü", "150 HP"],
  ["Motor hacmi", "1.332 cm³"],
  ["Tork", "270 Nm"],
  ["Şanzıman", "6 ileri DCT"],
  ["Çekiş", "Önden çekiş"],
  ["Kasa tipi", "SUV"],
  ["Kapı / koltuk", "5 / 5"],
  ["Renk", "Gri"],
  ["Araç durumu", "İkinci el"],
] as const;

export const equipmentGroups = {
  Konfor: ["Panoramik cam tavan", "Çift bölgeli klima", "Anahtarsız çalıştırma", "Elektrikli bagaj"],
  Güvenlik: ["ABS ve ESP", "Şerit takip uyarısı", "Ön / arka park sensörü", "Hız sabitleyici"],
  Teknoloji: ["Apple CarPlay", "Android Auto", "Geri görüş kamerası", "Dokunmatik multimedya"],
} as const;
export type EquipmentGroup = keyof typeof equipmentGroups;

export const historySpecs = [
  ["Boya / değişen", "Rapor eklenmedi"],
  ["Tramer kaydı", "Belge bekleniyor"],
  ["Ağır hasar", "Bilinmiyor"],
  ["Son bakım", "Belirtilmedi"],
  ["Muayene geçerliliği", "Belirtilmedi"],
  ["Garanti", "Belirtilmedi"],
] as const;

export const advertisementSpecs = [
  ["İlan no", "ÖRNEK-001"],
  ["İlan tarihi", "28 Ekim 2026"],
  ["Konum", "Kadıköy, İstanbul"],
  ["Kimden", "Bireysel satıcı"],
  ["Takas", "Değerlendirilir"],
  ["Plaka / uyruk", "Türkiye (TR)"],
] as const;
