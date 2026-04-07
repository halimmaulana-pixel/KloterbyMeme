from app.models.audit import AuditLog


class AuditService:
    def log(
        self,
        db,
        tenant_id,
        action: str,
        resource_type: str,
        resource_id,
        actor_admin_id=None,
        meta: dict | None = None,
        note: str | None = None,
    ):
        entry = AuditLog(
            tenant_id=tenant_id,
            actor_admin_id=actor_admin_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            meta=meta or {},
            note=note,
        )
        db.add(entry)
        db.flush()
        return entry
