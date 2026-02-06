/**
 * Simple i18n: German (default), English, French, Italian.
 * Use t(key) or t(key, { param: value }) for {{param}} replacement.
 */

var I18N = (function () {
  'use strict';

  var DEFAULT_LANG = 'de';
  var STORAGE_KEY = 'ski-day-lang';

  var TRANSLATIONS = {
    de: {
      tagline: 'Datum, Ort und Kriterien wählen – die Antwort kommt von Wetter und Entfernung.',
      loading: 'Wetter und Skigebiete werden geladen …',
      legendDatePlace: 'Datum & Ort',
      legendWeatherSnow: 'Wetter & Schnee',
      labelDate: 'Datum',
      labelCity: 'Stadt (Ausgangspunkt)',
      labelMaxDistance: 'Max. Entfernung zum Berg (km)',
      labelMinTemp: 'Min. Temp. am Berg (°C)',
      labelMaxTemp: 'Max. Temp. am Berg (°C)',
      labelMaxWind: 'Max. Wind (km/h)',
      labelMinSnowTop: 'Min. Schnee oben (cm)',
      labelMinSnowBottom: 'Min. Schnee unten (cm)',
      labelRequireFreshSnow: 'Min. Neuschnee (nur wenn aktiviert)',
      labelMinFreshSnow: 'Min. Neuschnee (cm)',
      buttonCheck: 'Prüfen',
      placeholderCity: 'z. B. Munich',
      formAriaLabel: 'Kriterien für den Skitag',
      thOutcome: 'Ergebnis',
      thResort: 'Skigebiet',
      thDistance: 'Distanz (km)',
      thTempMin: 'Temp min (°C)',
      thTempMax: 'Temp max (°C)',
      thWind: 'Wind (km/h)',
      thSnowTop: 'Schnee oben (cm)',
      thSnowBottom: 'Schnee unten (cm)',
      thFreshSnow: 'Neuschnee (cm)',
      sortTitle: 'Klicken zum Sortieren',
      resortListTitle: 'Skigebiete in Reichweite',
      footer: 'Statische Seite, Daten von Open-Meteo und OpenStreetMap (Nominatim). Lifte/Saison: typische Saison (ca. 1.12.–15.4.). Keine Gewähr.',
      titleQuestion: 'Ist {{date}} ein guter Tag zum Skifahren?',
      daySun: 'Sonntag', dayMon: 'Montag', dayTue: 'Dienstag', dayWed: 'Mittwoch',
      dayThu: 'Donnerstag', dayFri: 'Freitag', daySat: 'Samstag',
      outcome_ja: 'Ja!', outcome_joa: 'Joa', outcome_geht: 'geht',
      outcome_nicht: 'nicht so wirklich', outcome_nein: 'Nein.',
      reason_lifts_closed: 'Lifte/Pisten sind außerhalb der Saison oder geschlossen.',
      reason_no_resort_in_range: 'Kein Skigebiet in der gewählten maximalen Entfernung.',
      reason_temp_range: 'Temperatur außerhalb des Bereichs (min {{min}}°C – max {{max}}°C).',
      reason_wind: 'Wind zu stark (max {{max}} km/h).',
      reason_snow_top: 'Zu wenig Schnee oben (min {{min}} cm).',
      reason_snow_bottom: 'Zu wenig Schnee unten (min {{min}} cm).',
      reason_fresh_snow: 'Zu wenig Neuschnee (min {{min}} cm).',
      reason_super: 'Super Bedingungen.',
      reason_good: 'Gute Bedingungen.',
      reason_ok: 'Akzeptable Bedingungen.',
      reason_marginal: 'Knapp erfüllt, aber nicht ideal.',
      reason_no_resorts_match: 'Keines der Skigebiete in Reichweite erfüllt die Kriterien.',
      reason_one_resort_matches: 'Ein Skigebiet in Reichweite erfüllt die Kriterien.',
      reason_many_resorts_matches: '{{count}} Skigebiete in Reichweite erfüllen die Kriterien.',
      error_generic: 'Ein Fehler ist aufgetreten.',
      error_rate_limit: 'Zu viele Anfragen. Bitte etwa eine Minute warten und erneut auf „Prüfen“ klicken.',
      languageLabel: 'Sprache',
    },
    en: {
      tagline: 'Pick date, location and criteria – the answer comes from weather and distance.',
      loading: 'Loading weather and ski resorts …',
      legendDatePlace: 'Date & place',
      legendWeatherSnow: 'Weather & snow',
      labelDate: 'Date',
      labelCity: 'City (starting point)',
      labelMaxDistance: 'Max. distance to mountain (km)',
      labelMinTemp: 'Min. temp at mountain (°C)',
      labelMaxTemp: 'Max. temp at mountain (°C)',
      labelMaxWind: 'Max. wind (km/h)',
      labelMinSnowTop: 'Min. snow at top (cm)',
      labelMinSnowBottom: 'Min. snow at bottom (cm)',
      labelRequireFreshSnow: 'Min. fresh snow (only when enabled)',
      labelMinFreshSnow: 'Min. fresh snow (cm)',
      buttonCheck: 'Check',
      placeholderCity: 'e.g. Munich',
      formAriaLabel: 'Criteria for the ski day',
      thOutcome: 'Result',
      thResort: 'Resort',
      thDistance: 'Distance (km)',
      thTempMin: 'Temp min (°C)',
      thTempMax: 'Temp max (°C)',
      thWind: 'Wind (km/h)',
      thSnowTop: 'Snow top (cm)',
      thSnowBottom: 'Snow bottom (cm)',
      thFreshSnow: 'Fresh snow (cm)',
      sortTitle: 'Click to sort',
      resortListTitle: 'Resorts in range',
      footer: 'Static site, data from Open-Meteo and OpenStreetMap (Nominatim). Lifts/season: typical season (approx. 1 Dec – 15 Apr). No guarantee.',
      titleQuestion: 'Is {{date}} a good day for skiing?',
      daySun: 'Sunday', dayMon: 'Monday', dayTue: 'Tuesday', dayWed: 'Wednesday',
      dayThu: 'Thursday', dayFri: 'Friday', daySat: 'Saturday',
      outcome_ja: 'Yes!', outcome_joa: 'Yeah', outcome_geht: 'OK',
      outcome_nicht: 'not really', outcome_nein: 'No.',
      reason_lifts_closed: 'Lifts/slopes are outside the season or closed.',
      reason_no_resort_in_range: 'No ski resort within the chosen maximum distance.',
      reason_temp_range: 'Temperature outside range (min {{min}}°C – max {{max}}°C).',
      reason_wind: 'Wind too strong (max {{max}} km/h).',
      reason_snow_top: 'Too little snow at top (min {{min}} cm).',
      reason_snow_bottom: 'Too little snow at bottom (min {{min}} cm).',
      reason_fresh_snow: 'Too little fresh snow (min {{min}} cm).',
      reason_super: 'Great conditions.',
      reason_good: 'Good conditions.',
      reason_ok: 'Acceptable conditions.',
      reason_marginal: 'Barely met, but not ideal.',
      reason_no_resorts_match: 'None of the resorts in range meet the criteria.',
      reason_one_resort_matches: 'One resort in range meets the criteria.',
      reason_many_resorts_matches: '{{count}} resorts in range meet the criteria.',
      error_generic: 'An error occurred.',
      error_rate_limit: 'Too many requests. Please wait about a minute and click "Check" again.',
      languageLabel: 'Language',
    },
    fr: {
      tagline: 'Choisissez date, lieu et critères – la réponse vient de la météo et de la distance.',
      loading: 'Chargement de la météo et des stations …',
      legendDatePlace: 'Date et lieu',
      legendWeatherSnow: 'Météo et neige',
      labelDate: 'Date',
      labelCity: 'Ville (point de départ)',
      labelMaxDistance: 'Distance max. à la montagne (km)',
      labelMinTemp: 'Temp. min. à la montagne (°C)',
      labelMaxTemp: 'Temp. max. à la montagne (°C)',
      labelMaxWind: 'Vent max. (km/h)',
      labelMinSnowTop: 'Neige min. en haut (cm)',
      labelMinSnowBottom: 'Neige min. en bas (cm)',
      labelRequireFreshSnow: 'Neige fraîche min. (si activé)',
      labelMinFreshSnow: 'Neige fraîche min. (cm)',
      buttonCheck: 'Vérifier',
      placeholderCity: 'ex. Munich',
      formAriaLabel: 'Critères pour la journée de ski',
      thOutcome: 'Résultat',
      thResort: 'Station',
      thDistance: 'Distance (km)',
      thTempMin: 'Temp. min (°C)',
      thTempMax: 'Temp. max (°C)',
      thWind: 'Vent (km/h)',
      thSnowTop: 'Neige en haut (cm)',
      thSnowBottom: 'Neige en bas (cm)',
      thFreshSnow: 'Neige fraîche (cm)',
      sortTitle: 'Cliquer pour trier',
      resortListTitle: 'Stations à portée',
      footer: 'Site statique, données Open-Meteo et OpenStreetMap (Nominatim). Remontées/saison : saison typique (env. 1er déc. – 15 avr.). Sans garantie.',
      titleQuestion: 'Le {{date}} est-il un bon jour pour skier ?',
      daySun: 'Dimanche', dayMon: 'Lundi', dayTue: 'Mardi', dayWed: 'Mercredi',
      dayThu: 'Jeudi', dayFri: 'Vendredi', daySat: 'Samedi',
      outcome_ja: 'Oui !', outcome_joa: 'Ouais', outcome_geht: 'Ça va',
      outcome_nicht: 'pas vraiment', outcome_nein: 'Non.',
      reason_lifts_closed: 'Remontées/pistes hors saison ou fermées.',
      reason_no_resort_in_range: 'Aucune station dans la distance max. choisie.',
      reason_temp_range: 'Température hors plage (min {{min}}°C – max {{max}}°C).',
      reason_wind: 'Vent trop fort (max {{max}} km/h).',
      reason_snow_top: 'Pas assez de neige en haut (min {{min}} cm).',
      reason_snow_bottom: 'Pas assez de neige en bas (min {{min}} cm).',
      reason_fresh_snow: 'Pas assez de neige fraîche (min {{min}} cm).',
      reason_super: 'Super conditions.',
      reason_good: 'Bonnes conditions.',
      reason_ok: 'Conditions acceptables.',
      reason_marginal: 'Tout juste, mais pas idéal.',
      reason_no_resorts_match: 'Aucune station à portée ne remplit les critères.',
      reason_one_resort_matches: 'Une station à portée remplit les critères.',
      reason_many_resorts_matches: '{{count}} stations à portée remplissent les critères.',
      error_generic: 'Une erreur est survenue.',
      error_rate_limit: 'Trop de requêtes. Attendez environ une minute et recliquez sur « Vérifier ».',
      languageLabel: 'Langue',
    },
    it: {
      tagline: 'Scegli data, luogo e criteri – la risposta viene da meteo e distanza.',
      loading: 'Caricamento meteo e stazioni …',
      legendDatePlace: 'Data e luogo',
      legendWeatherSnow: 'Meteo e neve',
      labelDate: 'Data',
      labelCity: 'Città (punto di partenza)',
      labelMaxDistance: 'Distanza max. dalla montagna (km)',
      labelMinTemp: 'Temp. min. in montagna (°C)',
      labelMaxTemp: 'Temp. max. in montagna (°C)',
      labelMaxWind: 'Vento max. (km/h)',
      labelMinSnowTop: 'Neve min. in alto (cm)',
      labelMinSnowBottom: 'Neve min. in basso (cm)',
      labelRequireFreshSnow: 'Neve fresca min. (solo se attivato)',
      labelMinFreshSnow: 'Neve fresca min. (cm)',
      buttonCheck: 'Controlla',
      placeholderCity: 'es. Monaco',
      formAriaLabel: 'Criteri per la giornata sci',
      thOutcome: 'Risultato',
      thResort: 'Stazione',
      thDistance: 'Distanza (km)',
      thTempMin: 'Temp. min (°C)',
      thTempMax: 'Temp. max (°C)',
      thWind: 'Vento (km/h)',
      thSnowTop: 'Neve in alto (cm)',
      thSnowBottom: 'Neve in basso (cm)',
      thFreshSnow: 'Neve fresca (cm)',
      sortTitle: 'Clicca per ordinare',
      resortListTitle: 'Stazioni a portata',
      footer: 'Sito statico, dati da Open-Meteo e OpenStreetMap (Nominatim). Impianti/stagione: stagione tipica (ca. 1 dic.–15 apr.). Nessuna garanzia.',
      titleQuestion: 'Il {{date}} è un buon giorno per sciare?',
      daySun: 'Domenica', dayMon: 'Lunedì', dayTue: 'Martedì', dayWed: 'Mercoledì',
      dayThu: 'Giovedì', dayFri: 'Venerdì', daySat: 'Sabato',
      outcome_ja: 'Sì!', outcome_joa: 'Sì', outcome_geht: 'Va bene',
      outcome_nicht: 'non proprio', outcome_nein: 'No.',
      reason_lifts_closed: 'Impianti/piste fuori stagione o chiusi.',
      reason_no_resort_in_range: 'Nessuna stazione nella distanza massima scelta.',
      reason_temp_range: 'Temperatura fuori intervallo (min {{min}}°C – max {{max}}°C).',
      reason_wind: 'Vento troppo forte (max {{max}} km/h).',
      reason_snow_top: 'Poca neve in alto (min {{min}} cm).',
      reason_snow_bottom: 'Poca neve in basso (min {{min}} cm).',
      reason_fresh_snow: 'Poca neve fresca (min {{min}} cm).',
      reason_super: 'Condizioni ottime.',
      reason_good: 'Buone condizioni.',
      reason_ok: 'Condizioni accettabili.',
      reason_marginal: 'Appena soddisfatto, non ideale.',
      reason_no_resorts_match: 'Nessuna stazione a portata soddisfa i criteri.',
      reason_one_resort_matches: 'Una stazione a portata soddisfa i criteri.',
      reason_many_resorts_matches: '{{count}} stazioni a portata soddisfano i criteri.',
      error_generic: 'Si è verificato un errore.',
      error_rate_limit: 'Troppe richieste. Attendi circa un minuto e clicca di nuovo su « Controlla ».',
      languageLabel: 'Lingua',
    },
  };

  var OUTCOME_TO_KEY = {
    'Ja!': 'outcome_ja',
    'Joa': 'outcome_joa',
    'geht': 'outcome_geht',
    'nicht so wirklich': 'outcome_nicht',
    'Nein.': 'outcome_nein',
  };

  var currentLang = DEFAULT_LANG;

  function getLang() {
    return currentLang;
  }

  function getStoredLang() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s && TRANSLATIONS[s]) return s;
    } catch (e) {}
    return null;
  }

  function setStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  function t(key, params) {
    var str = (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) ||
              TRANSLATIONS[DEFAULT_LANG][key] ||
              key;
    if (params && typeof str === 'string') {
      Object.keys(params).forEach(function (k) {
        str = str.replace(new RegExp('{{' + k + '}}', 'g'), String(params[k]));
      });
    }
    return str;
  }

  function outcomeDisplayKey(outcome) {
    return OUTCOME_TO_KEY[outcome] || outcome;
  }

  function applyTranslations() {
    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var text = t(key);
      if (attr) {
        el.setAttribute(attr, text);
      } else {
        el.textContent = text;
      }
      var titleKey = el.getAttribute('data-i18n-title');
      if (titleKey) el.title = t(titleKey);
    });
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  }

  function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) lang = DEFAULT_LANG;
    currentLang = lang;
    if (document.documentElement) document.documentElement.lang = lang;
    setStoredLang(lang);
    applyTranslations();
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: lang } }));
    }
  }

  function initFromStorageOrUrl() {
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get('lang');
    if (urlLang && TRANSLATIONS[urlLang]) {
      setLanguage(urlLang);
      return urlLang;
    }
    var stored = getStoredLang();
    if (stored) setLanguage(stored);
    else setLanguage(DEFAULT_LANG);
    return getLang();
  }

  return {
    getLang: getLang,
    setLanguage: setLanguage,
    t: t,
    outcomeDisplayKey: outcomeDisplayKey,
    applyTranslations: applyTranslations,
    initFromStorageOrUrl: initFromStorageOrUrl,
    SUPPORTED_LANGS: ['de', 'en', 'fr', 'it'],
    DEFAULT_LANG: DEFAULT_LANG,
  };
})();
