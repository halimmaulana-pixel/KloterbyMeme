// tone: "purple" | "green" | "orange" | "red"
// maps to CSS classes c1, c2, c3, c4
const toneMap = {
  purple: "c1",
  green: "c2",
  orange: "c3",
  red: "c4",
};

const valColorMap = {
  purple: "p",
  green: "g",
  orange: "o",
  red: "r",
};

const trendMap = {
  purple: "",
  green: "up",
  orange: "warn",
  red: "bad",
};

export default function StatCard({ emoji, value, label, trend, tone = "purple" }) {
  return (
    <div className={`stat-card ${toneMap[tone] || "c1"}`}>
      <div className="stat-emoji">{emoji}</div>
      <div className={`stat-val ${valColorMap[tone] || "p"}`}>{value}</div>
      <div className="stat-label">{label}</div>
      {trend && (
        <div className={`stat-trend ${trendMap[tone] || ""}`}>{trend}</div>
      )}
    </div>
  );
}
