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

  /** Minimum acceptable temperature at mid-mountain (°C) during ski hours (08:00–16:00). Colder is still acceptable. */
  DEFAULT_MIN_TEMP: -15,

  /** Maximum acceptable temperature at mid-mountain (°C) during ski hours (08:00–16:00). Warmer = slushy snow. */
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

  /**
   * Snow-Forecast.com API – forecast values from www.snow-forecast.com.
   * Documentation: https://docs.snow-forecast.com (API base URL and parameters are in the docs).
   * Set SNOW_FORECAST_CLIENT_ID and add snowForecastRecordId per resort in resorts.js as per docs.
   * Leave SNOW_FORECAST_CLIENT_ID empty to use Open-Meteo.
   */
  SNOW_FORECAST_CLIENT_ID: '',
  /** API base URL – take the correct host/path from https://docs.snow-forecast.com */
  SNOW_FORECAST_API_BASE: 'https://feeds.snow-forecast.com',
};

// Expose for other scripts; freeze so defaults are not mutated at runtime.
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
}
