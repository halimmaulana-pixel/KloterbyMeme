
import sqlite3

def check_rina():
    conn = sqlite3.connect('backend/kloterby.db')
    cursor = conn.cursor()
    
    print("--- DATA RINA CAHYANI ---")
    cursor.execute("SELECT id, name, wa FROM members WHERE name LIKE '%Rina%'")
    rina = cursor.fetchone()
    if not rina:
        print("Rina tidak ditemukan")
        return
    rina_id = rina[0]
    print(f"ID: {rina_id}, Name: {rina[1]}, WA: {rina[2]}")

    print("\n--- KEANGGOTAAN RINA (MEMBERSHIPS) ---")
    cursor.execute("""
        SELECT ms.id, k.name, ms.slot_number, k.id 
        FROM memberships ms 
        JOIN kloters k ON ms.kloter_id = k.id 
        WHERE ms.member_id = ?
    """, (rina_id,))
    rows = cursor.fetchall()
    for row in rows:
        print(row)
        
    if len(rows) > 1:
        print(f"\n⚠️ PERINGATAN: Rina terdaftar di {len(rows)} slot/kloter!")
    
    conn.close()

if __name__ == "__main__":
    check_rina()
