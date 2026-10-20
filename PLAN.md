# Generic Medicine Alternative Finder — Project Plan

## 1. Overview

A zero-nonsense search engine where users type a popular Indian brand name (e.g., *Augmentin 625*, *Glycomet 500*, *Telma 40*) and instantly see:
- The **active salt/composition** (e.g., Metformin 500mg)
- The **branded market MRP** vs. the **PMBJP Janaushadhi price**
- **Exact percentage and rupee savings** (monthly / annual projection)
- A **downloadable comparison PDF** to take to a doctor or pharmacist

---

## 2. V1 Deliverables (Scope)

| # | Deliverable | Priority | Description |
|---|-----------|----------|-------------|
| 1 | **Search UI** | P0 | Single search box with autocomplete/suggestions. Clean, minimal, mobile-friendly. |
| 2 | **Brand → Generic Mapping Database** | P0 | Core dataset: brand name → salt/composition, strength, pack size |
| 3 | **PMBJP Price Database** | P0 | Janaushadhi generic MRP for matching salt + strength |
| 4 | **Branded MRP Database** | P0 | Representative market prices for common branded medicines |
| 5 | **Results Display Card** | P0 | Shows: brand name, salt, strengths, branded MRP, Janaushadhi price, savings % & ₹, monthly savings |
| 6 | **Cost Comparison PDF Download** | P1 | One-click PDF with tabular comparison; ready to show doctor/pharmacist |
| 7 | **Top Savings Stats (Optional)** | P2 | On homepage: "Top 10 biggest savings" or "Most searched" |
| 8 | **Hindi Language Toggle** | P2 | UI text translated to Hindi (Devanagari script) |

---

## 3. Architecture

### 3.1 Recommended Stack (Approved)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | **HTML + Tailwind CSS + Vanilla JavaScript** | Zero build step, no framework to learn, trivial to edit, fast on slow connections. Works on all devices. |
| **Data Storage (Live)** | **Static JSON files** (~150KB for 500 medicines) | Entire database lives in the repo. No backend server needed. Zero cost to run. |
| **Data Storage (Pipeline)** | **SQLite** (via Python) | Built during data processing for structured queries. Ready for future backend migration. |
| **Data Processing** | **Python** (scripts/) | Parses PMBJP PDF/CSV, builds brand database, generates both SQLite DB and JSON exports. |
| **Search** | **Fuse.js** (client-side fuzzy search) | ~15KB. Handles typos and partial names. Better than SQL LIKE for real-world search. |
| **PDF Generation** | **jsPDF + html2canvas** (client-side) | No server needed. User clicks → PDF generated & downloaded in browser. |
| **Hosting** | **GitHub Pages** | Free. Zero-config deployment. Just push to `main`. |

### 3.2 Data Flow

```
Python Scripts (scripts/) — runs locally or in CI
  ↓
PMBJP PDF/CSV → Parse → SQLite DB (structured, queryable)
  ↓
SQLite DB → Export → brands.json (for browser)
  ↓
Also exports → janaushadhi.json, brand-generic-map.json
  ↓
─────────────── Deployment ───────────────
  ↓
GitHub Pages serves: index.html + .js + .css + .json files
  ↓
User enters "Glycomet 500"
  ↓
Fuse.js searches brands.json (entirely in the browser)
  ↓
Found → Look up matched brand's salt + strength
  ↓
Cross-reference salt+strength in janaushadhi.json for PMBJP price
  ↓
Calculate: Savings% = (BrandMRP - JanaushadhiMRP) / BrandMRP * 100
           Monthly = Savings × (tablets per month / pack size)
  ↓
Render results card + PDF generation button
```

---

## 4. Data Strategy (Crucial)

### 4.1 Data Sources

| Source | What | Accessibility |
|--------|------|---------------|
| **PMBJP Official PDF** (janaushadhi.gov.in) | Official Janaushadhi product list with generic names & MRP | PDF & CSV download available on the website |
| **Kaggle: Generic Medicine Data** (~9,600 branded medicines) | Brand name → active ingredient, top 5 generic alternatives | CSV download (CC0 / public-ish) |
| **MediMatch AI / Dawainfo / PharmaBag** | Brand → salt mapping, market MRP | Can be scraped or used as reference |
| **1mg / PharmEasy / Tata 1mg** | Market MRP for branded medicines | Accessible via web |

### 4.2 Data Compilation Pipeline

```
Step 1: Parse PMBJP PDF → janaushadhi_generics.csv
        Columns: generic_name, strength, unit_size, pmbip_mrp, therapeutic_category

Step 2: Compile brand database → brands.csv
        Columns: brand_name, salt, strength, pack_size, market_mrp, manufacturer, category

Step 3: Manual mapping pass
        For each brand, map to the corresponding Janaushadhi generic entry
        (e.g., Glycomet 500 → Metformin HCl 500mg → ₹5.15 for 10 tablets)

Step 4: Convert both CSVs to JSON for the frontend
        brands.json (search index)
        janaushadhi.json (price lookup)
```

