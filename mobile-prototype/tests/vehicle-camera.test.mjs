import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { fitVehicleCamera } from "../src/vehicle-camera.ts";

test("complete vehicle stays inside the initial frame across viewport and body proportions", () => {
  for (const aspect of [.8, 1.275, 1.397, 2]) for (const dimensions of [[1.6, .8, 3], [3, 1, 1.7], [2, 2.5, 3]]) {
    const [w, h, d] = dimensions;
    const bounds = new THREE.Box3(new THREE.Vector3(-w / 2, 0, -d / 2), new THREE.Vector3(w / 2, h, d / 2));
    const camera = new THREE.PerspectiveCamera(57, aspect, .05, 60);
    fitVehicleCamera(camera, bounds, new THREE.Vector3(0, h / 2, 0), new THREE.Vector3(2.3, .4, 1.05));
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(point.x) <= .901 && Math.abs(point.y) <= .901 && point.z > -1 && point.z < 1);
    }
  }
});
