#!/usr/bin/env python3
"""
Medicine Database Builder
=========================
1. Reads the curated medicine CSV → loads into SQLite
2. Exports JSON files for the frontend (brands.json, janaushadhi.json)
3. Run: python scripts/build-database.py
   This regenerates: db/medicines.db, data/brands.json, data/janaushadhi.json
"""

import csv
import json
import sqlite3
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / "db"
DATA_DIR = BASE_DIR / "data"
SCRIPTS_DIR = BASE_DIR / "scripts"

DB_PATH = DB_DIR / "medicines.db"
BRANDS_JSON = DATA_DIR / "brands.json"
JANAUSHADHI_JSON = DATA_DIR / "janaushadhi.json"
MAPPING_JSON = DATA_DIR / "brand-generic-map.json"
CSV_PATH = SCRIPTS_DIR / "medicines.csv"


def get_db():
    """Create or connect to SQLite database."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def create_schema(conn):
    """Create the database schema."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS brands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_name TEXT NOT NULL,
            salt TEXT NOT NULL,
            strength TEXT,
            pack_size TEXT,
            market_mrp REAL,
            manufacturer TEXT,
            category TEXT,
            is_active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS janaushadhi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            generic_name TEXT NOT NULL,
            strength TEXT,
            unit_size TEXT,
            pmbip_mrp REAL,
            therapeutic_category TEXT,
            drug_code TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS brand_generic_map (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_id INTEGER NOT NULL,
            janaushadhi_id INTEGER NOT NULL,
            match_type TEXT DEFAULT 'exact',  -- exact, similar, manual
            FOREIGN KEY (brand_id) REFERENCES brands(id),
            FOREIGN KEY (janaushadhi_id) REFERENCES janaushadhi(id),
            UNIQUE(brand_id, janaushadhi_id)
        );

        CREATE INDEX IF NOT EXISTS idx_brand_name ON brands(brand_name);
        CREATE INDEX IF NOT EXISTS idx_brand_salt ON brands(salt);
        CREATE INDEX IF NOT EXISTS idx_janaushadhi_generic ON janaushadhi(generic_name);
    """)
    conn.commit()


def import_medicines_csv(conn):
    """
    Import from medicines.csv. The CSV has columns:
    brand_name, salt, strength, pack_size, market_mrp, manufacturer, category
    Lines starting with # are treated as comments.
    """
    if not CSV_PATH.exists():
        print(f"[SKIP] {CSV_PATH} not found. Skipping CSV import.")
        return

    rows = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip comment lines and empty rows
            brand_name = (row.get("brand_name") or "").strip()
            if brand_name.startswith("#") or not brand_name:
                continue
            salt = (row.get("salt") or "").strip()
            if not salt:
                print(f"[SKIP] Row with missing salt: {row}")
                continue
            rows.append(row)

    if not rows:
        print("[SKIP] medicines.csv is empty.")
        return

    conn.execute("DELETE FROM brands")
    conn.executemany(
        """INSERT INTO brands (brand_name, salt, strength, pack_size, market_mrp, manufacturer, category)
           VALUES (:brand_name, :salt, :strength, :pack_size, :market_mrp, :manufacturer, :category)""",
        rows,
    )
    conn.commit()
    print(f"[OK] Imported {len(rows)} branded medicines from CSV.")


def export_json(conn):
    """Export SQLite data to JSON files for the frontend."""
    # 1. Export all brands (for search)
    brands = conn.execute("""
        SELECT b.id, b.brand_name, b.salt, b.strength, b.pack_size,
               b.market_mrp, b.manufacturer, b.category,
               j.pmbip_mrp AS janaushadhi_mrp,
               j.generic_name AS generic_name,
               j.unit_size AS generic_unit_size
        FROM brands b
        LEFT JOIN brand_generic_map m ON b.id = m.brand_id
        LEFT JOIN janaushadhi j ON m.janaushadhi_id = j.id
        WHERE b.is_active = 1
        ORDER BY b.brand_name
    """).fetchall()

    brands_list = []
    for row in brands:
        savings = 0
        savings_pct = 0
        if row["market_mrp"] and row["janaushadhi_mrp"] and row["market_mrp"] > 0:
            savings = round(row["market_mrp"] - row["janaushadhi_mrp"], 2)
            savings_pct = round((savings / row["market_mrp"]) * 100, 1)

        brands_list.append({
            "id": row["id"],
            "brand": row["brand_name"],
            "salt": row["salt"],
            "strength": row["strength"],
            "pack": row["pack_size"],
            "brandMRP": row["market_mrp"],
            "manufacturer": row["manufacturer"],
            "category": row["category"],
            "genericName": row["generic_name"],
            "genericMRP": row["janaushadhi_mrp"],
            "genericUnit": row["generic_unit_size"],
            "savings": savings,
            "savingsPct": savings_pct,
        })

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(BRANDS_JSON, "w", encoding="utf-8") as f:
        json.dump(brands_list, f, indent=2, ensure_ascii=False)

    print(f"[OK] Exported {len(brands_list)} brands → {BRANDS_JSON}")

    # 2. Export Janaushadhi generic list (for reference / future matching)
    generics = conn.execute("""
        SELECT drug_code, generic_name, strength, unit_size, pmbip_mrp, therapeutic_category
        FROM janaushadhi
        ORDER BY generic_name
    """).fetchall()

    generics_list = [
        {
            "code": row["drug_code"],
            "name": row["generic_name"],
            "strength": row["strength"],
            "unit": row["unit_size"],
            "mrp": row["pmbip_mrp"],
            "category": row["therapeutic_category"],
        }
        for row in generics
    ]

    with open(JANAUSHADHI_JSON, "w", encoding="utf-8") as f:
        json.dump(generics_list, f, indent=2, ensure_ascii=False)

    print(f"[OK] Exported {len(generics_list)} generics → {JANAUSHADHI_JSON}")

    # 3. Export brand → generic mapping
    mappings = conn.execute("""
        SELECT b.brand_name, b.salt, j.generic_name, j.pmbip_mrp AS generic_mrp,
               b.market_mrp AS brand_mrp, b.strength
        FROM brand_generic_map m
        JOIN brands b ON m.brand_id = b.id
        JOIN janaushadhi j ON m.janaushadhi_id = j.id
        ORDER BY b.brand_name
    """).fetchall()

    mappings_list = [
        {
            "brand": row["brand_name"],
            "salt": row["salt"],
            "genericName": row["generic_name"],
            "strength": row["strength"],
            "brandMRP": row["brand_mrp"],
            "genericMRP": row["generic_mrp"],
        }
        for row in mappings
    ]

    with open(MAPPING_JSON, "w", encoding="utf-8") as f:
        json.dump(mappings_list, f, indent=2, ensure_ascii=False)

    print(f"[OK] Exported {len(mappings_list)} mappings → {MAPPING_JSON}")


def main():
    print("=" * 50)
    print("  Medicine Database Builder")
    print("=" * 50)

    conn = get_db()
    create_schema(conn)

    # Step 1: Seed Janaushadhi generics from built-in data
    seed_janaushadhi(conn)

    # Step 2: Import brands from CSV (if exists)
    import_medicines_csv(conn)

    # Step 3: Auto-map brands to generics
    auto_map_brands(conn)

    # Step 4: Export JSON for frontend
    export_json(conn)

    conn.close()
    print("\n✅ Database build complete!")
    print(f"   SQLite DB    → {DB_PATH}")
    print(f"   brands.json  → {BRANDS_JSON}")
    print(f"   generics     → {JANAUSHADHI_JSON}")
    print(f"   mappings     → {MAPPING_JSON}")


def seed_janaushadhi(conn):
    """
    Seed the Janaushadhi generics table with official PMBJP data.
    This is the curated list of ~100+ most commonly prescribed generics.
    Full list can be extended from the official PDF.
    """
    generics = [
        # === Analgesics & Pain ===
        ("1005", "Paracetamol", "500 mg", "10's", 4.51, "Analgesic"),
        ("1010", "Paracetamol", "650 mg", "15's", 8.03, "Analgesic"),
        ("1020", "Diclofenac Sodium", "50 mg", "10's", 2.90, "Analgesic"),
        ("1025", "Diclofenac Sodium (SR)", "100 mg", "10's", 6.12, "Analgesic"),
        ("1030", "Aceclofenac", "100 mg", "10's", 4.37, "Analgesic"),
        ("1035", "Aceclofenac + Paracetamol", "100 mg + 325 mg", "10's", 8.00, "Analgesic"),
        ("1040", "Ibuprofen", "400 mg", "15's", 3.50, "Analgesic"),
        ("1045", "Ibuprofen + Paracetamol", "400 mg + 325 mg", "15's", 5.50, "Analgesic"),
        ("1050", "Nimesulide", "100 mg", "10's", 4.10, "Analgesic"),
        ("1055", "Serratiopeptidase", "10 mg", "10's", 8.90, "Analgesic"),
        ("1060", "Etoricoxib", "90 mg", "10's", 25.00, "Analgesic"),
        ("1065", "Etoricoxib", "120 mg", "10's", 33.00, "Analgesic"),
        ("1070", "Aspirin (Gastro-resistant)", "150 mg", "14's", 2.70, "Analgesic"),

        # === Anti-diabetic ===
        ("2001", "Metformin Hydrochloride", "500 mg", "10's", 5.15, "Antidiabetic"),
        ("2002", "Metformin Hydrochloride (SR)", "500 mg", "10's", 8.85, "Antidiabetic"),
        ("2003", "Metformin Hydrochloride (SR)", "1000 mg", "10's", 11.05, "Antidiabetic"),
        ("2004", "Glimepiride", "1 mg", "10's", 4.38, "Antidiabetic"),
        ("2005", "Glimepiride", "2 mg", "10's", 5.05, "Antidiabetic"),
        ("2006", "Glimepiride + Metformin SR", "1 mg + 500 mg", "15's", 7.00, "Antidiabetic"),
        ("2007", "Glimepiride + Metformin SR", "2 mg + 500 mg", "15's", 16.90, "Antidiabetic"),
        ("2008", "Gliclazide", "80 mg", "10's", 20.25, "Antidiabetic"),
        ("2009", "Pioglitazone", "15 mg", "10's", 6.75, "Antidiabetic"),
        ("2010", "Pioglitazone", "30 mg", "10's", 10.69, "Antidiabetic"),
        ("2011", "Glibenclamide", "5 mg", "10's", 4.05, "Antidiabetic"),
        ("2012", "Glipizide", "5 mg", "10's", 2.50, "Antidiabetic"),
        ("2013", "Teneligliptin", "20 mg", "10's", 49.50, "Antidiabetic"),
        ("2014", "Insulin Human (NPH)", "40 IU/ml", "10 ml vial", 71.00, "Antidiabetic"),
        ("2015", "Insulin Glargine", "100 IU/ml", "3 ml cartridge", 266.00, "Antidiabetic"),

        # === Cardiac / BP ===
        ("3001", "Amlodipine", "5 mg", "10's", 3.00, "Cardiac"),
        ("3002", "Amlodipine", "10 mg", "10's", 5.00, "Cardiac"),
        ("3003", "Telmisartan", "40 mg", "10's", 7.50, "Cardiac"),
        ("3004", "Losartan", "50 mg", "10's", 6.00, "Cardiac"),
        ("3005", "Ramipril", "5 mg", "10's", 8.00, "Cardiac"),
        ("3006", "Metoprolol Succinate (ER)", "50 mg", "10's", 12.00, "Cardiac"),
        ("3007", "Bisoprolol", "5 mg", "10's", 8.00, "Cardiac"),
        ("3008", "Atorvastatin", "10 mg", "10's", 6.00, "Cardiac"),
        ("3009", "Atorvastatin", "20 mg", "10's", 9.00, "Cardiac"),
        ("3010", "Rosuvastatin", "10 mg", "10's", 9.50, "Cardiac"),
        ("3011", "Clopidogrel", "75 mg", "10's", 11.00, "Cardiac"),
        ("3012", "Aspirin (Low Dose)", "75 mg", "14's", 3.50, "Cardiac"),
        ("3013", "Furosemide", "40 mg", "10's", 4.00, "Cardiac"),
        ("3014", "Spironolactone", "25 mg", "10's", 8.00, "Cardiac"),

        # === Cardio / BP (additional) ===
        ("3015", "Telmisartan + Amlodipine", "40 mg + 5 mg", "10's", 14.00, "Cardiac"),
        ("3016", "Atenolol", "50 mg", "10's", 5.00, "Cardiac"),
        ("3017", "Chlorthalidone", "12.5 mg", "10's", 6.00, "Cardiac"),
        ("3018", "Hydrochlorothiazide", "25 mg", "10's", 7.00, "Cardiac"),

        # === Antibiotics ===
        ("4001", "Amoxicillin", "250 mg", "10's", 11.00, "Antibiotic"),
        ("4002", "Amoxicillin", "500 mg", "10's", 26.26, "Antibiotic"),
        ("4003", "Amoxicillin + Clavulanic Acid", "500 mg + 125 mg", "6's", 52.25, "Antibiotic"),
        ("4004", "Azithromycin", "250 mg", "6's", 40.00, "Antibiotic"),
        ("4005", "Azithromycin", "500 mg", "3's", 42.00, "Antibiotic"),
        ("4006", "Cefixime", "200 mg", "10's", 41.50, "Antibiotic"),
        ("4007", "Ciprofloxacin", "500 mg", "10's", 20.00, "Antibiotic"),
        ("4008", "Levofloxacin", "500 mg", "10's", 33.00, "Antibiotic"),

        # === Gastro ===
        ("5001", "Pantoprazole", "40 mg", "10's", 10.00, "Gastro"),
        ("5002", "Omeprazole", "20 mg", "10's", 9.00, "Gastro"),
        ("5003", "Rabeprazole", "20 mg", "10's", 8.80, "Gastro"),
        ("5004", "Domperidone", "10 mg", "10's", 4.40, "Gastro"),
        ("5005", "Ondansetron", "4 mg", "10's", 6.00, "Gastro"),

        # === Thyroid ===
        ("6001", "Levothyroxine Sodium", "50 mcg", "10's", 7.00, "Thyroid"),
        ("6002", "Levothyroxine Sodium", "100 mcg", "10's", 8.00, "Thyroid"),

        # === Respiratory / Allergy ===
        ("7001", "Montelukast Sodium", "10 mg", "10's", 15.00, "Respiratory"),
        ("7002", "Levocetirizine", "5 mg", "10's", 7.00, "Allergy"),
        ("7003", "Fexofenadine", "120 mg", "10's", 24.00, "Allergy"),
        ("7004", "Salbutamol Inhalation", "100 mcg", "200 MDI", 50.00, "Respiratory"),
        ("7005", "Montelukast + Levocetirizine", "10 mg + 5 mg", "10's", 42.80, "Respiratory"),
        ("7006", "Cetirizine", "10 mg", "10's", 5.50, "Allergy"),
        ("7007", "Salbutamol", "4 mg", "10's", 2.00, "Respiratory"),

        # === Antibiotics (additional) ===
        ("4009", "Ofloxacin + Ornidazole", "200 mg + 500 mg", "10's", 27.50, "Antibiotic"),

        # === Urology ===
        ("9001", "Tamsulosin", "0.4 mg", "10's", 14.00, "Urology"),
        ("9002", "Finasteride", "5 mg", "10's", 25.00, "Urology"),

        # === Neuro / Mental Health ===
        ("9101", "Alprazolam", "0.5 mg", "10's", 12.00, "Neuro"),
        ("9102", "Escitalopram", "10 mg", "10's", 12.95, "Neuro"),
        ("9103", "Sertraline", "25 mg", "10's", 10.00, "Neuro"),
        ("9104", "Paroxetine", "20 mg", "10's", 16.00, "Neuro"),

        # === Vitamins & Supplements ===
        ("8001", "Calcium + Vitamin D3", "500 mg + 250 IU", "10's", 7.00, "Supplement"),
        ("8002", "Vitamin B-Complex", "B1 10mg + B2 10mg + B3 45mg + B5 50mg + B6 3mg + B12 15mcg", "10's", 16.00, "Supplement"),
        ("8003", "Folic Acid", "5 mg", "15's", 4.40, "Supplement"),
        ("8004", "Vitamin D3 (Cholecalciferol)", "60000 IU", "1's", 25.00, "Supplement"),
    ]

    conn.execute("DELETE FROM janaushadhi")
    conn.executemany(
        """INSERT INTO janaushadhi (drug_code, generic_name, strength, unit_size, pmbip_mrp, therapeutic_category)
           VALUES (?, ?, ?, ?, ?, ?)""",
        generics,
    )
    conn.commit()
    print(f"[OK] Seeded {len(generics)} Janaushadhi generics.")


def auto_map_brands(conn):
    """Automatically map brands to Janaushadhi generics by matching salt name."""
    brands = conn.execute("SELECT id, brand_name, salt, strength FROM brands").fetchall()
    generics = conn.execute("SELECT id, generic_name, strength FROM janaushadhi").fetchall()

    conn.execute("DELETE FROM brand_generic_map")

    mapped = 0
    for brand in brands:
        brand_salt_lower = brand["salt"].lower().strip()
        brand_strength = (brand["strength"] or "").strip().lower()

        # Normalize: strip SR, ER, CR, (SR), (ER), (CR), XL, XR for matching
        def normalize_salt(s):
            s = s.lower().strip()
            s = s.replace(" (sr)", "").replace(" (er)", "").replace(" (cr)", "")
            s = s.replace(" sr", "").replace(" er", "").replace(" cr", "")
            s = s.replace("sustained release", "").replace("prolonged release", "")
            s = s.replace("extended release", "").replace("gastro-resistant", "")
            s = s.strip()
            return s

        brand_salt_norm = normalize_salt(brand_salt_lower)

        best_match = None
        best_score = 0

        for generic in generics:
            generic_name_lower = generic["generic_name"].lower().strip()
            generic_strength = (generic["strength"] or "").strip().lower()
            generic_name_norm = normalize_salt(generic_name_lower)

            # Strategy 1: Exact match
            if generic_name_lower == brand_salt_lower:
                score = 100
            # Strategy 2: Normalized exact match  
            elif generic_name_norm == brand_salt_norm:
                score = 95
            # Strategy 3: Word-boundary match (avoid "cetri" matching "levocetri")
            elif (f" {brand_salt_lower} " in f" {generic_name_lower} "
                  or generic_name_lower.startswith(brand_salt_lower + " ")
                  or generic_name_lower.endswith(" " + brand_salt_lower)
                  or generic_name_lower == brand_salt_lower
                  or brand_salt_lower == generic_name_lower):
                score = 90
            # Strategy 4: Normalized word-boundary
            elif (f" {brand_salt_norm} " in f" {generic_name_norm} "
                  or generic_name_norm.startswith(brand_salt_norm + " ")
                  or generic_name_norm.endswith(" " + brand_salt_norm)
                  or brand_salt_norm == generic_name_norm):
                score = 85
            # Strategy 5: Count matching significant words
            else:
                brand_words = set(brand_salt_norm.replace(" + ", " ").replace("  ", " ").split())
                generic_words = set(generic_name_norm.replace(" + ", " ").replace("  ", " ").split())
                common = brand_words & generic_words
                significant = {w for w in common if len(w) > 3 and w not in {"sodium", "acid", "hcl", "ip"}}
                if significant and len(significant) >= len(brand_words) - 1:
                    score = 70
                else:
                    score = 0

            # Check strength similarity (penalize mismatch but don't eliminate)
            if score > 0 and brand_strength and generic_strength:
                strength_match = (
                    brand_strength == generic_strength
                    or brand_strength in generic_strength
                    or generic_strength in brand_strength
                )
                if not strength_match:
                    score -= 20  # penalize

            if score > best_score:
                best_score = score
                best_match = generic

        if best_match and best_score >= 70:
            conn.execute(
                "INSERT OR IGNORE INTO brand_generic_map (brand_id, janaushadhi_id, match_type) VALUES (?, ?, 'auto')",
                (brand["id"], best_match["id"]),
            )
            mapped += 1

    conn.commit()
    print(f"[OK] Auto-mapped {mapped} brands to generics.")

    # Apply manual overrides
    apply_manual_mappings(conn)


def apply_manual_mappings(conn):
    """Apply manual brand → generic mappings from manual-mappings.json."""
    import json as json_mod

    mapping_file = SCRIPTS_DIR / "manual-mappings.json"
    if not mapping_file.exists():
        print("[SKIP] No manual-mappings.json found.")
        return

    with open(mapping_file, "r", encoding="utf-8") as f:
        data = json_mod.load(f)

    overrides = data.get("overrides", [])
    updated = 0

    for override in overrides:
        brand_name = override.get("brand")
        generic_code = override.get("generic_code")

        # Find the brand
        brand_row = conn.execute(
            "SELECT id FROM brands WHERE brand_name = ?", (brand_name,)
        ).fetchone()
        if not brand_row:
            continue

        if generic_code is None:
            # null = remove any existing mapping (brand has no generic equivalent)
            conn.execute(
                "DELETE FROM brand_generic_map WHERE brand_id = ?",
                (brand_row["id"],),
            )
            updated += 1
            continue

        # Find the Janaushadhi entry by drug code
        generic_row = conn.execute(
            "SELECT id FROM janaushadhi WHERE drug_code = ?", (generic_code,)
        ).fetchone()
        if not generic_row:
            print(f"[WARN] Generic code '{generic_code}' not found (brand: {brand_name})")
            continue

        # Delete old auto-mapping and insert manual one
        conn.execute("DELETE FROM brand_generic_map WHERE brand_id = ?", (brand_row["id"],))
        conn.execute(
            "INSERT INTO brand_generic_map (brand_id, janaushadhi_id, match_type) VALUES (?, ?, 'manual')",
            (brand_row["id"], generic_row["id"]),
        )
        updated += 1

    conn.commit()
    if updated:
        print(f"[OK] Applied {updated} manual overrides.")


if __name__ == "__main__":
    main()