import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, CarSimpleIcon, CubeIcon, MinusIcon, PlusIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { validateModelFile } from "./model-file";

type Source = { name: string; buffer?: ArrayBuffer; reconstructed?: boolean };
type Commands = { rotate: (direction: number) => void; zoom: (factor: number) => void; reset: () => void; top: () => void };
type Props = { onPartSelect: (part: "door" | "hood") => void; initialModel?: Source };
const DEMO: Source = { name: "Genel SUV demosu" };

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    const image = texture.source?.data as { close?: () => void } | undefined;
    if (typeof image?.close === "function") image.close();
    texture.dispose();
  });
}

export default function Vehicle3D({ onPartSelect, initialModel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hotspots = useRef<{ door: HTMLButtonElement | null; hood: HTMLButtonElement | null }>({ door: null, hood: null });
  const commands = useRef<Commands | null>(null);
  const [source, setSource] = useState<Source>(initialModel ?? DEMO);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    setPhase("loading");
    setError("");
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setError("Bu tarayıcıda 3D görüntüleme açılamadı. Güncel, WebGL destekli bir tarayıcı dene.");
      setPhase("error");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("aria-label", "Döndürülebilir 3D model");
    container.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.minPolarAngle = 0.001;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbcc3cc, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -4;
    key.shadow.camera.right = key.shadow.camera.top = 4;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xeaf0ff, 1.2);
    fill.position.set(-4, 3, -3);
    scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.15 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    floor.receiveShadow = true;
    scene.add(floor);
    let model: THREE.Group | null = null;
    let modelHeight = 1.3;
    let width = 1;
    let height = 1;
    const render = () => {
      if (disposed) return;
      renderer.render(scene, camera);
      renderer.domElement.dataset.azimuth = controls.getAzimuthalAngle().toFixed(3);
      renderer.domElement.dataset.distance = controls.getDistance().toFixed(3);
      const anchors = { door: new THREE.Vector3(0.76, 0.76, 0.25), hood: new THREE.Vector3(0, 0.87, 1.04) };
      for (const part of ["door", "hood"] as const) {
        const element = hotspots.current[part];
        if (!element) continue;
        const point = model ? model.localToWorld(anchors[part]) : anchors[part];
        const visibleSide = part === "hood" || camera.position.x > point.x;
        point.project(camera);
        element.hidden = !!source.buffer || !model || !visibleSide || point.z < -1 || point.z > 1 || Math.abs(point.x) > 0.95 || Math.abs(point.y) > 0.95;
        element.style.left = `${(point.x * 0.5 + 0.5) * width}px`;
        element.style.top = `${(-point.y * 0.5 + 0.5) * height}px`;
      }
    };
    const reset = () => {
      controls.target.set(0, modelHeight * 0.45, 0);
      camera.position.set(3.3, 2.2, 3.7);
      controls.update();
      render();
    };
    commands.current = {
      rotate: (direction) => { controls.rotateLeft(direction * Math.PI / 6); controls.update(); },
      zoom: (factor) => { camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); },
      reset,
      top: () => { controls.target.set(0, modelHeight * 0.45, 0); camera.position.set(0.001, 6, 0); controls.update(); },
    };
    controls.addEventListener("change", render);
    const observer = new ResizeObserver(() => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    });
    observer.observe(container);
    const abort = new AbortController();
    const loseContext = (event: Event) => { event.preventDefault(); if (!disposed) { setError("3D görüntü durakladı. Yeniden açabilirsin."); setPhase("error"); } };
    renderer.domElement.addEventListener("webglcontextlost", loseContext);
    const load = async () => {
      try {
        const buffer = source.buffer ?? await fetch("/assets/models/demo-suv.glb", { signal: abort.signal }).then((response) => {
          if (!response.ok) throw new Error("Demo model yüklenemedi.");
          return response.arrayBuffer();
        });
        if (!buffer) throw new Error("Model verisi okunamadı.");
        validateModelFile(buffer);
        const manager = new THREE.LoadingManager();
        manager.setURLModifier((url) => { if (!url.startsWith("data:") && !url.startsWith("blob:")) throw new Error("Model tek dosya olmalı."); return url; });
        const gltf = await new GLTFLoader(manager).parseAsync(buffer, "");
        if (disposed) { disposeObject(gltf.scene); return; }
        model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const extent = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(extent) || extent <= 0) { disposeObject(model); model = null; throw new Error("Modelin boyutları okunamadı."); }
        const scale = 3 / extent;
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        modelHeight = size.y * scale;
        model.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
        scene.add(model);
        model.updateMatrixWorld(true);
        reset();
        setPhase("ready");
      } catch (reason) {
        if (disposed) return;
        setError(reason instanceof Error && !reason.message.includes("Unexpected") && !reason.message.includes("THREE") ? reason.message : "Bu model açılamadı. Sıkıştırılmamış, tek dosyalı bir GLB 2.0 dene.");
        setPhase("error");
      }
    };
    reset();
    void load();
    return () => {
      disposed = true;
      abort.abort();
      observer.disconnect();
      commands.current = null;
      controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", loseContext);
      disposeObject(scene);
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [source, retry]);

  async function importModel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    setError("");
    try {
      if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("GLB uzantılı bir model seç.");
      if (file.size > 20 * 1024 * 1024) throw new Error("Model en fazla 20 MB olabilir.");
      const buffer = await file.arrayBuffer();
      validateModelFile(buffer);
      setSource({ name: file.name, buffer });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Model açılamadı."); }
    finally { setReading(false); }
  }
  const ready = phase === "ready";
  return <div className="model-viewer">
    <div className="model-identity"><span className="eyebrow">{source.reconstructed ? "ÇEKİMLERİNDEN OLUŞTURULDU" : source.buffer ? "YEREL MODEL" : "ÖRNEK 3D MODEL"}</span><strong>{source.name}</strong><p>{source.reconstructed ? "Görsel model · Hasar analizi ve parça eşleştirmesi yapılmadı." : source.buffer ? "İlanla parça eşleştirmesi yapılmadı." : "Genel SUV modeli · İlanla eşleştirilmedi."}</p></div>
    <div className="model-stage" ref={host} data-scroll-drag="ignore" tabIndex={0} role="group" aria-label="Etkileşimli 3D model; ok tuşlarıyla döndür, artı ve eksiyle yakınlaştır" onKeyDown={(event) => {
      if (!ready) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); commands.current?.rotate(event.key === "ArrowLeft" ? 1 : -1); }
      if (event.key === "+" || event.key === "=" || event.key === "-") { event.preventDefault(); commands.current?.zoom(event.key === "-" ? 1.2 : 0.8); }
    }}>
      {phase !== "ready" && <div className="model-state" role="status"><CubeIcon size={34} weight="light" /><strong>{phase === "loading" ? "Model açılıyor…" : "3D görüntü açılamadı"}</strong>{phase === "error" && <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Yeniden dene</button>}</div>}
      <button ref={(node) => { hotspots.current.door = node; }} hidden={!ready || !!source.buffer} className="model-hotspot" aria-label="3D modelde sol ön kapı örnek bulgusu" onClick={() => onPartSelect("door")}><span className="hotspot-dot" /></button>
      <button ref={(node) => { hotspots.current.hood = node; }} hidden={!ready || !!source.buffer} className="model-hotspot neutral-hotspot" aria-label="3D modelde kaput: incelenmedi" onClick={() => onPartSelect("hood")}><span className="hotspot-dot" /></button>
    </div>
    <p className="model-gesture">Sürükleyerek döndür · İki parmakla yakınlaştır</p>
    <div className="model-controls" role="group" aria-label="3D görüntü kontrolleri">
      <button disabled={!ready} aria-label="Sola döndür" onClick={() => commands.current?.rotate(1)}><ArrowCounterClockwiseIcon size={22} /></button>
      <button disabled={!ready} aria-label="Sağa döndür" onClick={() => commands.current?.rotate(-1)}><ArrowClockwiseIcon size={22} /></button>
      <button disabled={!ready} aria-label="Yakınlaştır" onClick={() => commands.current?.zoom(0.8)}><PlusIcon size={22} /></button>
      <button disabled={!ready} aria-label="Uzaklaştır" onClick={() => commands.current?.zoom(1.2)}><MinusIcon size={22} /></button>
      <button disabled={!ready} aria-label="Üstten 3D görünüm" onClick={() => commands.current?.top()}><CarSimpleIcon size={22} /></button>
      <button disabled={!ready} aria-label="3D görünümünü sıfırla" onClick={() => commands.current?.reset()}><ArrowUUpLeftIcon size={22} /></button>
    </div>
    {error && <p className="upload-error" role="alert">{error}</p>}
    <button className="secondary-button model-import" onClick={() => fileInput.current?.click()} disabled={reading || phase === "loading"}><UploadSimpleIcon size={20} />{reading ? "Model okunuyor…" : "Kendi GLB modelini aç"}</button>
    <input className="file-input" ref={fileInput} type="file" accept=".glb" tabIndex={-1} aria-label="GLB modeli seç" onChange={importModel} />
    <p className="model-file-note">GLB 2.0 · En fazla 20 MB · Dosyan cihazında açılır.</p>
    {source.buffer && <button className="model-demo-return" onClick={() => { setError(""); setSource(DEMO); }}>Örnek modele dön</button>}
  </div>;
}
