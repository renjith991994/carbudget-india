# CarBudget India – instructions for AI agents

Read this whole file before changing anything.

## What this project is
A mobile-first website where a customer sets a budget (in ₹ lakh) and sees every car they can buy, with filters and a details sheet for each car. It is a static HTML page with local JSON data: no build step, no framework.
Goal: list EVERY car on sale in India with a starting ex-showroom price up to ₹25 lakh, with accurate prices and features from official sources.

## Files
- `index.html`  the page, styles, filters and details sheet. It fetches `brands.json`, loads all listed brand files, then fills the in-memory `CARS` array and renders the results. Loading failures show a retry button instead of a partial catalogue.
- `brands.json`  an array of brand data filenames, relative to `index.html`. Add a filename here when adding a brand. The loader restores ascending price order; manifest order and row order determine equal-price ties, so keep their order stable.
- `cars-maruti.json`, `cars-tata.json`, `cars-hyundai.json`, `cars-honda.json`, `cars-kia.json`, `cars-mahindra.json`, `cars-toyota.json`  one JSON array of model rows per brand. Edit the assigned brand's file instead of `index.html`. New brand files follow `cars-<brand>.json` with lowercase brand names.
- `tests/catalogue.test.cjs`  dependency-free checks for the data files, asynchronous loading, failure/retry, filtering, sorting and details sheets. Run with `node --test tests/catalogue.test.cjs` (Node.js 18 or newer).
- `AGENTS.md`  this file.

## Car data format (one row per MODEL, not per variant)
Each car is an array in its brand's JSON file, loaded unchanged into `CARS`:
`['Name', priceInLakh, 'Body', ['Fuel', ...], automaticAvailable(1 or 0), seats, 'Mileage or range', ['Feature', ...]]`
Example: `['Tata Nexon',7.3,'SUV',['Petrol','Diesel','CNG'],1,5,'17 km/l',['Sunroof','360° camera','Ventilated seats']]`
- Price: starting ex-showroom price in ₹ lakh, Delhi, as a number.
- Body: exactly Hatchback, Sedan, SUV or MPV.
- Fuel: Petrol, Diesel, CNG, Electric or Hybrid.
- Mileage: text like "18 km/l", or "400 km range" for electric cars.
- Features: for the filters use exactly `Sunroof`, `ADAS`, `360° camera`, `Ventilated seats`. Other features may be added freely. Only list a feature that is really offered.
- Data files must be valid JSON: use double quotes, with no comments or trailing commas. Keep each row's field order unchanged.
- Brands and official links come from the `SITE` list in the script. Add a brand there when you add its cars. Extra facts for the details sheet go in the `EXTRA` list, keyed by car name.

## Data rules (most important)
1. NEVER guess or invent. If you cannot find a value, leave the car or field out and say so in your report.
2. Use the official brand website first, then trusted sites (Autocar India, CarDekho, ZigWheels).
3. Include a model only if it is on sale now and its cheapest variant costs ₹25 lakh or less. No upcoming, discontinued or concept cars.
4. If sources disagree, use the official value and mention the conflict in your report.

## Working with other AIs
- Only add or change the cars of the brands you were assigned. Do not rewrite other brands' cars or the design.
- Brand-only data edits normally need only the relevant `cars-<brand>.json`. A new brand also needs an entry in `brands.json` and its official link in `SITE`.
- Work on your own branch (`ai-<tool>-<brands>`) and tell the owner when you are done.

## Do not break the site
- Keep the JavaScript and JSON valid. Run `node --test tests/catalogue.test.cjs`. Test locally: `python3 -m http.server 8000`, open http://localhost:8000, check the cars appear, the filters work and the details sheet opens. Serve the entire directory over HTTP; opening `index.html` directly as a `file://` URL will not reliably allow JSON fetches.
- Keep the premium look. No external image links or tracking scripts. No passwords or keys in any file.

## When you finish
Report in plain words: brands covered, models added or changed, models you could not find, and anything you are unsure about.