**Estimated initial dataset**: ~2,000-3,000 of the most commonly prescribed branded medicines (prioritising chronic illness: diabetes, hypertension, cardiac, thyroid, asthma, pain management).

**Why start with 2,000-3,000 instead of all 20,000?**
- The top 200 brands cover ~80% of outpatient prescriptions in India
- Chronic illness meds (diabetes, BP, cardiac) are where the biggest savings are
- We can expand to the full dataset in V2

### 4.3 Data Maintenance

- PMBJP updates prices ~1-2 times per year
- Branded MRP changes occasionally
- Plan: Quarterly data refresh via script
- A `scripts/` folder will contain a Python/node scraper to regenerate JSON files

---

## 5. UI/UX Design

### 5.1 Layout (Single Page)

```
┌─────────────────────────────────────────────────┐
│  🔍 Generic Medicine Finder                     │
│  ┌─────────────────────────────────────────┐    │
│  │ Search for a brand... (e.g., Glycomet)  │    │
│  └─────────────────────────────────────────┘    │
│  [🇮🇳 हिंदी]  [📥 Download PDF]                  │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │                                         │    │
│  │   💊 Glycomet 500 — USV Pvt Ltd         │    │
│  │   ─────────────────────────────────     │    │
│  │   Active Salt: Metformin HCl 500mg      │    │
│  │   Pack: 10 tablets                     │    │
│  │                                         │    │
│  │   ┌──────────────┬──────────────┐      │    │
│  │   │  Branded MRP  │  Jan Aushadhi│      │    │
│  │   │  ₹24.00       │  ₹5.15       │      │    │
│  │   └──────────────┴──────────────┘      │    │
│  │                                         │    │
│  │   💰 You Save: ₹18.85 per pack (79%)    │    │
│  │   📅 Monthly savings: ~₹113 (30 tabs)  │    │
│  │   📅 Yearly savings: ~₹1,356           │    │
│  │                                         │    │
│  │   [📄 Download Comparison PDF]          │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  🏥 Locate nearest Janaushadhi Kendra          │
│  ───────────────────────────────────────        │
│  → https://janaushadhi.gov.in/kendraSearch.aspx │
│                                                 │
│  📋 Disclaimer: Consult your doctor before      │
│  switching. These are the same salt compounds.  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5.2 Key Design Principles

1. **Big, bold savings numbers** — the savings % is the headline
2. **Minimal clicks** — type, see results immediately
3. **Autocomplete suggestions** — users who don't know exact spelling can browse
4. **Mobile-first** — many users will access via phone on slow networks
5. **High-contrast, large text** — accessible to elderly users
6. **No clutter** — no ads, no popups, no registration
7. **Disclaimer upfront** — always remind to consult doctor before switching

### 5.3 Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary brand | Saffron (India) | `#FF9933` |
| Savings highlight | Green | `#059669` |
| Danger/alert | Red | `#DC2626` |
| Background | Warm white | `#FFFAF0` |
| Text | Dark charcoal | `#1F2937` |

---

## 6. Project File Structure

