/**
 * API layer: geocoding (Nominatim), weather (Open-Meteo or Snow-Forecast API).
 * When SNOW_FORECAST_CLIENT_ID and resort.snowForecastRecordId are set, forecast values come from the
 * Snow-Forecast API (documentation: https://docs.snow-forecast.com).
 */

/* global CONFIG, RESORTS, SEASON */

function getSnowForecastClientId() {
  return (typeof window !== 'undefined' && window.SNOW_FORECAST_CLIENT_ID) || CONFIG.SNOW_FORECAST_CLIENT_ID || '';
}

function hasSnowForecastFeed() {
  return getSnowForecastClientId().length > 0;
}

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
  if (!res.ok) {
    if (res.status === 429) throw new Error('Zu viele Anfragen. Bitte etwa eine Minute warten und erneut auf „Prüfen“ klicken.');
    throw new Error(`Geocoding failed: ${res.status}`);
  }
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

/** Ski hours (local time): 08:00–16:00. Min/max temp is computed over these hours only. */
var SKI_HOURS_START = 8;
var SKI_HOURS_END = 16;

/**
 * Fetch weather for a single point (Open-Meteo).
 * Uses elevation for downscaling so we get mountain-appropriate values.
 * Min/max temperature and wind max are for ski hours (08:00–16:00) on the given date, not the full day.
 * @param {number} lat
 * @param {number} lon
 * @param {number} elevation - meters
 * @param {string} date - ISO date YYYY-MM-DD
 * @returns {Promise<{ tempMin: number, tempMax: number, windMax: number, snowDepthM: number, snowfallSumCm: number }>}
 */
