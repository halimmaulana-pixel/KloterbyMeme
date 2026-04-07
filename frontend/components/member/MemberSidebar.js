import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { clearSession } from "../../lib/auth";

export default function MemberSidebar() {
  const router = useRouter();
  const isActive = (p) => router.pathname === p;
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("kloterby_member_name");
    if (name) setMemberName(name);
  }, []);

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem("kloterby_member_name");
    router.push("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sb-top">
        <div className="sb-logo">
          <div className="sb-logomark">🏦</div>
          <div className="sb-logoname"><b>K</b>loterby<span className="sb-logodot">.</span></div>
        </div>
        <div className="sb-profile">
          <div className="sb-avatar">👩</div>
          <div className="sb-user">
            <div className="sb-name">{memberName || "Anggota Kloter"}</div>
            <div className="sb-role">⭐ Member <span className="sb-badge">Aktif</span></div>
          </div>
        </div>
      </div>

      <nav className="sb-nav">
        <div className="sb-section">Menu Utama</div>
        <Link href="/member/home" className={`sb-item${isActive("/member/home") ? " active" : ""}`}>
          <span className="sb-icon">🏠</span>
          <span className="sb-label">Dashboard</span>
        </Link>
        <Link href="/member/upload" className={`sb-item${isActive("/member/upload") ? " active" : ""}`}>
          <span className="sb-icon">💸</span>
          <span className="sb-label">Verifikasi & Bayar</span>
          <span className="sb-pill">!</span>
        </Link>

        <div className="sb-section">Lainnya</div>
        <div className="sb-item" style={{ opacity: 0.5, cursor: "not-allowed" }}>
          <span className="sb-icon">🎯</span>
          <span className="sb-label">Giliran GET</span>
          <span className="sb-pill amber">Soon</span>
        </div>
        <div className="sb-item" style={{ opacity: 0.5, cursor: "not-allowed" }}>
          <span className="sb-icon">🔔</span>
          <span className="sb-label">Notifikasi</span>
        </div>
      </nav>

      <div className="sb-bot">
        <div className="sb-logout" onClick={handleLogout}>
          <span className="sb-icon">🚪</span>
          <span className="sb-label">Keluar</span>
        </div>
      </div>
    </aside>
  );
}
