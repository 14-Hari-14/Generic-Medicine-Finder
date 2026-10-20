#!/usr/bin/env python3
"""
Add a new branded medicine to the database.

This script:
1. Adds the brand to medicines.csv
2. Runs the database builder to auto-map it to the best Janaushadhi generic
3. Shows the result — savings, matched generic, etc.

Usage:
    python3 scripts/add-medicine.py "Brand Name" "Salt Name" "Strength" "Pack Size" MRP "Manufacturer" "Category"

Example:
    python3 scripts/add-medicine.py "Glycomet 500" "Metformin Hydrochloride" "500 mg" "10's" 24.00 "USV Pvt Ltd" "Antidiabetic"

Interactive mode (no arguments):
    python3 scripts/add-medicine.py

Bulk mode (add multiple at once via CSV):
    python3 scripts/add-medicine.py --bulk new-medicines.csv
"""

import csv
import sys
import os
from pathlib import Path

# Ensure we're running from the project root
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent

CSV_PATH = PROJECT_DIR / "scripts" / "medicines.csv"
BUILD_SCRIPT = PROJECT_DIR / "scripts" / "build-database.py"


def add_medicine(brand, salt, strength, pack_size, mrp, manufacturer, category):
    """Add a single medicine to the CSV and rebuild."""
    # Validate inputs
    if not brand or not salt:
        print("❌ Error: Brand name and salt are required.")
        return False

    try:
        mrp = float(mrp)
    except (ValueError, TypeError):
        print(f"❌ Error: MRP must be a number, got '{mrp}'")
        return False

    # Check if brand already exists
    existing = set()
    if CSV_PATH.exists():
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get("brand_name") or "").strip()
                if name and not name.startswith("#"):
                    existing.add(name)

    if brand in existing:
        print(f"⚠️  Warning: '{brand}' already exists in the database.")
        overwrite = input("  Overwrite? (y/N): ").strip().lower()
        if overwrite != "y":
            print("  Skipped.")
            return False

        # Remove existing entry (we'll append the new one)
        rows = []
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                name = (row.get("brand_name") or "").strip()
                if name and not name.startswith("#") and name == brand:
                    continue  # skip old entry
                rows.append(row)

        with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    # Ensure CSV ends with a newline before appending
    if CSV_PATH.exists():
        content = CSV_PATH.read_text(encoding="utf-8")
        if content and not content.endswith("\n"):
            CSV_PATH.write_text(content + "\n", encoding="utf-8")

    # Append to CSV
    with open(CSV_PATH, "a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([brand, salt, strength, pack_size, mrp, manufacturer, category])

    print(f"✅ Added '{brand}' → {salt} ({strength}) | ₹{mrp:.2f} | {manufacturer}")

    # Rebuild database
    return rebuild()


def rebuild():
    """Run the database builder and show a summary."""
    print("\n🔄 Rebuilding database...")
    import subprocess
    result = subprocess.run(
        [sys.executable, str(BUILD_SCRIPT)],
        capture_output=True, text=True, cwd=str(PROJECT_DIR)
    )

    # Print output
    for line in result.stdout.split("\n"):
        if line.strip():
            print(f"  {line}")

    if result.returncode != 0:
        print(f"❌ Build failed:\n{result.stderr}")
        return False

    # Show summary
    import json
    brands_path = PROJECT_DIR / "data" / "brands.json"
    if brands_path.exists():
        with open(brands_path, "r") as f:
            data = json.load(f)
        mapped = sum(1 for b in data if b.get("genericMRP"))
        unmapped = sum(1 for b in data if not b.get("genericMRP"))
        print(f"\n📊 Summary: {len(data)} brands | {mapped} with generic match | {unmapped} without")

    return True


def list_categories():
    """Show available categories for reference."""
    return [
        "Antidiabetic", "Cardiac", "Analgesic", "Antibiotic",
        "Gastro", "Thyroid", "Respiratory", "Allergy",
        "Supplement", "Neuro", "Urology",
    ]


def list_salts():
    """Show all Janaushadhi salts available for matching."""
    import sqlite3
    db_path = PROJECT_DIR / "db" / "medicines.db"
    if not db_path.exists():
        print("  (Run build-database.py first to generate the DB)")
        return []

    conn = sqlite3.connect(str(db_path))
    rows = conn.execute(
        "SELECT generic_name, strength, pmbip_mrp FROM janaushadhi ORDER BY therapeutic_category, generic_name"
    ).fetchall()
    conn.close()
    return rows


def interactive_mode():
    """Walk the user through adding a medicine."""
    print("\n=== Add a Medicine (Interactive) ===\n")

    brand = input("Brand name (e.g., Glycomet 500): ").strip()
    if not brand:
        print("Cancelled.")
        return

    salt = input(f"Active salt for '{brand}' (e.g., Metformin Hydrochloride): ").strip()
    if not salt:
        print("Cancelled.")
        return

    strength = input("Strength (e.g., 500 mg, 10 mg + 5 mg): ").strip()

    # Show available Janaushadhi generics that match this salt
    salts = list_salts()
    if salts:
        matching = [s for s in salts if salt.lower() in s[0].lower()]
        if matching:
            print(f"\n  Janaushadhi generics matching '{salt}':")
            for s in matching[:5]:
                print(f"    • {s[0]} ({s[1]}) — ₹{s[2]:.2f}")
            print()

    try:
        mrp = float(input("Branded MRP (in ₹, e.g., 24.00): ").strip())
    except ValueError:
        print("Invalid MRP. Using 0.")
        mrp = 0.0

    pack_size = input("Pack size (e.g., 10's, 15's, 30's): ").strip() or "10's"
    manufacturer = input("Manufacturer (e.g., USV Pvt Ltd): ").strip()

    print("\nCategories:")
    for i, cat in enumerate(list_categories(), 1):
        print(f"  {i}. {cat}")
    cat_input = input("Category (name or number): ").strip()
    try:
        idx = int(cat_input) - 1
        category = list_categories()[idx]
    except (ValueError, IndexError):
        category = cat_input if cat_input else "General"

    print(f"\n--- Confirm ---")
    print(f"  Brand:       {brand}")
    print(f"  Salt:        {salt}")
    print(f"  Strength:    {strength}")
    print(f"  Pack:        {pack_size}")
    print(f"  MRP:         ₹{mrp:.2f}")
    print(f"  Manufacturer: {manufacturer}")
    print(f"  Category:    {category}")

    confirm = input("\nAdd this medicine? (Y/n): ").strip().lower()
    if confirm == "n":
        print("Cancelled.")
        return

    add_medicine(brand, salt, strength, pack_size, mrp, manufacturer, category)


def bulk_mode(csv_path):
    """Add multiple medicines from a CSV file."""
    csv_path = Path(csv_path)
    if not csv_path.exists():
        print(f"❌ File not found: {csv_path}")
        return

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        print("❌ CSV is empty.")
        return

    print(f"📥 Importing {len(rows)} medicines from {csv_path}...")
    success = 0
    for row in rows:
        brand = (row.get("brand_name") or "").strip()
        salt = (row.get("salt") or "").strip()
        strength = (row.get("strength") or "").strip()
        try:
            mrp = float(row.get("market_mrp") or 0)
        except ValueError:
            mrp = 0
        manufacturer = (row.get("manufacturer") or "").strip()
        category = (row.get("category") or "General").strip()

        if brand and salt:
            # Write directly to CSV without rebuilding each time
            with open(CSV_PATH, "a", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([brand, salt, strength, strength, mrp, manufacturer, category])
            success += 1

    print(f"  Added {success} medicines to {CSV_PATH}")
    if success:
        rebuild()


def show_help():
    print(__doc__)


if __name__ == "__main__":
    args = sys.argv[1:]

    if not args:
        interactive_mode()
    elif args[0] == "--help" or args[0] == "-h":
        show_help()
    elif args[0] == "--bulk" and len(args) >= 2:
        bulk_mode(args[1])
    elif args[0] == "--rebuild":
        rebuild()
    elif len(args) >= 5:
        # Positional: brand, salt, strength, pack_size, mrp, [manufacturer], [category]
        brand = args[0]
        salt = args[1]
        strength = args[2]
        pack_size = args[3]
        mrp = args[4]
        manufacturer = args[5] if len(args) > 5 else ""
        category = args[6] if len(args) > 6 else "General"
        add_medicine(brand, salt, strength, pack_size, mrp, manufacturer, category)
    else:
        print("❌ Invalid arguments. Use --help for usage.")
        sys.exit(1)
