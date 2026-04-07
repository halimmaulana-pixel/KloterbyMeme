import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { clearSession } from "../../lib/auth";

export default function AdminTopbar({ title = "Dashboard" }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  return (
    <div className="topnav">
      <Link href="/admin/dashboard" className="brand-nav">
        <div className="brand-icon-sm">🪙</div>
        <div className="brand-text">
          <span className="k">Kloter</span>
          <span className="by">by</span>{" "}
          <span className="me">Meme</span>
        </div>
      </Link>

      <div className="nav-center">
        <div className="nav-breadcrumb">Admin</div>
        <div className="nav-breadcrumb active">{title}</div>
      </div>

      <div className="nav-right">
        <div className="nav-date">{dateStr}</div>
        <div className="notif-btn">
          🔔
          <div className="notif-badge">3</div>
        </div>
        
        <div className="avatar-wrap" ref={menuRef} style={{ position: "relative" }}>
          <div 
            className="avatar-nav" 
            onClick={() => setShowMenu(!showMenu)} 
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            MM
          </div>

          {showMenu && (
            <div className="avatar-dropdown">
              <div className="ad-header">
                <div className="ad-name">Admin Meme</div>
                <div className="ad-role">Super Admin</div>
              </div>
              <div className="ad-divider" />
              <Link href="/admin/profile" className="ad-item" onClick={() => setShowMenu(false)}>
                <span className="ad-emoji">👤</span> Profil Saya
              </Link>
              <Link href="/admin/users" className="ad-item" onClick={() => setShowMenu(false)}>
                <span className="ad-emoji">🔐</span> Kelola Admin
              </Link>
              <div className="ad-divider" />
              <div className="ad-item logout" onClick={handleLogout}>
                <span className="ad-emoji">🚪</span> Keluar
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
