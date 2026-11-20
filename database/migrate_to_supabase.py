import os
import sys
import sqlite3
import json

def migrate_sqlite_to_supabase(supabase_conn_str: str = None):
    """
    Reads all existing records from SQLite and syncs them to Supabase PostgreSQL.
    """
    if not supabase_conn_str:
        supabase_conn_str = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    
    if not supabase_conn_str:
        print("=================================================================")
        print("   SUPABASE MIGRATION UTILITY")
        print("=================================================================")
        print("Notice: No SUPABASE_DB_URL or DATABASE_URL found in environment.")
        print("\nTo migrate to Supabase:")
        print("1. Create a project on https://supabase.com")
        print("2. Run the SQL schema from 'database/supabase_migration.sql' in the Supabase SQL Editor.")
        print("3. Set your connection string in environment or run:")
        print("   python database/migrate_to_supabase.py 'postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres'")
        print("=================================================================\n")
        return

    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("Error: psycopg2 is required for Supabase migration. Run: pip install psycopg2-binary")
        return

    sqlite_path = os.path.join(os.path.dirname(__file__), "insurance_platform.db")
    if not os.path.exists(sqlite_path):
        print("Error: Local SQLite database not found at:", sqlite_path)
        return

    print("Connecting to local SQLite and target Supabase PostgreSQL...")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    s_cur = sqlite_conn.cursor()

    pg_conn = psycopg2.connect(supabase_conn_str)
    pg_cur = pg_conn.cursor()

    tables = ["users", "vehicles", "policies", "otps", "claims", "model_predictions", "claim_decisions", "audit_logs", "products"]

    for table in tables:
        s_cur.execute(f"SELECT * FROM {table}")
        rows = s_cur.fetchall()
        print(f"Migrating {len(rows)} records for table: {table}...")
        if not rows:
            continue

        cols = rows[0].keys()
        cols_str = ", ".join(cols)
        placeholders = ", ".join(["%s"] * len(cols))
        
        insert_sql = f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"
        
        records = []
        for r in rows:
            row_dict = dict(r)
            record = [json.dumps(row_dict[c]) if isinstance(row_dict[c], (dict, list)) else row_dict[c] for c in cols]
            records.append(record)

        psycopg2.extras.execute_batch(pg_cur, insert_sql, records)
        pg_conn.commit()

    pg_cur.close()
    pg_conn.close()
    sqlite_conn.close()
    print("\nSuccessfully synced all local records into Supabase PostgreSQL!")

if __name__ == "__main__":
    url_arg = sys.argv[1] if len(sys.argv) > 1 else None
    migrate_sqlite_to_supabase(url_arg)
