"""
Inspect Database Script
Run anytime via: python database/inspect_db.py
Shows all tables, column counts, total records, and recent sample data.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "insurance_platform.db")

def inspect():
    if not os.path.exists(DB_PATH):
        print(f"[!] Database file not found at: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("=" * 70)
    print(f" SECUREWHEELS AI - DATABASE INSPECTION REPORT")
    print(f" SQLite File Path: {os.path.abspath(DB_PATH)}")
    print(f" File Size: {os.path.getsize(DB_PATH) / 1024:.2f} KB")
    print("=" * 70)

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row["name"] for row in cursor.fetchall() if not row["name"].startswith("sqlite_")]

    print(f"\nTotal Registered Tables: {len(tables)}\n")
    print(f"{'#':<4} {'Table Name':<25} {'Columns':<10} {'Total Records':<15}")
    print("-" * 60)

    for i, table in enumerate(tables, 1):
        cursor.execute(f"PRAGMA table_info({table})")
        cols = cursor.fetchall()
        cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
        count = cursor.fetchone()["count"]
        print(f"{i:<4} {table:<25} {len(cols):<10} {count:<15}")

    print("\n" + "=" * 70)
    print(" SAMPLE RECORDS PREVIEW")
    print("=" * 70)

    # Preview sample from core tables
    for sample_table in ["users", "policies", "claims", "products"]:
        if sample_table in tables:
            print(f"\n--- [Table: {sample_table}] (Latest 2 records) ---")
            cursor.execute(f"SELECT * FROM {sample_table} LIMIT 2")
            rows = cursor.fetchall()
            if rows:
                col_names = [d[0] for d in cursor.description]
                for r in rows:
                    record_dict = {col: r[col] for col in col_names[:6]}  # First 6 columns for brevity
                    print("  ", record_dict)
            else:
                print("   (Table is currently empty)")

    print("\n" + "=" * 70)
    conn.close()

if __name__ == "__main__":
    inspect()
