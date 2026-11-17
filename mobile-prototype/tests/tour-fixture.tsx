import { createRoot } from "react-dom/client";
import { useState } from "react";
import VehicleTour from "../src/VehicleTour";
import "../src/prototype.css";

const photos = Array.from({ length: 96 }, (_, index) => ({ id: String(index), pass: Math.floor(index / 48), angle: Math.floor((index % 48) / 6), url: `/assets/car-front.png?fixture=${index}`, name: `fixture-${index}.png` }));
function Fixture() {
  const [partial, setPartial] = useState(false);
  return <main style={{ maxWidth: 390, margin: "auto" }}><button onClick={() => setPartial(!partial)}>Eksik / tam tur</button><VehicleTour key={String(partial)} photos={partial ? photos.slice(0, 6) : photos} /></main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
