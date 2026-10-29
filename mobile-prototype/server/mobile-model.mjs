import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import obj2gltf from "obj2gltf";

/** Package native output without sacrificing geometry to meet the mobile budget. */
export async function convertMobileModel(directory) {
  const files = await readdir(directory);
  const obj = files.find((name) => name.endsWith(".obj"));
  if (!obj) throw new Error("Üretilen model dosyası bulunamadı. Yeniden çekim gerekebilir.");
  // RealityKit writes a single baked colour atlas using this native naming scheme.
  // Leave unfamiliar/multiple-atlas outputs to the secure converter and size validator.
  const atlases = files.filter((name) => /^baked_mesh_[a-zA-Z0-9_-]+_tex\d+\.(png|jpe?g)$/i.test(name));
  const options = { binary: true, secure: true, unlit: true };
  if (atlases.length === 1) {
    const source = join(directory, atlases[0]);
    const metadata = await sharp(source, { limitInputPixels: 80_000_000 }).metadata();
    const texture = join(directory, metadata.hasAlpha ? "mobile-colour.png" : "mobile-colour.jpg");
    const image = sharp(source, { limitInputPixels: 80_000_000 }).resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true });
    // Strip native image metadata for browser decoders; keep full chroma resolution.
    if (metadata.hasAlpha) await image.png().toFile(texture);
    else await image.jpeg({ quality: 96, chromaSubsampling: "4:4:4" }).toFile(texture);
    options.overridingTextures = { baseColorTexture: texture };
  }
  return obj2gltf(join(directory, obj), options);
}
