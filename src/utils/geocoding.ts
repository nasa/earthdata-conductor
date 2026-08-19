/**
 * Pre-defined bounding boxes for common geographic regions [west, south, east, north]
 */
const PREDEFINED_BOUNDS: Record<string, [number, number, number, number]> = {
  "los angeles": [-118.668, 33.703, -118.155, 34.337],
  "los angeles, ca": [-118.668, 33.703, -118.155, 34.337],
  "los angeles, california": [-118.668, 33.703, -118.155, 34.337],
  asheville: [-82.656, 35.531, -82.492, 35.656],
  "asheville, nc": [-82.656, 35.531, -82.492, 35.656],
  "asheville, north carolina": [-82.656, 35.531, -82.492, 35.656],
  california: [-124.482, 32.528, -114.131, 42.009],
  virginia: [-83.675, 36.54, -75.242, 39.466],
  jamaica: [-78.366, 17.705, -76.182, 18.525],
  amazon: [-75.0, -15.0, -45.0, 5.0],
  "united states": [-125.0, 24.5, -66.9, 49.3],
  usa: [-125.0, 24.5, -66.9, 49.3],
};

/**
 * Utility function to geocode a location string into bounding box coordinates [west, south, east, north]
 * using predefined dictionary with OpenStreetMap Nominatim fallback.
 */
export async function geocodeToBbox(
  location: string,
): Promise<[number, number, number, number] | null> {
  if (!location?.trim()) {
    return null;
  }

  const normalized = location.trim().toLowerCase();
  if (PREDEFINED_BOUNDS[normalized]) {
    return PREDEFINED_BOUNDS[normalized];
  }

  // Partial match check for predefined locations
  for (const [key, bbox] of Object.entries(PREDEFINED_BOUNDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return bbox;
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      location.trim(),
    )}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EarthdataConductor/0.0.2 (contact@earthdata.nasa.gov)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Nominatim geocoding returned status ${res.status}`);
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>[];
    if (data && data.length > 0) {
      const item = data[0];
      if (item.boundingbox) {
        const [southStr, northStr, westStr, eastStr] = item.boundingbox as [
          string,
          string,
          string,
          string,
        ];
        const south = Number(southStr);
        const north = Number(northStr);
        const west = Number(westStr);
        const east = Number(eastStr);

        if (
          !Number.isNaN(south) &&
          !Number.isNaN(north) &&
          !Number.isNaN(west) &&
          !Number.isNaN(east)
        ) {
          return [west, south, east, north];
        }
      }
    }
  } catch (err) {
    console.error(`Geocoding failed for '${location}':`, err);
  }

  return null;
}
