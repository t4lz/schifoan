/**
 * Default criteria and API configuration for the ski-day checker.
 * All values are used as form defaults and as fallbacks when parsing fails.
 */

/** @type {Record<string, string|number>} */
var CONFIG = {
  /** Default city for "from where" (used for distance filter). */
  DEFAULT_CITY: 'Munich',

  /** Maximum distance from city to resort (km). Resorts farther than this are excluded. */
  DEFAULT_MAX_DISTANCE_KM: 150,

  /** Minimum acceptable temperature on the mountain (°C). Colder is still acceptable. */
  DEFAULT_MIN_TEMP: -15,

  /** Maximum acceptable temperature on the mountain (°C). Warmer = slushy snow. */
  DEFAULT_MAX_TEMP: 5,

  /** Maximum acceptable wind speed (km/h). Stronger wind can close lifts. */
  DEFAULT_MAX_WIND_KMH: 50,

  /** Minimum snow depth at top of resort (cm). */
  DEFAULT_MIN_SNOW_TOP_CM: 30,

  /** Minimum snow depth at bottom of resort (cm). */
  DEFAULT_MIN_SNOW_BOTTOM_CM: 10,

  /**
   * Minimum fresh snow (cm). Only applied when "require fresh snow" is enabled.
   * Optional; when not set, fresh snow is not required.
   */
  DEFAULT_MIN_FRESH_SNOW_CM: 5,

  /** Open-Meteo base URL (no API key, CORS enabled for non-commercial use). */
  OPEN_METEO_BASE: 'https://api.open-meteo.com/v1/forecast',

  /** Nominatim (OSM) base URL for geocoding. Requires User-Agent header. */
  NOMINATIM_BASE: 'https://nominatim.openstreetmap.org/search',

  /** User-Agent for Nominatim (required by OSM usage policy). */
  NOMINATIM_USER_AGENT: 'SkiDayChecker/1.0 (static site; contact in README)',
};

// Expose for other scripts; freeze so defaults are not mutated at runtime.
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
}
