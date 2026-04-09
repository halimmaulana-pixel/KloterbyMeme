import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from passlib.hash import bcrypt

# Load env from backend/.env
load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # 1. Update the 'wa' numbers from 08... to 628...
    print("Updating WhatsApp numbers to 628... format...")
    conn.execute(text("UPDATE members SET wa = '62' || SUBSTRING(wa, 2) WHERE wa LIKE '08%' AND registration_type = 'admin'"))
    conn.commit()
    
    # 2. Re-hash passwords with the new '628...' format to match the UI tip
    print("Re-hashing passwords for 50 members...")
    res = conn.execute(text("SELECT id, wa FROM members WHERE registration_type = 'admin'"))
    members = res.fetchall()
    
    for m_id, wa in members:
        pw_hash = bcrypt.hash(wa)
        conn.execute(
            text("UPDATE members SET password_hash = :pw WHERE id = :id"),
            {"pw": pw_hash, "id": m_id}
        )
    
    conn.commit()
    print("Success! Numbers and passwords updated.")
    
    # Get the sample for testing
    res = conn.execute(text("SELECT name, wa FROM members WHERE wa LIKE '6281261413727%' LIMIT 1"))
    sample = res.fetchone()
    if sample:
        print("\n--- TEST ACCOUNT (UPDATED) ---")
        print(f"Name: {sample[0]}")
        print(f"WhatsApp: {sample[1]}")
        print(f"Password: {sample[1]}")
        print("------------------------------")
