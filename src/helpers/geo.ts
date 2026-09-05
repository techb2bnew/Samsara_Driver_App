/**
 * Distance arithmetic, with nothing native behind it.
 *
 * Split out of location.ts on purpose. That file imports the geolocation
 * module, which needs a native binding — so anything importing it cannot be
 * unit tested and cannot be used from a context without the module loaded.
 * The maths is the part worth testing and the part with no dependencies.
 */

const EARTH_RADIUS_M = 6_371_000;

/**
 * Metres between two points.
 *
 * Haversine on a sphere, not an ellipsoid. Over the distances this is asked
 * about — is the driver at this loading bay or four kilometres away — the
 * error against a proper geodesic calculation is centimetres, and the check
 * has a tolerance of a kilometre.
 */
export function metresBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** "850 m", "4.2 km" — the way a driver reads a distance, not 4238 metres. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
