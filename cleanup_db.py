
import sqlite3

def cleanup_db():
    conn = sqlite3.connect('backend/kloterby.db')
    cursor = conn.cursor()
    
    # 1. Get the ID of "Kloter 1"
    cursor.execute("SELECT id FROM kloters WHERE name = 'Kloter 1' LIMIT 1")
    kloter = cursor.fetchone()
    if not kloter:
        print("Kloter 1 tidak ditemukan. Membatalkan penghapusan.")
        conn.close()
        return
    
    kloter_id = kloter[0]
    print(f"Menyimpan Kloter 1 (ID: {kloter_id})")

    # 2. Get Member IDs in Kloter 1
    cursor.execute("SELECT member_id FROM memberships WHERE kloter_id = ?", (kloter_id,))
    member_ids = [row[0] for row in cursor.fetchall()]
    print(f"Menyimpan {len(member_ids)} member yang ada di Kloter 1")

    # 3. Start deleting other data
    # Delete from Payment Attempts (indirectly linked)
    cursor.execute("""
        DELETE FROM payment_attempts 
        WHERE expectation_id NOT IN (
            SELECT id FROM payment_expectations WHERE membership_id IN (
                SELECT id FROM memberships WHERE kloter_id = ?
            )
        )
    """, (kloter_id,))
    
    # Delete from Payment Expectations
    cursor.execute("""
        DELETE FROM payment_expectations 
        WHERE membership_id NOT IN (
            SELECT id FROM memberships WHERE kloter_id = ?
        )
    """, (kloter_id,))

    # Delete Period Progress
    cursor.execute("""
        DELETE FROM period_progress 
        WHERE period_id NOT IN (
            SELECT id FROM periods WHERE kloter_id = ?
        )
    """, (kloter_id,))

    # Delete Periods
    cursor.execute("DELETE FROM periods WHERE kloter_id != ?", (kloter_id,))

    # Delete Memberships
    cursor.execute("DELETE FROM memberships WHERE kloter_id != ?", (kloter_id,))

    # Delete Kloters
    cursor.execute("DELETE FROM kloters WHERE id != ?", (kloter_id,))

    # Delete Members who are NOT in Kloter 1
    # We use a placeholder string for the IN clause
    placeholders = ','.join(['?'] * len(member_ids))
    cursor.execute(f"DELETE FROM members WHERE id NOT IN ({placeholders})", member_ids)

    # Delete other unrelated tables
    cursor.execute("DELETE FROM disbursements")
    cursor.execute("DELETE FROM audit_logs")
    # We keep tenants and admin_users as they are needed for login

    conn.commit()
    print("Database berhasil dibersihkan. Hanya menyisakan Kloter 1.")
    conn.close()

if __name__ == "__main__":
    cleanup_db()
