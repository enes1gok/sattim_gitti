import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh, SplatFileType } from "@sparkjsdev/spark";
import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, CarSimpleIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { validateAppearanceFile, validateAppearanceBounds, type AppearanceModel } from "./appearance-file";
import { fitVehicleCamera } from "./vehicle-camera";

type Commands = { rotate: (direction: number) => void; zoom: (factor: number) => void; reset: () => void; top: () => void };
export default function VehicleAppearance({ model, name, onFallback }: { model: AppearanceModel; name: string; onFallback: () => void }) {
  const host = useRef<HTMLDivElement>(null), commands = useRef<Commands | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false, pending = 0;
    let renderer: THREE.WebGLRenderer | undefined, spark: SparkRenderer | undefined, splat: SplatMesh | undefined, controls: OrbitControls | undefined, observer: ResizeObserver | undefined;
    setReady(false); setError("");
    const load = async () => {
      try {
        validateAppearanceFile(model.buffer); validateAppearanceBounds(model.bounds);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
        renderer.domElement.setAttribute("aria-label", "Fotoğraflardan oluşturulmuş döndürülebilir araç");
        container.prepend(renderer.domElement);
        const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(57, 1, .05, 60);
        const requestRender = () => {
          if (disposed || pending) return;
          pending = requestAnimationFrame(() => {
            pending = 0;
            if (disposed || !renderer) return;
            renderer.render(scene, camera);
            renderer.domElement.dataset.azimuth = controls!.getAzimuthalAngle().toFixed(3);
            renderer.domElement.dataset.distance = controls!.getDistance().toFixed(3);
          });
        };
        controls = new OrbitControls(camera, renderer.domElement); controls.enablePan = false;
        controls.minDistance = 1.6; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI / 2 - .02;
        controls.addEventListener("change", requestRender);
        spark = new SparkRenderer({ renderer, onDirty: requestRender }); scene.add(spark);
        splat = new SplatMesh({ fileBytes: model.buffer, fileType: SplatFileType.PLY });
        const bounds = new THREE.Box3(new THREE.Vector3(...model.bounds.min), new THREE.Vector3(...model.bounds.max));
        const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
        const scale = 3 / Math.max(size.x, size.y, size.z);
        splat.scale.setScalar(scale); splat.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale); scene.add(splat);
        const targetY = size.y * scale * .5;
        const framedBounds = new THREE.Box3(new THREE.Vector3(-size.x * scale / 2, 0, -size.z * scale / 2), new THREE.Vector3(size.x * scale / 2, size.y * scale, size.z * scale / 2));
        const reset = () => { controls!.target.set(0, targetY, 0); fitVehicleCamera(camera, framedBounds, controls!.target, new THREE.Vector3(2.3, .4, 1.05)); controls!.update(); requestRender(); };
        commands.current = {
          reset,
          rotate: (direction) => { controls!.rotateLeft(direction * Math.PI / 6); controls!.update(); },
          zoom: (factor) => { camera.position.sub(controls!.target).multiplyScalar(factor).add(controls!.target); controls!.update(); },
          top: () => { camera.position.set(.001, 5, 0); controls!.update(); },
        };
        const resize = () => { if (!renderer) return; renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight)); camera.aspect = container.clientWidth / Math.max(1, container.clientHeight); camera.updateProjectionMatrix(); requestRender(); };
        observer = new ResizeObserver(resize);
        observer.observe(container); resize(); reset();
        renderer.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); if (!disposed) { setReady(false); setError("Gerçekçi görünüm bu cihazda durakladı. Geometri görünümüyle devam edebilirsin."); } });
        await splat.initialized;
        if (disposed) return;
        setReady(true); requestRender();
      } catch (reason) { if (!disposed) setError(reason instanceof Error && !reason.message.includes("THREE") ? reason.message : "Gerçekçi görünüm açılamadı. Geometri görünümüyle devam edebilirsin."); }
    };
    void load();
    return () => { disposed = true; cancelAnimationFrame(pending); observer?.disconnect(); controls?.dispose(); commands.current = null; splat?.dispose(); spark?.dispose(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove(); };
  }, [model]);
  return <div className="model-viewer">
    <div className="model-identity"><span className="eyebrow">ÇEKİMLERİNDEN OLUŞTURULDU</span><strong>{name}</strong><p>Gerçekçi görünüm · Hasar analizi ve parça eşleştirmesi yapılmadı.</p></div>
    <div className="model-stage" ref={host} data-scroll-drag="ignore" tabIndex={0} role="group" aria-label="Gerçekçi araç görünümü; ok tuşlarıyla döndür, artı ve eksiyle yakınlaştır" onKeyDown={(e) => {
      if (!ready) return;
      if (["ArrowLeft", "ArrowRight", "+", "=", "-"].includes(e.key)) e.preventDefault();
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) commands.current?.rotate(e.key === "ArrowLeft" ? 1 : -1);
      if (["+", "=", "-"].includes(e.key)) commands.current?.zoom(e.key === "-" ? 1.2 : .8);
    }}>{!ready && <div className="model-state" role="status"><strong>{error ? "Görünüm açılamadı" : "Gerçekçi görünüm açılıyor…"}</strong></div>}</div>
    <p className="model-gesture">Sürükleyerek döndür · İki parmakla yakınlaştır</p>
    <div className="model-controls" role="group" aria-label="Gerçekçi görünüm kontrolleri">
      <button disabled={!ready} aria-label="Sola döndür" onClick={() => commands.current?.rotate(1)}><ArrowCounterClockwiseIcon size={22}/></button>
      <button disabled={!ready} aria-label="Sağa döndür" onClick={() => commands.current?.rotate(-1)}><ArrowClockwiseIcon size={22}/></button>
      <button disabled={!ready} aria-label="Yakınlaştır" onClick={() => commands.current?.zoom(.8)}><PlusIcon size={22}/></button>
      <button disabled={!ready} aria-label="Uzaklaştır" onClick={() => commands.current?.zoom(1.2)}><MinusIcon size={22}/></button>
      <button disabled={!ready} aria-label="Üstten 3D görünüm" onClick={() => commands.current?.top()}><CarSimpleIcon size={22}/></button>
      <button disabled={!ready} aria-label="3D görünümünü sıfırla" onClick={() => commands.current?.reset()}><ArrowUUpLeftIcon size={22}/></button>
    </div>
    {error && <><p role="alert" className="upload-error">{error}</p><button className="secondary-button" onClick={onFallback}>Geometri görünümünü aç</button></>}
    <p className="model-file-note">Görünüm fotoğraflardan öğrenildi. Eksik açılar ve yansımalar bozulma gösterebilir.</p>
  </div>;
}
