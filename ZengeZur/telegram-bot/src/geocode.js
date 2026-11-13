/**
 * Reverse-geocode GPS coordinates to an Azerbaijani address.
 * Uses OpenStreetMap Nominatim (free, no key). Falls back to raw coordinates.
 */

export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=az`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CivicWave-Telegram-Bot/1.0 (Narimanov hackathon)' },
    });
    if (res.ok) {
      const json = await res.json();
      const a = json.address || {};
      const parts = [
        a.road,
        a.house_number,
        a.neighbourhood || a.suburb || a.quarter || a.city_district,
        a.city || a.town || a.village,
      ].filter(Boolean);
      // de-duplicate while keeping order
      const seen = new Set();
      const concise = parts.filter((p) => (seen.has(p) ? false : seen.add(p)));
      if (concise.length) return concise.join(', ');
      if (json.display_name) return json.display_name;
    }
  } catch {
    // ignore — fall back to coordinates
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
