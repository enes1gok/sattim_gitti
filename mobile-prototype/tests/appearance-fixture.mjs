export function gaussianFixture(count = 1002) {
  const names = ["x", "y", "z", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3", "f_dc_0", "f_dc_1", "f_dc_2"];
  const header = Buffer.from(`ply\nformat binary_little_endian 1.0\nelement vertex ${count}\n${names.map((name) => `property float ${name}`).join("\n")}\nend_header\n`);
  const data = Buffer.alloc(count * names.length * 4);
  for (let i = 0; i < count; i++) [0, .5, 0, 2, -3, -3, -3, 1, 0, 0, 0, .2, .3, .4].forEach((value, j) => data.writeFloatLE(value, (i * names.length + j) * 4));
  return Buffer.concat([header, data]);
}
export const fixtureBounds = { min: [-1, 0, -2], max: [1, 1, 2] };
