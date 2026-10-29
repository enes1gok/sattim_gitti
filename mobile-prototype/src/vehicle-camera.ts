import * as THREE from "three";

/** Fit every bounding-box corner, including perspective depth, inside the viewport. */
export function fitVehicleCamera(camera: THREE.PerspectiveCamera, bounds: THREE.Box3, target: THREE.Vector3, direction: THREE.Vector3): void {
  const back = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(camera.up, back).normalize();
  const up = new THREE.Vector3().crossVectors(back, right);
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanX = tanY * camera.aspect;
  let distance = 0;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const corner = new THREE.Vector3(x, y, z).sub(target);
    distance = Math.max(distance, corner.dot(back) + Math.abs(corner.dot(right)) / (tanX * .9), corner.dot(back) + Math.abs(corner.dot(up)) / (tanY * .9));
  }
  camera.position.copy(target).addScaledVector(back, distance);
  camera.lookAt(target);
  camera.updateMatrixWorld();
}
