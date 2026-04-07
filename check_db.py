
import sqlite3
import uuid

def check_db():
    conn = sqlite3.connect('backend/kloterby.db')
    cursor = conn.cursor()
    
    print("--- MEMBERS ---")
    cursor.execute("SELECT id, name, wa, tenant_id FROM members")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- KLOTERS ---")
    cursor.execute("SELECT id, name, status, tenant_id FROM kloters")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- MEMBERSHIPS ---")
    cursor.execute("SELECT id, member_id, kloter_id, slot_number FROM memberships")
    for row in cursor.fetchall():
        print(row)

    print("\n--- PERIODS ---")
    cursor.execute("SELECT id, kloter_id, period_number, status FROM periods")
    for row in cursor.fetchall():
        print(row)

    conn.close()

if __name__ == "__main__":
    check_db()
