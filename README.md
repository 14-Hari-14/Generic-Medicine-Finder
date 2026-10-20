# Generic Medicine Finder (India)

A zero-nonsense search engine that helps Indian patients find **cheaper generic alternatives** to their branded medicines. Powered by the Government of India's **PMBJP (Janaushadhi)** price list.

> **Note**: This is an independent, non-government project. Always consult your doctor before switching medicines.

---

## Features

- **Type a brand** (e.g., *Glycomet 500*, *Augmentin 625*, *Telma 40*) → instantly see:
  - Active salt / composition (e.g., Metformin 500mg)
  - Branded MRP vs. **Janaushadhi price**
  - Exact **₹ and % savings** (per pack, monthly, yearly)
- **Download a comparison PDF** to show your doctor/pharmacist
- **Link to nearest Janaushadhi Kendra** locator
- **Hindi language toggle** (UI in हिंदी/English — brand names stay in English, as on prescriptions)
- Works on any device, even slow 2G connections

---

## Architecture

```
Python scripts (data pipeline)          Website (static, zero servers)
┌─────────────────────────┐            ┌──────────────────────────────┐
│ build-database.py      │            │  index.html + Tailwind      │
│   ↓                    │            │  js/app.js (Fuse.js search) │
│ SQLite (for future)    │  ──export──▶  js/i18n.js (Hindi/English) │
│   ↓                    │  JSON      │  data/*.json (medicine DB)  │
│ brands.json            │            │  GitHub Pages hosting       │
│ janaushadhi.json       │            └──────────────────────────────┘
└─────────────────────────┘
```

- **Data pipeline**: Python parses PMBJP PDF/CSV → builds 3 things: a SQLite DB (for future migration), and JSON files (what the website actually uses).
- **Website**: Pure HTML + Tailwind CSS + vanilla JS. No build step, no npm, no servers. Deploy by pushing to GitHub.
- **Search**: Fuse.js fuzzy matching in the browser — handles typos ("glycmet" finds "Glycomet").

---

## Quick Start (Local Dev)

```bash
# 1. Serve the site locally
python3 -m http.server 8080
# → open http://localhost:8080

# 2. (Optional) Rebuild the medicine database
python3 scripts/build-database.py
```

No dependencies, no install, no build step. Just serve the folder.

---

## Project Structure

```
├── index.html               # Single-page app (search + results + PDF button)
├── css/
│   └── style.css            # Custom styles on top of Tailwind
├── js/
│   ├── app.js               # Core logic: search, render, PDF
│   └── i18n.js              # English/Hindi translation system
├── data/                    # GENERATED — don't edit by hand
│   ├── brands.json          # Brand → salt, MRP, savings (the search index)
│   ├── janaushadhi.json     # Official PMBJP generics & prices
│   └── brand-generic-map.json
├── db/
│   └── medicines.db         # GENERATED — SQLite backup for future use
├── scripts/                 # Data pipeline (the source of truth)
│   ├── build-database.py    # CSV → SQLite → JSON exporter
│   ├── medicines.csv        # EDIT THIS to add/update medicines
│   ├── manual-mappings.json # Manual brand→generic overrides
│   └── parse-pmbjp-pdf.py   # (WIP) Official PDF parser
├── .github/workflows/
│   └── deploy.yml           # Auto-deploy to GitHub Pages
└── PLAN.md                  # Full project plan
```

---

## How to Add / Update Medicines

**The simple way (no code):** edit `scripts/medicines.csv`:

```csv
brand_name,salt,strength,pack_size,market_mrp,manufacturer,category
Glycomet 500,Metformin Hydrochloride,500 mg,10's,24.00,USV Pvt Ltd,Antidiabetic
```

Then run:
```bash
python3 scripts/build-database.py
```

The script will:
1. Import the brand into SQLite
2. Auto-map it to the matching Janaushadhi generic (by salt name)
3. Apply any manual overrides from `manual-mappings.json`
4. Regenerate all JSON files for the website

**Common situations:**

| Situation | What to do |
|-----------|-----------|
| Brand's salt matches a Janaushadhi generic | Just add to CSV — auto-mapper handles it |
| Auto-match is wrong | Add an override in `manual-mappings.json` with the correct `generic_code` |
| No Janaushadhi generic exists for the salt | Add `"generic_code": null` in overrides — site shows "No generic available" |
| A new generic was added to PMBJP | Add it to `seed_janaushadhi()` in `build-database.py` |

---

## Hindi / Multi-Language

- **Currently supports:** English + हिंदी
- **How it works:** all UI strings live in `js/i18n.js` → `TRANSLATIONS` object. Adding a language = adding one more object.
- **What stays English:** medicine/brand/salt names (this matches real-world prescriptions — translating them would confuse patients and pharmacists).
- **Planned roadmap:** additional languages based on usage demand.

---

## Current Data Status (V1)

| Metric | Count |
|--------|-------|
| Branded medicines | ~177 |
| Fully mapped to Janaushadhi generic | ~143 |
| Average savings | ~75% |
| Janaushadhi generics covered | ~79 |

Data refreshes quarterly (prices change ~1-2×/year on PMBJP).

---

## Testing

Everything runs client-side, so manual testing is simple:

```bash
python3 -m http.server 8080
# Then in browser:
#  - Search "Glycomet" → expect Glycomet 500, SR 500, SR 1000 results
#  - Search "glycmet" (typo) → fuzzy match should still find it
#  - Search "xyzmed" → should show "not found" + similar suggestions
#  - Click हिंदी → UI switches to Devanagari
#  - Download PDF → verify layout & numbers
```

---

## License

MIT. Free to use, modify, and deploy. Not affiliated with / endorsed by PMBI or the Government of India.

---

**Made with 💛 to help families save on essential medicines.**