import { supabase } from "./supabase";
import { defaults, filterGroups, type Filters } from "./search-data";

export type CatalogOption = { id: string; name: string; body_types?: string[] };
export type PhotoRecord = { id: string; listing_id: string; object_path: string; position: number; url?: string };
export type Listing = {
  id: string; owner_id?: string; model_id: string; make_name: string; model_name: string;
  title: string; description: string; price: number; year: number; mileage: number;
  city: string; district: string; fuel: string; transmission: string; body: string;
  paint: string; replacement: string;
  status: "draft" | "published" | "archived"; created_at: string; photos: PhotoRecord[];
};
export type ListingInput = Pick<Listing, "model_id" | "title" | "description" | "price" | "year" | "mileage" | "city" | "district" | "fuel" | "transmission" | "body" | "paint" | "replacement">;
export type CloudSearch = { query: string; filters: Filters };
export const emptyCloudSearch: CloudSearch = { query: "", filters: { ...defaults } };
export const pageSize = 20;
function checked<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Sunucudan yanıt alınamadı.");
  return result.data;
}
export async function getMakes() {
  return checked(await supabase.from("vehicle_makes").select("id,name").order("name").limit(1000)) as CatalogOption[];
}
export async function getModels(makeId: string) {
  return checked(await supabase.from("vehicle_models").select("id,name,body_types").eq("make_id", makeId).order("name").limit(1000)) as CatalogOption[];
}
async function withPhotos(rows: Omit<Listing,"photos">[]): Promise<Listing[]> {
  if (!rows.length) return [];
  const photos = checked(await supabase.from("listing_photos").select("*").in("listing_id", rows.map((row) => row.id)).order("position")) as PhotoRecord[];
  if (photos.length) {
    const signed = checked(await supabase.storage.from("listing-photos").createSignedUrls(photos.map((photo) => photo.object_path), 900));
    for (const photo of photos) photo.url = signed.find((item) => item.path === photo.object_path)?.signedUrl ?? undefined;
  }
  return rows.map((row) => ({ ...row, price: Number(row.price), photos: photos.filter((photo) => photo.listing_id === row.id) }));
}
export async function getListings(search: CloudSearch = emptyCloudSearch, page = 0, options: { ownerId?: string; ids?: string[] } = {}) {
  if (options.ids && !options.ids.length) return [];
  let query = supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false }).order("id");
  if (options.ownerId) {
    const owned = checked(await supabase.from("listings").select("id").eq("owner_id", options.ownerId));
    if (!owned.length) return [];
    query = query.in("id", owned.map((row) => row.id));
  }
  else query = query.eq("status", "published");
  if (options.ids) query = query.in("id", options.ids);
  for (const word of search.query.trim().split(/\s+/).filter(Boolean)) query = query.ilike("search_text", `%${word.replace(/[\\%_]/g, "\\$&")}%`);
  const f = search.filters;
  if (f.budget !== "any") query = query.lte("price", Number(f.budget));
  if (f.location !== "any") query = query.eq("city", f.location === "istanbul" ? "İstanbul" : "Ankara");
  if (f.transmission !== "any") query = query.eq("transmission", f.transmission === "auto" ? "Otomatik" : "Manuel");
  if (f.body !== "any") query = query.eq("body", f.body === "suv" ? "SUV" : "Sedan");
  if (f.paint === "none") query = query.eq("paint", "none");
  if (f.replacement === "none") query = query.eq("replacement", "none");
  return withPhotos(checked(await query.range(page * pageSize, (page + 1) * pageSize - 1)) as Omit<Listing,"photos">[]);
}
export async function getListing(id: string) {
  const row = checked<Omit<Listing,"photos">>(await supabase.from("marketplace_listings").select("*").eq("id", id).single());
  return (await withPhotos([row]))[0];
}
export async function saveDraft(input: ListingInput, id?: string) {
  if (id) return checked<{ id: string }>(await supabase.from("listings").update(input).eq("id", id).select("id").single()).id;
  return checked<{ id: string }>(await supabase.from("listings").insert(input).select("id").single()).id;
}
export async function setListingStatus(id: string, status: Listing["status"]) {
  checked(await supabase.from("listings").update({ status }).eq("id", id).select("id").single());
}
// Redrawing strips embedded metadata, including EXIF location, before uploading.
export async function preparePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("JPG, PNG veya WebP seç; her fotoğraf en fazla 8 MB olabilir.");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 80_000_000) throw new Error("Bu fotoğrafın boyutları desteklenmiyor.");
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Fotoğraf hazırlanamadı.");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Fotoğraf hazırlanamadı.")), "image/jpeg", .88));
  } finally { bitmap.close(); }
}
export async function uploadPhoto(listingId: string, ownerId: string, file: File, position: number) {
  const blob = await preparePhoto(file);
  const path = `${ownerId}/${listingId}/${crypto.randomUUID()}.jpg`;
  checked(await supabase.storage.from("listing-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false }));
  try { checked(await supabase.from("listing_photos").insert({ listing_id: listingId, object_path: path, position }).select("id").single()); }
  catch (error) { await supabase.storage.from("listing-photos").remove([path]); throw error; }
}
export async function removePhoto(photo: PhotoRecord) {
  const removed = await supabase.storage.from("listing-photos").remove([photo.object_path]);
  if (removed.error) throw new Error("Fotoğraf depodan kaldırılamadı. Yeniden dene.");
  const result = await supabase.from("listing_photos").delete().eq("id", photo.id).select("id");
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.length) throw new Error("Fotoğraf kaldırılamadı; önce ilanı taslağa al.");
}
export async function getFavorites() { return checked(await supabase.from("listing_favorites").select("listing_id")).map((row) => row.listing_id as string); }
export async function toggleFavorite(id: string, exists: boolean) {
  const result = exists ? await supabase.from("listing_favorites").delete().eq("listing_id", id) : await supabase.from("listing_favorites").insert({ listing_id: id });
  if (result.error) throw new Error(result.error.message);
}
export type SavedSearch = { id: string; name: string; criteria: CloudSearch };
export function isCloudSearch(value: unknown): value is CloudSearch {
  if (!value || typeof value !== "object") return false;
  const search = value as CloudSearch;
  return typeof search.query === "string" && !!search.filters && filterGroups.every((group) => group.options.some(([value]) => value === search.filters[group.key]));
}
export async function getSavedSearches() {
  const rows = checked(await supabase.from("saved_searches").select("id,name,criteria").order("created_at", { ascending: false })) as SavedSearch[];
  return rows.filter((row) => isCloudSearch(row.criteria));
}
export async function saveSearch(search: CloudSearch) { checked(await supabase.from("saved_searches").insert({ name: search.query.trim() || "Araç aramam", criteria: search }).select("id").single()); }
export async function removeSearch(id: string) { const { error } = await supabase.from("saved_searches").delete().eq("id",id); if (error) throw new Error(error.message); }
export function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Invalid login credentials/i.test(message)) return "E-posta veya şifre yanlış.";
  if (/Email not confirmed/i.test(message)) return "Girişten önce e-posta adresini doğrula.";
  if (/rate limit/i.test(message)) return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
  if (/email.*not authorized|email_address_not_authorized|error sending confirmation/i.test(message)) return "Kayıt e-postası gönderilemedi. E-posta hizmeti henüz hazır olmayabilir.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.";
  return message;
}
