import AdminLayout from "../../components/admin/AdminLayout";
import { useState, useEffect } from "react";
import Head from "next/head";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function AdminReports() {
  const [summary, setSummary] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/reports/summary"),
      api.get("/reports/receivables")
    ]).then(([s, r]) => {
      setSummary(s.data);
      setReceivables(r.data);
    }).catch(e => console.error(e)).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Laporan Keuangan" subtitle="Pantau 4 Laci Virtual & Piutang Member ✨">
      <Head>
        <title>Laporan Keuangan | Admin Kloterby ✨</title>
      </Head>

      {loading ? (
        <div className="loading-state">Menghitung laci virtual... 💰</div>
      ) : (
        <div className="reports-container">
          {/* Header Summary */}
          <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)', marginBottom: '24px' }}>
            <div className="wb-inner">
              <div className="wb-emoji">💰</div>
              <div className="wb-text">
                <div className="wb-hi">KAS TERSEDIA (CASH ON HAND)</div>
                <div className="wb-name" style={{ fontSize: '32px' }}>{fmtRp(summary.total_cash)}</div>
                <div className="wb-sub">Total uang tunai dari Laci Modal, Profit, dan Denda.</div>
              </div>
            </div>
          </div>

          {/* 4 Virtual Drawers */}
          <div className="grid2" style={{ marginBottom: '24px' }}>
            <div className="detail-card highlight" style={{ borderLeft: '5px solid #0ea5e9' }}>
              <div className="kc-head">
                <div className="kc-name">1. Laci Modal</div>
                <div className="stat-icon sky" style={{ background: '#e0f2fe', color: '#0369a1' }}>🏦</div>
              </div>
              <div className="stat-val" style={{ fontSize: '24px', margin: '10px 0' }}>{fmtRp(summary.laci_modal)}</div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Total uang iuran member yang mengendap di sistem.</p>
            </div>

            <div className="detail-card highlight" style={{ borderLeft: '5px solid #10b981' }}>
              <div className="kc-head">
                <div className="kc-name">2. Laci Profit</div>
                <div className="stat-icon mint" style={{ background: '#d1fae5', color: '#065f46' }}>💎</div>
              </div>
              <div className="stat-val" style={{ fontSize: '24px', margin: '10px 0' }}>{fmtRp(summary.laci_profit)}</div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Keuntungan murni dari Biaya Admin (Fee).</p>
            </div>

            <div className="detail-card highlight" style={{ borderLeft: '5px solid #f43f5e' }}>
              <div className="kc-head">
                <div className="kc-name">3. Laci Piutang</div>
                <div className="stat-icon rose" style={{ background: '#ffe4e6', color: '#9f1239' }}>💸</div>
              </div>
              <div className="stat-val" style={{ fontSize: '24px', margin: '10px 0', color: '#e11d48' }}>{fmtRp(summary.laci_piutang)}</div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Total talangan yang belum dikembalikan member.</p>
            </div>

            <div className="detail-card highlight" style={{ borderLeft: '5px solid #f59e0b' }}>
              <div className="kc-head">
                <div className="kc-name">4. Laci Denda</div>
                <div className="stat-icon amb" style={{ background: '#fef3c7', color: '#92400e' }}>⚖️</div>
              </div>
              <div className="stat-val" style={{ fontSize: '24px', margin: '10px 0' }}>{fmtRp(summary.laci_denda)}</div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Hasil denda keterlambatan pembayaran member.</p>
            </div>
          </div>

          {/* Detailed Receivables */}
          <div className="sec-head">
            <div className="sec-title">📋 Daftar Talangan Aktif (Piutang)</div>
          </div>

          <div className="detail-card">
            {receivables.length > 0 ? (
              <div className="timeline">
                {receivables.map((r, i) => (
                  <div key={r.id} className="tl-item">
                    <div className="tl-dot telat" style={{ background: '#fff1f2', borderColor: '#fda4af' }}>🚨</div>
                    <div className="tl-body">
                      <div className="tl-period">{r.kloter_name} — Periode {r.period_number}</div>
                      <div className="tl-desc"><b>{r.member_name}</b> belum membayar talangan</div>
                      <div className="tl-meta">Jatuh Tempo: {new Date(r.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <button 
                        className="btn-wa" 
                        style={{ marginTop: '10px', width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => window.open(`https://wa.me/${r.wa}?text=Halo%20${r.member_name},%20iuran%20${r.kloter_name}%20periode%20${r.period_number}%20sudah%20ditalangi%20Admin.%20Mohon%20segera%20dilunasi%20ya.`, "_blank")}
                      >
                        💬 Tagih via WhatsApp
                      </button>
                    </div>
                    <div className="tl-amount telat" style={{ alignSelf: 'center', fontSize: '18px' }}>
                      {fmtRp(r.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🌈</div>
                <div className="sec-title">Semua Beres!</div>
                <p style={{ color: '#64748b' }}>Tidak ada piutang aktif saat ini.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .loading-state {
          padding: 100px 20px;
          text-align: center;
          font-size: 1.2rem;
          color: #64748b;
          font-weight: 600;
        }
        .reports-container {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AdminLayout>
  );
}
