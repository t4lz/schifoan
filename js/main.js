/**
 * Main entry: form handling, API calls, result display, resort list, and title update.
 * Depends: CONFIG, RESORTS, SEASON (config + data), api.js, decision.js.
 */

/* global CONFIG, RESORTS, SEASON, geocodeCity, findResortsInRange, getResortWeatherBatch, isInSeason, decide, outcomeRank, OUTCOMES */

(function () {
  'use strict';

  const form = document.getElementById('ski-form');
  const resultEl = document.getElementById('result');
  const resultTextEl = document.getElementById('result-text');
  const resultReasonEl = document.getElementById('result-reason');
  const resortListSection = document.getElementById('resort-list-section');
  const resortTableBody = document.getElementById('resort-table-body');
  const resortTable = document.getElementById('resort-table');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const titleEl = document.querySelector('title');
  const pageTitleEl = document.getElementById('page-title');

  /** Per-resort row data for the table. */
  let resortRows = [];
  /** Current sort: { key: string, dir: 1 | -1 } */
  let sortState = { key: 'outcome', dir: -1 };
  /** Criteria and city from last run (for cell coloring and links). */
  let lastCriteria = null;
  let lastCity = '';

  /** Get tomorrow in local date as YYYY-MM-DD. */
  function getTomorrowISO() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  /** Format date for title: e.g. "Samstag, 01.02.2025". */
  function formatDateForTitle(isoDate) {
    const d = new Date(isoDate + 'T12:00:00');
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const dayName = days[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${dayName}, ${day}.${month}.${year}`;
  }

  /** Update document title and visible h1 based on selected date. */
  function updateTitle(isoDate) {
    const label = formatDateForTitle(isoDate);
    const text = `Ist ${label} ein guter Tag zum Skifahren?`;
    if (titleEl) titleEl.textContent = text;
    if (pageTitleEl) pageTitleEl.textContent = text;
  }

  /** Set form defaults (date = tomorrow, city = Munich, CONFIG defaults). */
  function setDefaults() {
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = getTomorrowISO();
    const cityInput = document.getElementById('city');
    if (cityInput) cityInput.value = CONFIG.DEFAULT_CITY;
    const maxDist = document.getElementById('max-distance');
    if (maxDist) maxDist.value = CONFIG.DEFAULT_MAX_DISTANCE_KM;
    const minTemp = document.getElementById('min-temp');
    if (minTemp) minTemp.value = CONFIG.DEFAULT_MIN_TEMP;
    const maxTemp = document.getElementById('max-temp');
    if (maxTemp) maxTemp.value = CONFIG.DEFAULT_MAX_TEMP;
    const maxWind = document.getElementById('max-wind');
    if (maxWind) maxWind.value = CONFIG.DEFAULT_MAX_WIND_KMH;
    const minSnowTop = document.getElementById('min-snow-top');
    if (minSnowTop) minSnowTop.value = CONFIG.DEFAULT_MIN_SNOW_TOP_CM;
    const minSnowBottom = document.getElementById('min-snow-bottom');
    if (minSnowBottom) minSnowBottom.value = CONFIG.DEFAULT_MIN_SNOW_BOTTOM_CM;
    const freshCheck = document.getElementById('require-fresh-snow');
    if (freshCheck) freshCheck.checked = false;
    const minFresh = document.getElementById('min-fresh-snow');
    if (minFresh) {
      minFresh.value = CONFIG.DEFAULT_MIN_FRESH_SNOW_CM;
      minFresh.disabled = true;
    }
    updateTitle(getTomorrowISO());
  }

  /** Read criteria from form. */
  function getCriteria() {
    const getNum = (id, def) => {
      const el = document.getElementById(id);
      const v = el ? parseFloat(el.value) : def;
      return Number.isFinite(v) ? v : def;
    };
    const requireFresh = document.getElementById('require-fresh-snow');
    const freshChecked = requireFresh ? requireFresh.checked : false;
    return {
      maxDistanceKm: getNum('max-distance', CONFIG.DEFAULT_MAX_DISTANCE_KM),
      minTemp: getNum('min-temp', CONFIG.DEFAULT_MIN_TEMP),
      maxTemp: getNum('max-temp', CONFIG.DEFAULT_MAX_TEMP),
      maxWindKmh: getNum('max-wind', CONFIG.DEFAULT_MAX_WIND_KMH),
      minSnowTopCm: getNum('min-snow-top', CONFIG.DEFAULT_MIN_SNOW_TOP_CM),
      minSnowBottomCm: getNum('min-snow-bottom', CONFIG.DEFAULT_MIN_SNOW_BOTTOM_CM),
      requireFreshSnow: freshChecked,
      minFreshSnowCm: freshChecked ? getNum('min-fresh-snow', CONFIG.DEFAULT_MIN_FRESH_SNOW_CM) : 0,
    };
  }

  /** Get selected date (YYYY-MM-DD). */
  function getSelectedDate() {
    const el = document.getElementById('date');
    return el && el.value ? el.value : getTomorrowISO();
  }

  function showLoading(show) {
    if (loadingEl) loadingEl.hidden = !show;
    if (errorEl) errorEl.hidden = true;
    if (resultEl) resultEl.hidden = true;
    if (resortListSection) resortListSection.hidden = true;
  }

  function showError(message) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.toggle('error--rate-limit', message.indexOf('Zu viele Anfragen') !== -1);
      errorEl.hidden = false;
    }
    if (resultEl) resultEl.hidden = true;
    if (resortListSection) resortListSection.hidden = true;
  }

  function showResult(outcome, reason) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (resultEl) {
      resultEl.hidden = false;
      if (resultTextEl) resultTextEl.textContent = outcome;
      if (resultReasonEl) resultReasonEl.textContent = reason || '';
      resultEl.className = 'result result--' + outcome.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'result';
    }
  }

  /** Pick best outcome from list (Ja! > Joa > geht > nicht so wirklich > Nein.). */
  function bestOutcome(outcomes) {
    for (let i = 0; i < OUTCOMES.length; i++) {
      if (outcomes.indexOf(OUTCOMES[i]) >= 0) return OUTCOMES[i];
    }
    return 'Nein.';
  }

  /**
   * Get cell status for coloring: 'good' (meets criterion), 'bad' (disqualifying), 'neutral'.
   * @param {string} key - Column key
   * @param {Object} row - Row data
   * @returns {string}
   */
  function getCellStatus(key, row) {
    if (!lastCriteria) return 'neutral';
    const c = lastCriteria;
    switch (key) {
      case 'tempMin':
        return row.tempMin < c.minTemp ? 'bad' : 'good';
      case 'tempMax':
        return row.tempMax > c.maxTemp ? 'bad' : 'good';
      case 'windMax':
        return row.windMax > c.maxWindKmh ? 'bad' : 'good';
      case 'snowTopCm':
        return row.snowTopCm < c.minSnowTopCm ? 'bad' : 'good';
      case 'snowBottomCm':
        return row.snowBottomCm < c.minSnowBottomCm ? 'bad' : 'good';
      case 'freshSnowCm':
        if (!c.requireFreshSnow) return 'neutral';
        return row.freshSnowCm < c.minFreshSnowCm ? 'bad' : 'good';
      case 'outcome':
      case 'name':
      case 'distanceKm':
      default:
        return 'neutral';
    }
  }

  /**
   * URL for ski forecast for a resort. Bergfex when we have bergfexSlug; otherwise Google search (site:bergfex.com).
   * @param {Object} row - Row data (name, bergfexSlug for links)
   * @returns {string}
   */
  function getSkiForecastUrl(row) {
    const name = (row.name || '').trim();
    const enc = encodeURIComponent;
    if (row.bergfexSlug) {
      return 'https://www.bergfex.com/' + encodeURIComponent(row.bergfexSlug) + '/wetter/prognose/';
    }
    return 'https://www.google.com/search?q=' + enc('site:bergfex.com ' + name);
  }

  function getCellLink(key, row) {
    const lat = row.lat;
    const lon = row.lon;
    const name = (row.name || '').trim();
    const enc = encodeURIComponent;
    var skiForecastUrl = getSkiForecastUrl(row);
    switch (key) {
      case 'outcome':
        return skiForecastUrl;
      case 'name':
        return skiForecastUrl;
      case 'distanceKm':
        if (lastCity && lat != null && lon != null) {
          return 'https://www.google.com/maps/dir/?api=1&origin=' + enc(lastCity) + '&destination=' + lat + ',' + lon;
        }
        return 'https://www.google.com/maps/';
      case 'tempMin':
      case 'tempMax':
      case 'windMax':
      case 'snowTopCm':
      case 'snowBottomCm':
      case 'freshSnowCm':
        return skiForecastUrl;
      default:
        return '#';
    }
  }

  /** Sort resort rows by current sortState and render table body. */
  function sortAndRenderResortTable() {
    const key = sortState.key;
    const dir = sortState.dir;
    const sorted = resortRows.slice().sort((a, b) => {
      let cmp = 0;
      if (key === 'outcome') {
        cmp = outcomeRank(a.outcome) - outcomeRank(b.outcome);
        if (cmp === 0) cmp = a.distanceKm - b.distanceKm;
      } else if (key === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (key === 'distanceKm' || key === 'tempMin' || key === 'tempMax' || key === 'windMax' || key === 'snowTopCm' || key === 'snowBottomCm' || key === 'freshSnowCm') {
        const va = Number(a[key]);
        const vb = Number(b[key]);
        cmp = (Number.isFinite(va) ? va : -Infinity) - (Number.isFinite(vb) ? vb : -Infinity);
      }
      return dir * (cmp < 0 ? -1 : cmp > 0 ? 1 : 0);
    });
    renderResortTableBody(sorted);
    updateSortIndicators();
  }

  function renderResortTableBody(rows) {
    if (!resortTableBody) return;
    resortTableBody.innerHTML = '';
    const columns = [
      { key: 'outcome', format: function (r) { return r.outcome || ''; }, decimals: null },
      { key: 'name', format: function (r) { return r.name || ''; }, decimals: null },
      { key: 'distanceKm', format: function (r) { return formatNum(r.distanceKm, 0); }, decimals: 0 },
      { key: 'tempMin', format: function (r) { return formatNum(r.tempMin, 0); }, decimals: 0 },
      { key: 'tempMax', format: function (r) { return formatNum(r.tempMax, 0); }, decimals: 0 },
      { key: 'windMax', format: function (r) { return formatNum(r.windMax, 0); }, decimals: 0 },
      { key: 'snowTopCm', format: function (r) { return formatNum(r.snowTopCm, 0); }, decimals: 0 },
      { key: 'snowBottomCm', format: function (r) { return formatNum(r.snowBottomCm, 0); }, decimals: 0 },
      { key: 'freshSnowCm', format: function (r) { return formatNum(r.freshSnowCm, 1); }, decimals: 1 },
    ];
    rows.forEach(function (row) {
      const tr = document.createElement('tr');
      tr.className = 'resort-table__row resort-table__row--' + (row.outcome || 'nein').replace(/[^a-z0-9]/gi, '').toLowerCase();
      let html = '';
      columns.forEach(function (col) {
        const status = getCellStatus(col.key, row);
        const text = col.key === 'outcome' || col.key === 'name' ? escapeHtml(row[col.key] || '') : col.format(row);
        const href = getCellLink(col.key, row);
        const cellClass = 'resort-table__cell resort-table__cell--' + status +
          (col.key === 'outcome' ? ' resort-table__cell--outcome' : '') +
          (col.decimals != null ? ' resort-table__cell--num' : '');
        const linkTitle = status === 'bad' ? 'Kriterium nicht erfüllt – Quelle prüfen' : 'Quelle / Mehr erfahren';
        html += '<td class="' + cellClass + '" title="' + (status === 'bad' ? 'Kriterium nicht erfüllt' : '') + '">';
        html += '<a class="resort-table__link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(linkTitle) + '">';
        html += text;
        html += '</a></td>';
      });
      tr.innerHTML = html;
      resortTableBody.appendChild(tr);
    });
  }

  function formatNum(n, decimals) {
    if (n == null || !Number.isFinite(n)) return '–';
    return decimals === 0 ? String(Math.round(n)) : Number(n).toFixed(decimals);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function updateSortIndicators() {
    const headers = resortTable ? resortTable.querySelectorAll('.resort-table__th--sortable') : [];
    headers.forEach(function (th) {
      const dataSort = th.getAttribute('data-sort');
      th.classList.remove('resort-table__th--asc', 'resort-table__th--desc');
      if (dataSort === sortState.key) {
        th.classList.add(sortState.dir === 1 ? 'resort-table__th--asc' : 'resort-table__th--desc');
      }
    });
  }

  async function runCheck() {
    const date = getSelectedDate();
    const criteria = getCriteria();
    const cityInput = document.getElementById('city');
    const city = (cityInput && cityInput.value.trim()) || CONFIG.DEFAULT_CITY;

    showLoading(true);

    try {
      updateTitle(date);
      const cityCoords = await geocodeCity(city);
      const resorts = await findResortsInRange(cityCoords, criteria.maxDistanceKm);

      if (resorts.length === 0) {
        showResult(
          'Nein.',
          'Kein Skigebiet in der gewählten maximalen Entfernung.'
        );
        resortRows = [];
        if (resortListSection) resortListSection.hidden = true;
        return;
      }

      const weatherList = await getResortWeatherBatch(resorts, date);
      const rows = [];
      for (let i = 0; i < resorts.length; i++) {
        const resort = resorts[i];
        const weather = weatherList[i] || {};
        const ctx = {
          tempMin: weather.tempMin,
          tempMax: weather.tempMax,
          windMax: weather.windMax,
          snowTopCm: weather.snowTopCm,
          snowBottomCm: weather.snowBottomCm,
          freshSnowCm: weather.freshSnowCm,
          liftsOpen: weather.liftsOpen != null ? weather.liftsOpen : isInSeason(date),
          resortInRange: true,
          resortName: resort.name,
          distanceKm: resort.distanceKm,
        };
        const { outcome, reason } = decide(criteria, ctx);
        rows.push({
          name: resort.name,
          lat: resort.lat,
          lon: resort.lon,
          bergfexSlug: resort.bergfexSlug,
          distanceKm: resort.distanceKm,
          outcome,
          reason,
          tempMin: weather.tempMin,
          tempMax: weather.tempMax,
          windMax: weather.windMax,
          snowTopCm: weather.snowTopCm,
          snowBottomCm: weather.snowBottomCm,
          freshSnowCm: weather.freshSnowCm,
        });
      }

      lastCriteria = criteria;
      lastCity = city;
      resortRows = rows;
      const overallOutcome = bestOutcome(rows.map(function (r) { return r.outcome; }));
      const positiveCount = rows.filter(function (r) { return r.outcome !== 'Nein.'; }).length;
      let reason = '';
      if (positiveCount === 0) {
        reason = 'Keines der Skigebiete in Reichweite erfüllt die Kriterien.';
      } else if (positiveCount === 1) {
        reason = 'Ein Skigebiet in Reichweite erfüllt die Kriterien.';
      } else {
        reason = positiveCount + ' Skigebiete in Reichweite erfüllen die Kriterien.';
      }
      showResult(overallOutcome, reason);

      if (resortListSection) {
        resortListSection.hidden = false;
        sortState = { key: 'outcome', dir: -1 };
        sortAndRenderResortTable();
      }
    } catch (err) {
      var msg = err.message || 'Ein Fehler ist aufgetreten.';
      if (String(msg).indexOf('429') !== -1 || String(msg).indexOf('Zu viele Anfragen') !== -1) {
        msg = 'Zu viele Anfragen. Bitte etwa eine Minute warten und erneut auf „Prüfen“ klicken.';
      }
      showError(msg);
    }
  }

  function init() {
    setDefaults();
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); runCheck(); });
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.addEventListener('change', function () { updateTitle(getSelectedDate()); });
    const freshCheck = document.getElementById('require-fresh-snow');
    const minFresh = document.getElementById('min-fresh-snow');
    if (freshCheck && minFresh) {
      freshCheck.addEventListener('change', function () { minFresh.disabled = !freshCheck.checked; });
    }
    if (resortTable) {
      resortTable.addEventListener('click', function (e) {
        const th = e.target.closest('.resort-table__th--sortable');
        if (!th) return;
        const key = th.getAttribute('data-sort');
        if (!key) return;
        if (sortState.key === key) {
          sortState.dir = -sortState.dir;
        } else {
          sortState.key = key;
          sortState.dir = (key === 'outcome' || key === 'distanceKm') ? -1 : 1;
        }
        sortAndRenderResortTable();
      });
    }
    runCheck();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
