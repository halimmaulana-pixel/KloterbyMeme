export default function MemberTopbar({ title = "Dashboard", subtitle = "" }) {
  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="topbar">
      <div className="tb-title">
        {title}
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="tb-actions">
        <div className="tb-btn">
          🔔
          <div className="tb-notif-dot" />
        </div>
        <div className="tb-date">{dateStr}</div>
      </div>
    </div>
  );
}