/** Previous calendar day in YYYY-MM-DD (for fresh snow = snow that fell before the ski day). */
function previousDayIso(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function fetchWeatherForPoint(lat, lon, elevation, date) {
  const prevDate = previousDayIso(date);
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    elevation: String(elevation),
    timezone: 'Europe/Berlin',
    start_date: prevDate,
    end_date: date,
    daily: 'snowfall_sum',
    hourly: 'temperature_2m,snow_depth,wind_speed_10m,wind_gusts_10m',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
  });
  const url = `${CONFIG.OPEN_METEO_BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) throw new Error('Zu viele Anfragen. Bitte etwa eine Minute warten und erneut auf „Prüfen“ klicken.');
    throw new Error(`Weather failed: ${res.status}`);
  }
  const data = await res.json();

  const daily = data.daily;
  // Fresh snow only: from the day *before* the ski day (snow that fell before you ski). Open-Meteo returns mm → convert to cm.
  const prevDayIdx = (daily && daily.time && daily.time.indexOf(prevDate)) >= 0 ? daily.time.indexOf(prevDate) : 0;
  const snowfallSumMm = Array.isArray(daily.snowfall_sum) ? daily.snowfall_sum[prevDayIdx] : 0;
  const snowfallSumCm = snowfallSumMm != null ? Number(snowfallSumMm) / 10 : 0;

  // Below: temp, wind, snow depth = ski day only (hourly data filtered by date).
  // Wind max during ski hours (08:00–16:00) on the ski day
  var windMaxSki = 0;
  if (data.hourly && data.hourly.time) {
    const times = data.hourly.time;
    const windSpeed = data.hourly.wind_speed_10m || [];
    const windGust = data.hourly.wind_gusts_10m || [];
    for (var w = 0; w < times.length; w++) {
      var t = String(times[w]);
      if (!t.startsWith(date)) continue;
      var hourPart = t.indexOf('T') >= 0 ? t.split('T')[1] : '';
      var hour = parseInt(hourPart, 10);
      if (Number.isNaN(hour) || hour < SKI_HOURS_START || hour > SKI_HOURS_END) continue;
      var v = (typeof windSpeed[w] === 'number' ? windSpeed[w] : 0);
      var g = (typeof windGust[w] === 'number' ? windGust[w] : 0);
      windMaxSki = Math.max(windMaxSki, v, g);
    }
  }

  // Temp min/max during ski hours (08:00–16:00) only
  var tempMinSki = NaN;
  var tempMaxSki = NaN;
  if (data.hourly && data.hourly.time && Array.isArray(data.hourly.temperature_2m)) {
    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    for (var i = 0; i < times.length; i++) {
      var t = String(times[i]);
      if (!t.startsWith(date)) continue;
      var hourPart = t.indexOf('T') >= 0 ? t.split('T')[1] : '';
      var hour = parseInt(hourPart, 10);
      if (Number.isNaN(hour) || hour < SKI_HOURS_START || hour > SKI_HOURS_END) continue;
      var v = temps[i];
      if (typeof v === 'number' && !Number.isNaN(v)) {
        if (Number.isNaN(tempMinSki) || v < tempMinSki) tempMinSki = v;
        if (Number.isNaN(tempMaxSki) || v > tempMaxSki) tempMaxSki = v;
      }
    }
  }

  // Snow depth: use hourly for that day; take max as "depth at that elevation".
  var snowDepthM = 0;
  if (data.hourly && data.hourly.time && data.hourly.snow_depth) {
    const hours = data.hourly.time;
    const depths = data.hourly.snow_depth;
    for (var j = 0; j < hours.length; j++) {
      if (String(hours[j]).startsWith(date)) {
        const v = depths[j];
        if (typeof v === 'number' && !Number.isNaN(v)) snowDepthM = Math.max(snowDepthM, v);
      }
    }
  }

  return {
    tempMin: tempMinSki,
    tempMax: tempMaxSki,
    windMax: windMaxSki,
    snowDepthM: snowDepthM,
    snowfallSumCm: snowfallSumCm,
  };
}

/**
 * Fetch 6-day weather from Snow-Forecast feed for one location (record ID).
 * Maps feed response to our format. Uses mid-mountain data when only one elevation is returned.
 * @param {{ snowForecastRecordId: number }} resort - must have snowForecastRecordId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{ tempMin: number, tempMax: number, windMax: number, snowTopCm: number, snowBottomCm: number, freshSnowCm: number }>}
 */
async function fetchResortWeatherFromSnowForecast(resort, date) {
  const clientId = getSnowForecastClientId();
  const recordId = resort.snowForecastRecordId;
  if (!clientId || recordId == null) throw new Error('Snow-Forecast: client_id and resort.snowForecastRecordId required');

  const base = CONFIG.SNOW_FORECAST_API_BASE || 'https://feeds.snow-forecast.com';
  const params = new URLSearchParams({
    client_id: clientId,
    record: String(recordId),
    format: 'json',
    units: 'metric',
    days: '6',
  });
  const url = base.replace(/\/$/, '') + '/weather/feed?' + params.toString();
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) throw new Error('Zu viele Anfragen. Bitte etwa eine Minute warten und erneut auf „Prüfen“ klicken.');
    throw new Error('Snow-Forecast feed failed: ' + res.status);
  }
  const data = await res.json();

  const forecasts = data.Forecasts || data.forecasts || {};
  const dayIndex = getSnowForecastDayIndex(forecasts, date);
  const day = (Array.isArray(forecasts.dates) ? forecasts.dates[dayIndex] : null) ||
    (Array.isArray(forecasts.date) ? forecasts.date[dayIndex] : null);

  const getVal = function (obj, keys, dayIdx) {
    if (obj == null) return null;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = obj[k];
      if (Array.isArray(v) && dayIdx >= 0 && dayIdx < v.length) return v[dayIdx];
      if (typeof v === 'number' && dayIdx === 0) return v;
      if (typeof v === 'number') return v;
    }
    return null;
  };
  const highTemp = getVal(forecasts, ['high-temp', 'high_temp', 'highTemp'], dayIndex);
  const lowTemp = getVal(forecasts, ['low-temp', 'low_temp', 'lowTemp'], dayIndex);
  const wind = getVal(forecasts, ['wind-sustained', 'wind_sustained', 'windSustained', 'wind-sustained-hourly', 'wind_sustained_max'], dayIndex);
  const snowDepth = getVal(forecasts, ['snow-depth', 'snow_depth', 'snowDepth', 'upper-depth', 'lower-depth'], dayIndex);
  // Fresh snow only: from the day before the ski day; temp, wind, snow depth = ski day (dayIndex).
  const prevDayIndex = dayIndex > 0 ? dayIndex - 1 : 0;
  const freshSnow = getVal(forecasts, ['forecasted-snow', 'forecasted_snow', 'forecastedSnow', 'snowfall'], prevDayIndex);

  var snowNum = function (x) {
    if (x == null) return 0;
    var n = Number(x);
    return Number.isFinite(n) ? n : 0;
  };
  var snowDepthCm = snowNum(snowDepth);
  if (snowDepthCm > 0 && snowDepthCm < 10) snowDepthCm *= 100;

  return {
    tempMin: lowTemp != null ? Number(lowTemp) : NaN,
    tempMax: highTemp != null ? Number(highTemp) : NaN,
    windMax: wind != null ? Number(wind) : 0,
    snowTopCm: snowDepthCm,
    snowBottomCm: snowDepthCm,
    freshSnowCm: snowNum(freshSnow),
  };
}

function getSnowForecastDayIndex(forecasts, date) {
  var dates = forecasts.dates || forecasts.date;
  if (!Array.isArray(dates) || dates.length === 0) return 0;
  var dateStr = date.slice(0, 10);
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i];
    if (d == null) continue;
    var s = typeof d === 'string' ? d.slice(0, 10) : (d.date || d).toString().slice(0, 10);
    if (s === dateStr) return i;
  }
  return 0;
}

/**
 * Get weather for top and bottom of a resort for a given date.
 * Uses Snow-Forecast API when SNOW_FORECAST_CLIENT_ID and resort.snowForecastRecordId are set; otherwise Open-Meteo.
 * Temperature min/max are taken at mid-mountain elevation (typical skiing height), not summit, so values are representative of ski hours.
 * @param {{ lat: number, lon: number, elevationTop: number, elevationBottom: number, snowForecastRecordId?: number }} resort
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{ tempMin: number, tempMax: number, windMax: number, snowTopCm: number, snowBottomCm: number, freshSnowCm: number }>}
 */
async function fetchResortWeather(resort, date) {
  if (hasSnowForecastFeed() && resort.snowForecastRecordId != null) {
    try {
      return await fetchResortWeatherFromSnowForecast(resort, date);
    } catch (e) {
      console.warn('Snow-Forecast feed failed, falling back to Open-Meteo:', e.message);
    }
  }

  var midElev = Math.round((resort.elevationTop + resort.elevationBottom) / 2);
  var topPromise = fetchWeatherForPoint(resort.lat, resort.lon, resort.elevationTop, date);
  var bottomPromise = fetchWeatherForPoint(resort.lat, resort.lon, resort.elevationBottom, date);
  var midPromise = fetchWeatherForPoint(resort.lat, resort.lon, midElev, date);

  const [top, bottom, mid] = await Promise.all([topPromise, bottomPromise, midPromise]);

  return {
    tempMin: mid.tempMin,
    tempMax: mid.tempMax,
    windMax: Math.max(top.windMax, bottom.windMax),
    snowTopCm: top.snowDepthM * 100,
    snowBottomCm: bottom.snowDepthM * 100,
    freshSnowCm: (top.snowfallSumCm + bottom.snowfallSumCm) / 2,
  };
}

/**
 * Fetch weather for multiple resorts in parallel.
 * @param {Array<{ lat: number, lon: number, elevationTop: number, elevationBottom: number, snowForecastRecordId?: number }>} resorts
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Array<{ tempMin: number, tempMax: number, windMax: number, snowTopCm: number, snowBottomCm: number, freshSnowCm: number }>>}
 */
async function getResortWeatherBatch(resorts, date) {
  return Promise.all(resorts.map(function (resort) { return fetchResortWeather(resort, date); }));
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
