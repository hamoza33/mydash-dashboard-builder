/**
 * City name mapping for standardization.
 *
 * Maps common variations/system names to their standardized forms.
 */

const CITY_MAP: Record<string, string> = {
  MADEENA: "Madina",
  MAKKAH: "Makkah",
  JEDDAH: "Jeddah",
  GIZAN: "Jazan",
  HOUFUF: "Hofuf",
  SYSTEM: "",
};

/**
 * Maps a city name to its standardized form.
 * Performs case-insensitive lookup. Returns original if no mapping found.
 * @param city - The raw city name
 * @returns The standardized city name
 */
export function mapCity(city: string): string {
  if (!city) return "";

  const upper = city.trim().toUpperCase();

  if (upper in CITY_MAP) {
    return CITY_MAP[upper];
  }

  // Return the original trimmed value if no mapping exists
  return city.trim();
}

/**
 * Returns all known city mappings (for reference/display).
 */
export function getCityMappings(): Record<string, string> {
  return { ...CITY_MAP };
}
