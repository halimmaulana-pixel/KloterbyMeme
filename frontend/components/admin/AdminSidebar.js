import Link from "next/link";
import { useRouter } from "next/router";
import { clearSession } from "../../lib/auth";

export default function AdminSidebar() {
  const router = useRouter();
  const path = router.pathname;

  const isActive = (href) => path === href || path.startsWith(href + "/");

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <div className="sidebar">
      <div className="sid-greeting">
        <div className="sid-avatar">👑</div>
        <div className="sid-name">Admin Meme</div>
        <div className="sid-role">Super Admin</div>
      </div>

      <div className="sid-section">
        <div className="sid-label">MENU UTAMA</div>
        <Link href="/admin/dashboard" className={`sid-item${isActive("/admin/dashboard") ? " active" : ""}`}>
          <span className="sid-emoji">🏠</span> Dashboard
        </Link>
        <Link href="/admin/kloter" className={`sid-item${isActive("/admin/kloter") ? " active" : ""}`}>
          <span className="sid-emoji">💰</span> Semua Kloter
        </Link>
        <Link href="/admin/payments" className={`sid-item${isActive("/admin/payments") ? " active" : ""}`}>
          <span className="sid-emoji">✅</span> Verifikasi
          <span className="sid-badge red">!</span>
        </Link>
        <Link href="/admin/disbursements" className={`sid-item${isActive("/admin/disbursements") ? " active" : ""}`}>
          <span className="sid-emoji">🎉</span> Disbursement
        </Link>
      </div>

      <div className="sid-section">
        <div className="sid-label">MANAJEMEN</div>
        <Link href="/admin/members" className={`sid-item${isActive("/admin/members") ? " active" : ""}`}>
          <span className="sid-emoji">👥</span> Member
        </Link>
        <Link href="/admin/kloter/new" className={`sid-item${isActive("/admin/kloter/new") ? " active" : ""}`}>
          <span className="sid-emoji">✨</span> Buat Kloter
        </Link>
        <Link href="/admin/bank" className={`sid-item${isActive("/admin/bank") ? " active" : ""}`}>
          <span className="sid-emoji">🏦</span> Akun Bank
        </Link>
        <Link href="/admin/reports" className={`sid-item${isActive("/admin/reports") ? " active" : ""}`}>
          <span className="sid-emoji">📊</span> Laporan Keuangan
        </Link>
        <Link href="/admin/member-quality" className={`sid-item${isActive("/admin/member-quality") ? " active" : ""}`}>
          <span className="sid-emoji">⭐</span> Kualitas Member
        </Link>
        <Link href="/admin/users" className={`sid-item${isActive("/admin/users") ? " active" : ""}`}>
          <span className="sid-emoji">🔐</span> Kelola Admin
        </Link>
      </div>

      <div className="sid-section sid-footer">
        <div className="sid-label">LAINNYA</div>
        <Link href="/admin/profile" className={`sid-item${isActive("/admin/profile") ? " active" : ""}`}>
          <span className="sid-emoji">👤</span> Profil Saya
        </Link>
        <div className="sid-item" onClick={handleLogout} style={{ cursor: "pointer" }}>
          <span className="sid-emoji">🚪</span> Keluar
        </div>
      </div>
    </div>
  );
}
