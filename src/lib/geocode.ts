/** Module-level cache so repeated lookups for the same coordinates are instant. */
const cache = new Map<string, string>();

function extractName(data: { address?: Record<string, string>; error?: string }): string {
  if (data.error) return '';
  const addr = data.address;
  return (
    addr?.beach || addr?.tourism || addr?.natural ||
    addr?.city || addr?.town || addr?.village ||
    addr?.municipality || addr?.county || addr?.state || ''
  );
}

/**
 * Reverse-geocodes a coordinate pair to a human-readable place name.
 * Tries zoom levels 14 → 10 → 5 and falls back to "Mar abierto".
 * Results are cached by coordinate (4 decimal places ≈ 11 m precision).
 */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key)!;

  for (const zoom of [14, 10, 5]) {
    if (signal?.aborted) return 'Mar abierto';
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=${zoom}&accept-language=es`,
        signal ? { signal } : undefined
      );
      const data = await res.json();
      const name = extractName(data);
      if (name) {
        cache.set(key, name);
        return name;
      }
    } catch {
      break;
    }
  }

  if (!signal?.aborted) cache.set(key, 'Mar abierto');
  return 'Mar abierto';
}
