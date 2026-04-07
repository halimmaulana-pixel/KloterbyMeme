import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/admin/AdminLayout";
import StatCard from "../../../components/admin/StatCard";
import api from "../../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const FALLBACK = [
  { id: "k254", name: "Kloter 254", type: "bulanan",  slot_total: 10, contribution: 1000000, status: "active",  created_at: "2026-04-01T10:00:00Z", progress: 80,  filled_slots: 8, issue: null },
  { id: "k401", name: "Kloter 401", type: "mingguan", slot_total: 5,  contribution: 750000,  status: "active",  created_at: "2026-04-02T09:00:00Z", progress: 100, filled_slots: 5, issue: "ready_get" },
  { id: "k888", name: "Kloter 888", type: "harian",   slot_total: 14, contribution: 500000,  status: "problem", created_at: "2026-04-03T14:00:00Z", progress: 64,  filled_slots: 9, issue: "late_members" },
];

function statusLabel(item) {
  if (item.status === "problem") return "Masalah";
  if (item.issue === "ready_get") return "Siap GET";
  return "Aktif";
}

export default function AdminKloterList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/kloter").then((r) => {
      if (alive && Array.isArray(r.data)) setItems(r.data);
    }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => items.filter((x) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || `${x.name} ${x.type} ${x.status}`.toLowerCase().includes(q);
    const matchFilter =
      filter === "all" ? true :
      filter === "problem" ? x.status === "problem" :
      filter === "ready_get" ? x.issue === "ready_get" : true;
    const matchType = !typeFilter || x.type === typeFilter;
    return matchSearch && matchFilter && matchType;
  }), [items, filter, typeFilter, search]);

  const stats = [
    { emoji: "💰", value: items.length,                                            label: "Total Kloter",  trend: "semua batch",    tone: "purple" },
    { emoji: "✅", value: items.filter((x) => x.status === "active").length,       label: "Aktif",         trend: "berjalan",       tone: "green" },
    { emoji: "🎉", value: items.filter((x) => x.issue === "ready_get").length,     label: "Siap GET",      trend: "siap diproses",  tone: "orange" },
    { emoji: "🚨", value: items.filter((x) => x.status === "problem").length,      label: "Perlu Atensi",  trend: "problem path",   tone: "red" },
  ];

  // Table row color for progress bar
  const fillColor = (item) => {
    if (item.status === "problem") return "var(--r)";
    if (item.issue === "ready_get") return "var(--g)";
    return "var(--p)";
  };

  return (
    <AdminLayout title="Semua Kloter">
      <div className="page-title">💰 Semua Kloter</div>
      <div className="page-sub">Kelola dan pantau semua kloter aktif — klik baris untuk detail</div>

      {/* Stats */}
      <div className="stat-grid">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Toolbar */}
      <div className="kloter-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Cari nama kloter..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Semua tipe</option>
          <option value="harian">Harian</option>
          <option value="mingguan">Mingguan</option>
          <option value="bulanan">Bulanan</option>
        </select>
        <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Semua status</option>
          <option value="ready_get">Siap GET</option>
          <option value="problem">Masalah</option>
        </select>
        <Link href="/admin/kloter/new" className="btn primary">➕ Kloter Baru</Link>
      </div>

      {/* Table */}
      <div className="kloter-table">
        <div className="tbl-head">
          <span>#</span>
          <span>Nama Kloter</span>
          <span>Tipe</span>
          <span>Iuran</span>
          <span>Slot</span>
          <span>Terisi</span>
          <span>Status</span>
          <span>Progress</span>
        </div>
        <div className="tbl-body">
          {loading && (
            <div style={{ padding: "20px 14px", color: "var(--t3)", fontSize: 12 }}>Memuat kloter…</div>
          )}
          {filtered.map((item, i) => (
            <Link href={`/admin/kloter/${item.id}`} className="tbl-row" key={item.id}>
              <span className="cell muted">{i + 1}</span>
              <span className="cell bold">{item.name}</span>
              <span className="cell">{item.type}</span>
              <span className="cell mono">{fmtRp(item.contribution)}</span>
              <span className="cell">{item.slot_total}</span>
              <span className="cell">{item.filled_slots}/{item.slot_total}</span>
              <span className="cell">
                <span className={`pill ${item.status === "problem" ? "telat" : item.issue === "ready_get" ? "lunas" : "aktif"}`}>
                  {statusLabel(item)}
                </span>
              </span>
              <span className="cell">
                <span className="pbar-wrap">
                  <span className="pbar-fill" style={{ width: `${item.progress}%`, background: fillColor(item) }} />
                </span>
                <span className="muted" style={{ marginLeft: 6, fontSize: 10, color: "var(--t3)" }}>{item.progress}%</span>
              </span>
            </Link>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "40px 14px", textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
              Tidak ada kloter yang cocok dengan filter
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
