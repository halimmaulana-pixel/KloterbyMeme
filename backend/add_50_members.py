import uuid
import random
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv('.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

first_names = ["Budi", "Siti", "Agus", "Dewi", "Eko", "Ani", "Joko", "Sari", "Rudi", "Maya", "Hadi", "Indah", "Asep", "Lestari", "Dedi", "Rina", "Bambang", "Ratna", "Surya", "Wati"]
last_names = ["Santoso", "Lestari", "Wijaya", "Putri", "Hidayat", "Sari", "Kurniawan", "Astuti", "Susanto", "Wahyuni", "Prabowo", "Rahmawati", "Siregar", "Utami", "Gunawan", "Yuliana"]

def generate_wa():
    return "0812" + "".join([str(random.randint(0, 9)) for _ in range(8)])

def generate_nik():
    return "".join([str(random.randint(0, 9)) for _ in range(16)])

with engine.connect() as conn:
    # 1. Get Tenant ID
    res = conn.execute(text("SELECT id FROM tenants LIMIT 1"))
    tenant_id_row = res.fetchone()
    
    if not tenant_id_row:
        print("Error: No tenant found in database.")
        exit(1)
    
    tenant_id = tenant_id_row[0]
    print(f"Adding 50 members to Tenant: {tenant_id}")
    
    # 2. Insert 50 Members
    count = 0
    for _ in range(50):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        wa = generate_wa()
        nik = generate_nik()
        # Remove hyphens to fit VARCHAR(32) if necessary
        member_id = uuid.uuid4().hex 
        
        try:
            conn.execute(
                text("""
                INSERT INTO members (id, tenant_id, name, wa, nik, status, registration_type, reputation_score, created_at)
                VALUES (:id, :tenant_id, :name, :wa, :nik, 'active', 'admin', 1.0, NOW())
                """),
                {
                    "id": member_id,
                    "tenant_id": tenant_id.hex if hasattr(tenant_id, 'hex') else str(tenant_id).replace('-', ''),
                    "name": name,
                    "wa": wa,
                    "nik": nik
                }
            )
            conn.commit()
            count += 1
        except Exception as e:
            conn.rollback()
            print(f"Error adding {name}: {e}")
            continue
            
    print(f"Success! Added {count} members to database.")