```
alt_med_finder/
├── index.html              # Main page (single page app)
├── css/
│   └── style.css           # Tailwind-like custom styles (or CDN Tailwind)
├── js/
│   ├── app.js              # Main app logic
│   ├── search.js           # Fuse.js search integration
│   ├── pdf.js              # PDF generation (html2canvas + jsPDF)
│   ├── i18n.js             # Hindi translation logic
│   └── data-loader.js      # Loads JSON datasets
├── data/
│   ├── brands.json         # Brand → salt mapping + market MRP
│   ├── janaushadhi.json    # PMBJP generic list with prices
│   └── brand-generic-map.json  # Pre-computed mapping between brands & generics
├── lang/
│   ├── en.json             # English UI strings
│   └── hi.json             # Hindi UI strings
├── scripts/
│   ├── parse-pmbjp-pdf.py  # Python script to parse PMBJP PDF → JSON
│   ├── build-brand-db.py   # Script to build brand database
│   ├── build-database.py   # Builds SQLite DB + exports JSON files for frontend
│   ├── seed-data.py        # Seeds the initial 500 medicine dataset
│   └── update-prices.sh    # Automated price refresh
├── db/
│   └── medicines.db        # SQLite database (generated by scripts/)
├── assets/
│   ├── favicon.ico
│   └── og-image.png        # Social share preview
├── README.md               # Project documentation
├── PLAN.md                 # This document
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages auto-deploy
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1) 🏗️
- Set up project structure
- Parse PMBJP official PDF → janaushadhi.json
- Build initial brands.json with top 500 common chronic illness medicines
- Create brand → generic mapping
- Basic HTML page with search input

### Phase 2: Core Search (Week 2) 🔍
- Integrate Fuse.js for fuzzy search with autocomplete
- Build results display card with all comparison fields
- Calculate and display savings (per pack, monthly, yearly)
- Mobile-responsive CSS

### Phase 3: PDF & Polish (Week 3) 📄
- Implement PDF download with tabular comparison
- Add Janaushadhi Kendra locator link
- Add proper meta tags, favicon, social preview
- Performance optimization (lazy load data, compress JSON)

### Phase 4: Hindi Support (Week 4) 🇮🇳
- Translate all UI strings to Hindi (create hi.json)
- Implement language toggle in i18n.js
- Test with Hindi-speaking users

### Phase 5: Public Launch (Week 5) 🚀
- Deploy to GitHub Pages
- Set up custom domain (optional)
- Basic analytics (Plausible or similar privacy-focused)
- Share with communities (Reddit r/India, WhatsApp groups, health forums)

---

## 8. Hindi / Multi-Language Support

### Complexity: Medium (5-7 days of work)

| Task | Effort | Detail |
|------|--------|--------|
| UI string translation | 2 days | ~100-150 UI strings. Translating actual medicine names is NOT needed (brand names remain in English). |
| Devanagari rendering | 0 days | Works natively with any modern browser. No extra work. |
| Language toggle UI | 0.5 days | Simple dropdown/toggle button. |
| RTL considerations | 0 days | Hindi uses left-to-right script. No RTL changes needed. |
| **Medicine data in Hindi** | **Not recommended** | Brand names and salt names are always written in English on prescriptions and packaging. Translating them would cause confusion. |

**Approach:**
```javascript
// i18n.js
const translations = {
  en: {
    searchPlaceholder: "Search for a brand...",
    activeSalt: "Active Salt",
    brandMRP: "Branded MRP",
    janaushadhiPrice: "Jan Aushadhi Price",
    youSave: "You Save",
    // ... more strings
  },
  hi: {
    searchPlaceholder: "ब्रांड का नाम खोजें...",
    activeSalt: "सक्रिय साल्ट",
    brandMRP: "ब्रांडेड एमआरपी",
    janaushadhiPrice: "जन औषधि मूल्य",
    youSave: "आप बचाते हैं",
    // ... more strings
  }
};
```

**Future expansion to other Indian languages:**
- Adding Assamese, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu, Urdu would follow the same pattern
- Simply add new translation files (`gu.json`, `ta.json`, etc.)
- Each language adds ~2-3 days for translation + testing
- Total for all 22 official languages: ~2 months of translation work
- **Recommendation**: Start with Hindi only, add more based on user demand

---

## 9. Technology Choices — Trade-offs

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Pure HTML + JS** | No build step, easy to edit, fast, works everywhere | Limited tooling, manual state management | ✅ **Recommended for V1** |
| React / Next.js | Better component structure, SSG for SEO | Build step, npm, steeper learning curve for edits | Overkill for this use case |
| Backend (Node/Python) | Dynamic data updates, server-side search | Server cost, maintenance, complexity | Overkill — static JSON is sufficient |
| SQLite + API | Better for massive datasets | Our dataset is < 1MB — JSON is fine | Overkill |
| Vue / Svelte | Moderate learning curve | Still adds complexity vs vanilla JS | Unnecessary for a single-page app |

---

## 10. Estimated Timeline (Part-Time)

| Phase | Duration | Hours |
|-------|----------|-------|
| Data compilation (PMBJP parsing + brand mapping) | 5-7 days | 15-20 hrs |
| Core search + results UI | 3-4 days | 10-12 hrs |
| PDF generation | 1-2 days | 4-6 hrs |
| Hindi translation | 2-3 days | 6-8 hrs |
| Polish, deploy, test | 2-3 days | 6-8 hrs |
| **Total** | **~3-4 weeks** | **~40-50 hrs** |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| PMBJP price data is outdated by the time we launch | Medium | Add a "Last updated" date on the page. Make the refresh script easy to run. |
| Brand MRP varies by region/pharmacy | High | Show a range or a representative price from a major online pharmacy. Add disclaimer. |
| Legal concerns (displaying prices) | Low | We're displaying government data and publicly available prices. No prescription advice. Add medical disclaimer. |
| Search is slow with large dataset | Low | Fuse.js handles 20K+ items in <50ms. JSON is <1MB. No issue. |
| Users don't know brand names | Medium | Add "Popular searches" section and browse-by-category (Diabetes, BP, Heart, etc.) |

---

## 12. Post-V1 Roadmap

| Feature | Timeframe | Notes |
|---------|-----------|-------|
| Browse by therapeutic category | V1.1 | "Show me all diabetes medicines" |
| Full 20K+ medicine database | V1.2 | Includes all PMBJP+ brands |
| Nearest Kendra map integration | V1.3 | Embed Google Maps / OSM |
| Monthly cost projection calendar | V1.4 | "If you take 2 tablets daily..." |
| Additional Indian languages | V2 | Based on user demand |
| Doctor/pharmacist verification portal | V2 | Let doctors verify their patients' savings |
| Progressive Web App (PWA) | V2 | Offline support, install on phone |
| API for third-party integration | V2 | For hospitals and health-tech apps |