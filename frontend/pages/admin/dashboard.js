import Link from "next/link";
import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatCard from "../../components/admin/StatCard";
import PaymentDetailModal from "../../components/admin/PaymentDetailModal";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function AdminDashboard() {
  const [overview, setOverview] = useState({ today_periods: 0, ready_get_count: 0, problem_count: 0 });
  const [queue, setQueue] = useState([]);
  const [ready, setReady] = useState([]);
  const [kloter, setKloter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [rawQueue, setRawQueue] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/dashboard/overview").catch(() => null),
      api.get("/payments/queue").catch(() => null),
      api.get("/disbursements/ready").catch(() => null),
      api.get("/kloter").catch(() => null),
    ]).then(([ov, q, d, kl]) => {
      if (!alive) return;
      if (ov?.data) setOverview(ov.data.kpis ?? ov.data);
      if (Array.isArray(q?.data)) {
        setRawQueue(q.data);
        setQueue(q.data.slice(0, 3).map((x) => ({
          id: x.id, name: x.member_name,
          meta: `${x.kloter_name} · Periode ${x.period_number}`,
          amount: fmtRp(x.expected_amount),
          tone: x.status === "manual_review" ? "orange" : x.status === "late" ? "red" : "purple",
        })));
      }
      if (Array.isArray(d?.data))
        setReady(d.data.slice(0, 3).map((x) => ({
          id: x.id, name: x.recipient_name || "Siap Release",
          kloter: x.kloter_name || `Period ${x.period_id?.slice(0, 8)}`,
          amount: fmtRp(x.net_amount), emoji: "💸",
        })));
      if (Array.isArray(kl?.data))
        setKloter(kl.data.slice(0, 3).map((x) => ({
          id: x.id, name: x.name,
          meta: `${x.filled_slots}/${x.slot_total} slot · ${x.type}`,
          get: x.issue === "ready_get" ? "READY GET" : x.status?.toUpperCase(),
          pct: x.progress ?? 0,
          tone: x.status === "problem" ? "orange" : x.issue === "ready_get" ? "green" : "purple",
        })));
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const openModal = (id) => {
    const found = rawQueue.find((x) => x.id === id);
    if (found) setModalItem(found);
  };

  const handleApprove = async (id) => {
    setModalBusy(true);
    try {
      await api.post(`/payments/${id}/verify`);
      setRawQueue((p) => p.filter((x) => x.id !== id));
      setQueue((p) => p.filter((x) => x.id !== id));
      setModalItem(null);
    } catch (_) {}
    setModalBusy(false);
  };

  const handleReject = async (id) => {
    setModalBusy(true);
    try {
      await api.post(`/payments/${id}/reject`, { note: "Rejected from dashboard" });
      setRawQueue((p) => p.filter((x) => x.id !== id));
      setQueue((p) => p.filter((x) => x.id !== id));
      setModalItem(null);
    } catch (_) {}
    setModalBusy(false);
  };

  const stats = [
    { emoji: "💰", value: loading ? "…" : overview.today_periods ?? 0, label: "Kloter Aktif", trend: "↑ semua berjalan", tone: "purple" },
    { emoji: "✅", value: queue.length, label: "Menunggu Verifikasi", trend: "⚡ approve sekarang!", tone: "green" },
    { emoji: "💸", value: loading ? "…" : overview.ready_get_count ?? 0, label: "Siap Release GET", trend: "siap diproses", tone: "orange" },
    { emoji: "🚨", value: loading ? "…" : overview.problem_count ?? 0, label: "Kloter Bermasalah", trend: "butuh perhatian", tone: "red" },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle="Ringkasan harian">
      {/* Welcome bar */}
      <div className="welcome-bar">
        <div className="wb-dots" />
        <div className="wb-left">
          <div className="wb-hi">Selamat datang, Admin Meme! ☀️</div>
          <div className="wb-sub">
            Ada <strong>{queue.length} verifikasi</strong> menunggu · <strong>{overview.problem_count ?? 0} kloter</strong> butuh perhatian
          </div>
        </div>
        <div className="wb-emoji">🪙</div>
      </div>

      {/* Stats grid */}
      <div className="stat-grid">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* 2-column panels */}
      <div className="dash-grid2">
        {/* Verification queue */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">📬 Antrian Verifikasi</div>
            <Link href="/admin/payments" className="panel-action">lihat semua →</Link>
          </div>
          {queue.map((item) => (
            <div className="vq-item" key={item.id} onClick={() => openModal(item.id)} style={{ cursor: "pointer" }}>
              <div className={`vq-avatar ${item.tone}`}>
                {item.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="vq-info">
                <div className="vq-name">{item.name}</div>
                <div className="vq-meta">{item.meta}</div>
              </div>
              <div className="vq-amt">{item.amount}</div>
              <div className="vq-actions">
                <button className="btn green" style={{ padding: "5px 10px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); openModal(item.id); }}>Detail</button>
              </div>
            </div>
          ))}
        </div>

        {/* GET ready list */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">🎉 GET Hari Ini</div>
            <Link href="/admin/disbursements" className="panel-action">jadwal lengkap →</Link>
          </div>
          {ready.map((item) => (
            <div className="get-item" key={item.id}>
              <div className="get-emoji-big">{item.emoji}</div>
              <div className="get-info">
                <div className="get-name">{item.name}</div>
                <div className="get-kloter">{item.kloter}</div>
              </div>
              <div className="get-amt">{item.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority kloter */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">💰 Kloter Prioritas</div>
          <Link href="/admin/kloter" className="panel-action">kelola semua →</Link>
        </div>
        {kloter.map((item) => (
          <Link href={`/admin/kloter/${item.id}`} className="kl-item" key={item.id}>
            <div className={`kl-badge ${item.tone}`}>
              {item.name.split(" ").slice(-1)[0]}
            </div>
            <div className="kl-info">
              <div className="kl-name">{item.name}</div>
              <div className="kl-meta">{item.meta}</div>
            </div>
            <div className="kl-right">
              <div className="kl-get">{item.get}</div>
              <div className="kl-bar">
                <div className={`kl-fill ${item.tone}`} style={{ width: `${item.pct}%` }} />
              </div>
              <div className="kl-pct">{item.pct}% selesai</div>
            </div>
          </Link>
        ))}
      </div>
      <PaymentDetailModal
        item={modalItem}
        onClose={() => setModalItem(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        busy={modalBusy}
      />
    </AdminLayout>
  );
}
