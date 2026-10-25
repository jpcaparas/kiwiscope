export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Ray / sphere intersection. Returns the distance along the (normalised) ray
 * to the first hit, or null when the ray misses or the sphere is behind.
 */
export function raySphere(origin: Vec3Like, dir: Vec3Like, center: Vec3Like, radius: number): number | null {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const near = -b - sq;
  if (near >= 0) return near;
  const far = -b + sq;
  return far >= 0 ? 0 : null; // origin inside sphere counts as an immediate hit
}

export const distXZ = (a: Vec3Like, b: Vec3Like): number => Math.hypot(a.x - b.x, a.z - b.z);
