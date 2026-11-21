# CarBudget India – instructions for AI agents

Read this whole file before changing anything.

## What this project is
A mobile-first website where a customer sets a budget (in ₹ lakh) and sees every car they can buy, with filters and a details sheet for each car. It is one static page: no build step, no framework.
Goal: list EVERY car on sale in India with a starting ex-showroom price up to ₹25 lakh, with accurate prices and features from official sources.

## Files
- `index.html`  the whole site. The car list is the `CARS` array near the top of the `<script>`.
- `AGENTS.md`  this file.

## Car data format (one row per MODEL, not per variant)
Each car is an array in `CARS`:
`['Name', priceInLakh, 'Body', ['Fuel', ...], automaticAvailable(1 or 0), seats, 'Mileage or range', ['Feature', ...]]`
Example: `['Tata Nexon',7.3,'SUV',['Petrol','Diesel','CNG'],1,5,'17 km/l',['Sunroof','360° camera','Ventilated seats']]`
- Price: starting ex-showroom price in ₹ lakh, Delhi, as a number.
- Body: exactly Hatchback, Sedan, SUV or MPV.
- Fuel: Petrol, Diesel, CNG, Electric or Hybrid.
- Mileage: text like "18 km/l", or "400 km range" for electric cars.
- Features: for the filters use exactly `Sunroof`, `ADAS`, `360° camera`, `Ventilated seats`. Other features may be added freely. Only list a feature that is really offered.
- Brands and official links come from the `SITE` list in the script. Add a brand there when you add its cars. Extra facts for the details sheet go in the `EXTRA` list, keyed by car name.

## Data rules (most important)
1. NEVER guess or invent. If you cannot find a value, leave the car or field out and say so in your report.
2. Use the official brand website first, then trusted sites (Autocar India, CarDekho, ZigWheels).
3. Include a model only if it is on sale now and its cheapest variant costs ₹25 lakh or less. No upcoming, discontinued or concept cars.
4. If sources disagree, use the official value and mention the conflict in your report.

## Working with other AIs
- Only add or change the cars of the brands you were assigned. Do not rewrite other brands' cars or the design.
- Work on your own branch (`ai-<tool>-<brands>`) and tell the owner when you are done.

## Do not break the site
- Keep the JavaScript valid. Test locally: `python3 -m http.server 8000`, open http://localhost:8000, check the cars appear, the filters work and the details sheet opens.
- Keep the premium look. No external image links or tracking scripts. No passwords or keys in any file.

## When you finish
Report in plain words: brands covered, models added or changed, models you could not find, and anything you are unsure about.
