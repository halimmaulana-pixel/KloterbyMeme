import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatCard from "../../components/admin/StatCard";
import PaymentDetailModal from "../../components/admin/PaymentDetailModal";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const avatarTone = { proof_uploaded: "orange", manual_review: "purple", late: "red", verified: "green" };

const VerificationCard = ({ item, isSelected, onToggle, onClick, onApprove, onReject, isBusyGlobal }) => {
  const [localBusy, setLocalBusy] = useState(false);
  const tone = avatarTone[item.status] || "purple";
  const busy = localBusy || isBusyGlobal;

  const handleAction = async (e, action) => {
    e.stopPropagation();
    setLocalBusy(true);
    try {
      await (action === "approve" ? onApprove(item.id) : onReject(item.id));
    } catch (err) {
      alert(`Gagal memproses: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className={`verif-card${isSelected ? " approved" : ""}`} onClick={() => onClick(item)} style={{ cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
      <input 
        type="checkbox" 
        checked={isSelected} 
        onChange={(e) => { e.stopPropagation(); onToggle(item.id); }} 
        style={{ width: 16, height: 16, accentColor: "var(--p)", flexShrink: 0 }} 
      />
      <div className={`vc-avatar ${tone}`}>{item.member_name.slice(0, 2).toUpperCase()}</div>
      <div className="vc-info">
        <div className="vc-name">{item.member_name}</div>
        <div className="vc-meta">{item.kloter_name} · Periode {item.period_number} · Kode {item.unique_code}</div>
        <div className="vc-time">Jatuh tempo: {new Date(item.due_datetime).toLocaleString("id-ID")}</div>
      </div>
      <div className="vc-amt">{fmtRp(item.expected_amount)}</div>
      <div title={item.proof_url ? "Ada bukti" : "Belum ada bukti"} style={{ fontSize: 18, opacity: item.proof_url ? 1 : 0.3 }}>
        {item.proof_url ? "🖼️" : "🧾"}
      </div>
      <div className="vc-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn green" disabled={busy} onClick={(e) => handleAction(e, "approve")} style={{ padding: "6px 12px", fontSize: 11 }}>
          {busy ? "…" : "✓ Approve"}
        </button>
        <button className="btn red" disabled={busy} onClick={(e) => handleAction(e, "reject")} style={{ padding: "6px 12px", fontSize: 11 }}>
          ✕ Reject
        </button>
      </div>
    </div>
  );
};

export default function AdminPayments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api.get("/payments/queue").then((r) => {
        if (alive && Array.isArray(r.data)) {
          setItems(r.data);
          setLastUpdated(new Date());
        }
      }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  const filtered = useMemo(() => items.filter((x) => {
    if (filter !== "all" && x.status !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || `${x.member_name} ${x.kloter_name} ${x.status}`.toLowerCase().includes(q);
  }), [items, filter, search]);

  const refresh = async () => {
    const r = await api.get("/payments/queue").catch(() => null);
    if (Array.isArray(r?.data)) setItems(r.data);
  };

  const handleApprove = async (id) => {
    await api.post(`/payments/${id}/verify`);
    await refresh();
    setSelected((p) => p.filter((x) => x !== id));
    setModalItem(null);
  };

  const handleReject = async (id) => {
    await api.post(`/payments/${id}/reject`, { note: "Rejected from admin portal" });
    await refresh();
    setSelected((p) => p.filter((x) => x !== id));
    setModalItem(null);
  };

  const bulkVerify = async () => {
    if (!selected.length) return;
    try { 
      await api.post("/payments/bulk-verify", { ids: selected }); 
      await refresh(); 
      setSelected([]); 
    } catch (err) {
      alert("Gagal bulk verify: " + err.message);
    }
  };

  const toggleAll = (e) => setSelected(e.target.checked ? filtered.map((x) => x.id) : []);
  const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const stats = [
    { emoji: "📥", value: filtered.length,      label: "Queue Aktif",    trend: "siap dibuka",    tone: "orange" },
    { emoji: "🟣", value: items.filter((x) => x.status === "manual_review").length, label: "Manual Review", trend: "butuh keputusan", tone: "purple" },
    { emoji: "🔴", value: items.filter((x) => x.status === "late").length,          label: "Telat Bayar",   trend: "eskalasi cepat", tone: "red" },
    { emoji: "☑️", value: selected.length,       label: "Terpilih Bulk",  trend: "bulk verify",    tone: "green" },
  ];

  const filterChips = [
    { id: "all",           label: "Semua",          count: items.length },
    { id: "proof_uploaded",label: "Proof Uploaded",  count: items.filter((x) => x.status === "proof_uploaded").length },
    { id: "manual_review", label: "Manual Review",   count: items.filter((x) => x.status === "manual_review").length },
    { id: "late",          label: "Telat",           count: items.filter((x) => x.status === "late").length },
  ];

  return (
    <AdminLayout title="Verifikasi">
      <div className="page-title">✅ Verifikasi Pembayaran</div>
      <div className="page-sub">Approve atau tolak bukti transfer anggota — 1 klik beres!</div>

      <div className="stat-grid">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="filter-chips">
        {filterChips.map((c) => (
          <div key={c.id} className={`fc-chip${filter === c.id ? " active" : ""}`} onClick={() => setFilter(c.id)}>
            {c.label} ({c.count})
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span>🔄 Auto-refresh setiap 15 detik</span>
        {lastUpdated && <span>· Terakhir: {lastUpdated.toLocaleTimeString("id-ID")}</span>}
        <button onClick={refresh} style={{ marginLeft: 4, fontSize: 11, background: "none", border: "1px solid var(--b)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", color: "var(--t2)" }}>
          Refresh sekarang
        </button>
      </div>

      <div className="select-bar">
        <input type="checkbox" id="sel-all" onChange={toggleAll} checked={selected.length === filtered.length && filtered.length > 0} />
        <label htmlFor="sel-all">Pilih semua</label>
        <span className="sel-count">{selected.length} dipilih</span>
        <div className="search-box" style={{ marginLeft: "auto", maxWidth: 240 }}>
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Cari nama, kloter…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selected.length > 0 && (
          <button className="btn green" onClick={bulkVerify} style={{ marginLeft: 8 }}>
            Bulk Verify ({selected.length})
          </button>
        )}
      </div>

      <div className="verif-list">
        {loading && <div style={{ padding: 20, color: "var(--t3)", fontSize: 13 }}>Memuat antrian…</div>}
        {filtered.map((item) => (
          <VerificationCard
            key={item.id}
            item={item}
            isSelected={selected.includes(item.id)}
            onToggle={toggle}
            onClick={setModalItem}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--t3)", fontSize: 13 }}>
            🎉 Tidak ada item yang perlu diverifikasi
          </div>
        )}
      </div>
      <PaymentDetailModal
        item={modalItem}
        onClose={() => setModalItem(null)}
        onApprove={async (id) => { setModalBusy(true); await handleApprove(id); setModalBusy(false); }}
        onReject={async (id) => { setModalBusy(true); await handleReject(id); setModalBusy(false); }}
        busy={modalBusy}
      />
    </AdminLayout>
  );
}
