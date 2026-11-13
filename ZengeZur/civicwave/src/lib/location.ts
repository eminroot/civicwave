import * as Location from 'expo-location';

export type GeoResult = {
  lat: number;
  lng: number;
  address: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Məkan vaxtında tapılmadı')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Request permission, get the position and reverse-geocode it to an address.
 * A fix from the last two minutes is used at once; otherwise the phone is asked for a
 * new one, and the caller gets an error after 12 seconds instead of waiting forever.
 */
export async function getCurrentPlace(): Promise<GeoResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Məkan icazəsi verilmədi');
  }
  const recent = await Location.getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 100 }).catch(
    () => null
  );
  const pos =
    recent ??
    (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 12_000));
  const { latitude, longitude } = pos.coords;
  let address = '';
  try {
    const places = await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), 6_000);
    const p = places[0];
    if (p) {
      address = [p.street, p.name && p.name !== p.street ? p.name : null, p.district || p.city]
        .filter(Boolean)
        .join(', ');
    }
  } catch {
    // reverse geocoding can fail offline; fall back to coordinates
  }
  if (!address) address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  return { lat: latitude, lng: longitude, address };
}
