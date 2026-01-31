/**
 * Main entry: form handling, API calls, result display, resort list, and title update.
 * Depends: CONFIG, RESORTS, SEASON (config + data), api.js, decision.js.
 */

/* global CONFIG, RESORTS, SEASON, geocodeCity, findResortsInRange, fetchResortWeather, isInSeason, decide, outcomeRank, OUTCOMES */

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
    rows.forEach(function (row) {
      const tr = document.createElement('tr');
      tr.className = 'resort-table__row resort-table__row--' + (row.outcome || 'nein').replace(/[^a-z0-9]/gi, '').toLowerCase();
      tr.innerHTML =
        '<td class="resort-table__cell resort-table__cell--outcome">' + escapeHtml(row.outcome || '') + '</td>' +
        '<td class="resort-table__cell">' + escapeHtml(row.name || '') + '</td>' +
        '<td class="resort-table__cell resort-table__cell--num">' + formatNum(row.distanceKm, 0) + '</td>' +
        '<td class="resort-table__cell resort-table__cell--num">' + formatNum(row.tempMin, 0) + '</td>' +
        '<td class="resort-table__cell resort-table__cell--num">' + formatNum(row.tempMax, 0) + '</td>' +
        '<td class="resort-table__cell resort-table__cell--num">' + formatNum(row.windMax, 0) + '</td>' +
        '<td class="resort-table__cell resort-table__cell--num">' + formatNum(row.snowTopCm, 0) + '</td>' +
        '<td class="resort-table__cell resort-table__cell--num">' + formatNum(row.snowBottomCm, 0) + '</td>' +
        '<td class="resort-table__cell resort-table__cell--num">' + formatNum(row.freshSnowCm, 1) + '</td>';
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
      const resorts = findResortsInRange(cityCoords, criteria.maxDistanceKm);
      const liftsOpen = isInSeason(date);

      if (resorts.length === 0) {
        showResult(
          'Nein.',
          'Kein Skigebiet in der gewählten maximalen Entfernung.'
        );
        resortRows = [];
        if (resortListSection) resortListSection.hidden = true;
        return;
      }

      const rows = [];
      for (let i = 0; i < resorts.length; i++) {
        const resort = resorts[i];
        const weather = await fetchResortWeather(resort, date);
        const ctx = {
          tempMin: weather.tempMin,
          tempMax: weather.tempMax,
          windMax: weather.windMax,
          snowTopCm: weather.snowTopCm,
          snowBottomCm: weather.snowBottomCm,
          freshSnowCm: weather.freshSnowCm,
          liftsOpen,
          resortInRange: true,
          resortName: resort.name,
          distanceKm: resort.distanceKm,
        };
        const { outcome, reason } = decide(criteria, ctx);
        rows.push({
          name: resort.name,
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
      showError(err.message || 'Ein Fehler ist aufgetreten.');
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
