
import sqlite3

def check_expectations():
    conn = sqlite3.connect('backend/kloterby.db')
    cursor = conn.cursor()
    
    # Rina's ID from previous check
    rina_id = 'b21c03b67bd64e998359457bf8e75999'
    
    print("--- EXPECTATIONS FOR RINA ---")
    cursor.execute("""
        SELECT e.id, k.name, p.period_number, e.status
        FROM payment_expectations e
        JOIN memberships ms ON e.membership_id = ms.id
        JOIN kloters k ON ms.kloter_id = k.id
        JOIN periods p ON e.period_id = p.id
        WHERE ms.member_id = ? AND p.status IN ('collecting', 'verifying', 'ready_get')
    """, (rina_id,))
    
    rows = cursor.fetchall()
    for row in rows:
        print(row)
        
    conn.close()

if __name__ == "__main__":
    check_expectations()
