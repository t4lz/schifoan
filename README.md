https://schifoan24.de/

# Ist morgen ein guter Tag zum Skifahren?

A **static** website that answers whether a given day is good for skiing, based on:

- **Date** (default: tomorrow)
- **City** (default: Munich) and **max distance** to a resort (km)
- **Temperature** range at mid-mountain (min/max °C during ski hours 08:00–16:00)
- **Max wind** (km/h)
- **Min snow** at top and bottom (cm)
- **Optional** minimum fresh snow (only when “Min. Neuschnee” is enabled)

It also requires that **lifts/slopes are open**: the app uses a typical Alpine season (1 Dec – 15 Apr). Outside that window, the answer is always **Nein.**

All logic runs in the browser. Links go to [Bergfex](https://www.bergfex.com) for ski weather; forecast data from Open-Meteo (or optionally Snow-Forecast API):

- **Links** – Resort names and weather values link to **www.bergfex.com** (ski weather forecast). Each resort has a `bergfexSlug` in `js/data/resorts.js` for direct URLs (e.g. `https://www.bergfex.com/[slug]/wetter/prognose/`).
- **Forecast data** – Optional: set `SNOW_FORECAST_CLIENT_ID` in `js/config.js` and add `snowForecastRecordId` per resort (see [docs.snow-forecast.com](https://docs.snow-forecast.com)) to fetch temperatures, wind, and snow from the Snow-Forecast API. Without these, the app uses **Open-Meteo** for forecast data.
- **OpenStreetMap Nominatim** – geocoding city → coordinates (User-Agent required)

No backend. No API keys required for the default setup (Open-Meteo + Nominatim).

---

## Possible answers

Displayed prominently after “Prüfen”:

| Answer               | Meaning        |
|----------------------|----------------|
| **Ja!**              | Great conditions |
| **Joa**              | Good conditions  |
| **geht**             | Acceptable       |
| **nicht so wirklich**| Marginal         |
| **Nein.**            | No (criteria not met or lifts closed) |

---

## How to run locally

The site is static HTML/CSS/JS. You need a local server so that:

1. `index.html` is served (and paths like `js/config.js`, `css/main.css` resolve).
2. The browser can call Open-Meteo and Nominatim (CORS is allowed).

**Option A – Node (npx)**

```bash
npx serve .
```

Then open the URL shown (e.g. `http://localhost:3000`).

**Option B – Python 3**

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

**Option C – Open `index.html` in the browser**

Opening the file directly (`file:///...`) can work for Open-Meteo, but some browsers restrict mixed content or CORS for `file://`. Using a local server (A or B) is recommended.

---

## How to test

1. **Manual**
   - Run with a local server (see above).
   - Leave defaults (tomorrow, Munich) and click **Prüfen**. You should see a result (Ja / Joa / geht / nicht so wirklich / Nein) and short details.
   - Change date, city, max distance, or min snow and run again.
   - Enable “Min. Neuschnee” and set a value; run again.

2. **Automated**
   - There are no unit tests in the repo. You can add a test runner (e.g. Jest or Node scripts) that load `js/decision.js` and `js/api.js` and assert on `decide()` for fixed inputs, and/or mock `fetch` for API tests.

---

## How to host

Because everything is static and APIs are called from the client:

- Upload the project (e.g. `index.html`, `css/`, `js/`) to any static host:
  - **GitHub Pages**: push to a repo, enable Pages, point to branch/folder.
  - **Netlify / Vercel**: connect repo or drag-and-drop the folder; no build step.
  - **Any web server**: copy files and serve the directory as static files.

No build step or environment variables are required. The only requirement is that the site is served over **HTTPS** (or `http://localhost`) so that browsers allow the API requests.

---

## Default values

| Variable           | Default | Description                          |
|-------------------|--------|--------------------------------------|
| Date              | Tomorrow | Day to check                       |
| City              | Munich   | Starting point for distance filter |
| Max distance      | 150 km  | Resorts farther are ignored        |
| Min temp (mid-mountain)| −15 °C | Colder is still OK (min during 08:00–16:00) |
| Max temp (mid-mountain)| 5 °C   | Warmer = slushy (max during 08:00–16:00)    |
| Max wind          | 50 km/h | Stronger can close lifts           |
| Min snow (top)    | 30 cm   | Minimum at summit                  |
| Min snow (bottom) | 10 cm   | Minimum at base                    |
| Min fresh snow    | 5 cm    | Only if “Min. Neuschnee” is enabled |

---

## Lifts / season

The app does **not** call a lift-status API. It assumes:

- Resorts are **open** if the selected date falls in the **typical season** (1 Dec – 15 Apr).
- Outside that range, the answer is **Nein.** (lifts assumed closed).

Resort list and season are in `js/data/resorts.js` and can be adjusted there.

**Resort list (Alps):** `js/data/resorts.js` includes a broad set of Alpine ski resorts in Germany (Bavaria/Allgäu), Austria (Tirol, Salzburg, Vorarlberg, Kärnten, Steiermark), Switzerland, France, Italy, and Slovenia. Each resort has a `bergfexSlug` so links open the Bergfex weather forecast for that resort. If a Bergfex URL changes or a resort is missing, edit the slug or add a new entry; resorts without `bergfexSlug` fall back to a Google search for `site:bergfex.com [resort name]`.

---

## Project structure

```
.
├── index.html          # Single page, form + result area
├── css/
│   └── main.css        # Layout and outcome styles
├── js/
│   ├── config.js       # Defaults and API URLs
│   ├── data/
│   │   └── resorts.js  # Resorts: coords, elevations, bergfexSlug (links), optional snowForecastRecordId (API)
│   ├── api.js          # Geocoding (Nominatim), weather (Snow-Forecast API or Open-Meteo), findResortsInRange
│   ├── decision.js     # Criteria + weather → one of five outcomes
│   └── main.js         # Form, defaults, title update, result display
└── README.md
```

---

## License and APIs

- **Bergfex**: Resort and weather links go to [www.bergfex.com](https://www.bergfex.com) (ski weather forecast). Each resort has a `bergfexSlug` in `js/data/resorts.js`.
- **Snow-Forecast.com**: Optional: to use their API for forecast data (temperatures, wind, snow), see [docs.snow-forecast.com](https://docs.snow-forecast.com); set `SNOW_FORECAST_CLIENT_ID` in `js/config.js` and add `snowForecastRecordId` per resort in `js/data/resorts.js`. Without these, the app uses Open-Meteo for data.
- **Open-Meteo**: used for forecast data when Snow-Forecast API is not configured; non-commercial use, no API key; see [open-meteo.com](https://open-meteo.com).
- **Nominatim (OSM)**: usage policy requires a valid **User-Agent**; the app sets one in `js/config.js` (`NOMINATIM_USER_AGENT`). Do not abuse the service.

Change defaults and resort list in `js/config.js` and `js/data/resorts.js` as needed for your use case.
