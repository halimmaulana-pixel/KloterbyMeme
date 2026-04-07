from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin, CurrentAdmin
from app.core.security import hash_password
from app.models.admin import AdminUser
from app.repositories.admin_repo import AdminRepository
from app.schemas.auth import TokenResponse # Using existing schema or create new ones

router = APIRouter()

@router.get("/me")
def get_my_profile(current_admin: CurrentAdmin = Depends(get_current_admin), db: Session = Depends(get_db)):
    admin = AdminRepository(db).get(current_admin.id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return {
        "id": str(admin.id),
        "name": admin.name,
        "email": admin.email,
        "role": admin.role,
        "tenant_id": str(admin.tenant_id)
    }

@router.put("/me")
def update_my_profile(
    payload: dict, 
    current_admin: CurrentAdmin = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    admin = db.query(AdminUser).filter(AdminUser.id == current_admin.id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if "name" in payload:
        admin.name = payload["name"]
    if "email" in payload:
        # Check if email taken
        exists = db.query(AdminUser).filter(AdminUser.email == payload["email"], AdminUser.id != admin.id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already used by another admin")
        admin.email = payload["email"]
    if "password" in payload and payload["password"]:
        admin.password_hash = hash_password(payload["password"])
        
    db.commit()
    return {"message": "Profile updated successfully"}

@router.get("/list")
def list_admins(current_admin: CurrentAdmin = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Only owner can see other admins (optional policy)
    admins = db.query(AdminUser).filter(AdminUser.tenant_id == current_admin.tenant_id).all()
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "email": a.email,
            "role": a.role,
            "created_at": a.created_at
        } for a in admins
    ]

@router.post("/create")
def create_new_admin(
    payload: dict,
    current_admin: CurrentAdmin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Only owner can create new admins
    if current_admin.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can create new admins")
    
    # Check if email exists
    exists = AdminRepository(db).get_by_email(payload["email"])
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_admin = AdminUser(
        tenant_id=current_admin.tenant_id,
        name=payload["name"],
        email=payload["email"],
        password_hash=hash_password(payload["password"]),
        role=payload.get("role", "admin")
    )
    db.add(new_admin)
    db.commit()
    return {"message": "New admin created successfully"}
