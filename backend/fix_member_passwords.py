import os
import uuid
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
    # Get all members with NULL password
    res = conn.execute(text("SELECT id, wa, name FROM members WHERE password_hash IS NULL AND registration_type = 'admin'"))
    members = res.fetchall()
    
    print(f"Found {len(members)} members needing password update.")
    
    count = 0
    for m_id, wa, name in members:
        # Generate hash from the WA number (the "initial password")
        password_hash = bcrypt.hash(wa)
        
        try:
            conn.execute(
                text("UPDATE members SET password_hash = :pw WHERE id = :id"),
                {"pw": password_hash, "id": m_id}
            )
            count += 1
            if count % 10 == 0:
                print(f"Updated {count} members...")
        except Exception as e:
            print(f"Error updating {name}: {e}")
            
    conn.commit()
    print(f"Success! Updated password for {count} members.")
    
    # Show one example for user to test
    if members:
        example = members[0]
        print("\n--- TEST ACCOUNT ---")
        print(f"Name: {example[2]}")
        print(f"WhatsApp: {example[1]}")
        print(f"Password: {example[1]}")
        print("--------------------")
