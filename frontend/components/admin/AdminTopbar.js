import Link from "next/link";

export default function AdminTopbar({ title = "Dashboard" }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
        <div className="avatar-nav" title="Admin Meme">MM</div>
      </div>
    </div>
  );
}
