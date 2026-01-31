/**
 * API layer: geocoding (Nominatim) and weather (Open-Meteo).
 * All calls are from the client; no API keys required for default usage.
 */

/* global CONFIG, RESORTS, SEASON */

/**
 * Geocode a city name to WGS84 coordinates.
 * @param {string} city - City name (e.g. "Munich")
 * @returns {Promise<{ lat: number, lon: number }>}
 * @throws {Error} When no result or request fails
 */
async function geocodeCity(city) {
  const params = new URLSearchParams({
    q: city,
    format: 'json',
    limit: '1',
  });
  const url = `${CONFIG.NOMINATIM_BASE}?${params}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': CONFIG.NOMINATIM_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error(`City not found: ${city}`);
  const first = data[0];
  return { lat: parseFloat(first.lat), lon: parseFloat(first.lon) };
}

/**
 * Haversine distance between two points (km).
 * @param {{ lat: number, lon: number }} a
 * @param {{ lat: number, lon: number }} b
 * @returns {number} Distance in km
 */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

/**
 * Find all resorts within max distance of a point, sorted by distance (nearest first).
 * @param {{ lat: number, lon: number }} cityCoords
 * @param {number} maxDistanceKm
 * @returns {Array<{ id: string, name: string, lat: number, lon: number, elevationTop: number, elevationBottom: number, distanceKm: number }>}
 */
function findResortsInRange(cityCoords, maxDistanceKm) {
  const list = [];
  for (const r of RESORTS) {
    const d = haversineKm(cityCoords, { lat: r.lat, lon: r.lon });
    if (d <= maxDistanceKm) {
      list.push({ ...r, distanceKm: d });
    }
  }
  list.sort((a, b) => a.distanceKm - b.distanceKm);
  return list;
}

/**
 * Fetch weather for a single point (Open-Meteo).
 * Uses elevation for downscaling so we get mountain-appropriate values.
 * @param {number} lat
 * @param {number} lon
 * @param {number} elevation - meters
 * @param {string} date - ISO date YYYY-MM-DD
 * @returns {Promise<{ tempMin: number, tempMax: number, windMax: number, snowDepthM: number, snowfallSumCm: number }>}
 */
async function fetchWeatherForPoint(lat, lon, elevation, date) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    elevation: String(elevation),
    timezone: 'Europe/Berlin',
    start_date: date,
    end_date: date,
    daily: 'temperature_2m_min,temperature_2m_max,wind_speed_10m_max,wind_gusts_10m_max,snowfall_sum',
    hourly: 'snow_depth',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
  });
  const url = `${CONFIG.OPEN_METEO_BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather failed: ${res.status}`);
  const data = await res.json();

  const daily = data.daily;
  const dayIdx = (daily && daily.time && daily.time.indexOf(date)) >= 0 ? daily.time.indexOf(date) : 0;

  const tempMin = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[dayIdx] : null;
  const tempMax = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[dayIdx] : null;
  const windMax = Array.isArray(daily.wind_speed_10m_max) ? daily.wind_speed_10m_max[dayIdx] : null;
  const windGust = Array.isArray(daily.wind_gusts_10m_max) ? daily.wind_gusts_10m_max[dayIdx] : null;
  const snowfallSum = Array.isArray(daily.snowfall_sum) ? daily.snowfall_sum[dayIdx] : 0;

  // Snow depth: use hourly for that day; take max as "depth at that elevation".
  let snowDepthM = 0;
  if (data.hourly && data.hourly.time && data.hourly.snow_depth) {
    const hours = data.hourly.time;
    const depths = data.hourly.snow_depth;
    for (let i = 0; i < hours.length; i++) {
      if (String(hours[i]).startsWith(date)) {
        const v = depths[i];
        if (typeof v === 'number' && !Number.isNaN(v)) snowDepthM = Math.max(snowDepthM, v);
      }
    }
  }

  return {
    tempMin: tempMin != null ? Number(tempMin) : NaN,
    tempMax: tempMax != null ? Number(tempMax) : NaN,
    windMax: Math.max(
      windMax != null ? Number(windMax) : 0,
      windGust != null ? Number(windGust) : 0
    ),
    snowDepthM,
    snowfallSumCm: snowfallSum != null ? Number(snowfallSum) : 0,
  };
}

/**
 * Get weather for top and bottom of a resort for a given date.
 * @param {{ lat: number, lon: number, elevationTop: number, elevationBottom: number }} resort
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{ tempMin: number, tempMax: number, windMax: number, snowTopCm: number, snowBottomCm: number, freshSnowCm: number }>}
 */
async function fetchResortWeather(resort, date) {
  const [top, bottom] = await Promise.all([
    fetchWeatherForPoint(resort.lat, resort.lon, resort.elevationTop, date),
    fetchWeatherForPoint(resort.lat, resort.lon, resort.elevationBottom, date),
  ]);

  return {
    tempMin: Math.min(top.tempMin, bottom.tempMin),
    tempMax: Math.max(top.tempMax, bottom.tempMax),
    windMax: Math.max(top.windMax, bottom.windMax),
    snowTopCm: top.snowDepthM * 100,
    snowBottomCm: bottom.snowDepthM * 100,
    freshSnowCm: (top.snowfallSumCm + bottom.snowfallSumCm) / 2,
  };
}

/**
 * Check if a date falls within the typical ski season.
 * @param {string} date - YYYY-MM-DD
 * @returns {boolean}
 */
function isInSeason(date) {
  const [startMonth, startDay] = SEASON.start.split('-').map(Number);
  const [endMonth, endDay] = SEASON.end.split('-').map(Number);
  const parts = date.split('-').map(Number);
  const month = parts[1];
  const day = parts[2];
  const startVal = startMonth * 100 + startDay;
  const endVal = endMonth * 100 + endDay;
  const val = month * 100 + day;
  // Season spans year boundary (Dec -> Apr)
  if (startVal > endVal) {
    return val >= startVal || val <= endVal;
  }
  return val >= startVal && val <= endVal;
}
