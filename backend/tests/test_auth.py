from app.api.deps import CurrentAdmin, CurrentMember, get_current_admin, get_current_member
from app.core.security import create_access_token


def test_get_current_admin_from_bearer_token():
    token = create_access_token("admin-1", "admin", "tenant-1")
    admin = get_current_admin(authorization=f"Bearer {token}")
    assert isinstance(admin, CurrentAdmin)
    assert admin.id == "admin-1"
    assert admin.tenant_id == "tenant-1"
    assert admin.role == "admin"


def test_get_current_member_from_bearer_token():
    token = create_access_token("member-1", "member", "tenant-1")
    member = get_current_member(authorization=f"Bearer {token}")
    assert isinstance(member, CurrentMember)
    assert member.id == "member-1"
    assert member.tenant_id == "tenant-1"
