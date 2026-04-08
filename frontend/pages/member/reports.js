import { useState, useEffect } from "react";
import Head from "next/head";
import MemberLayout from "../../components/member/MemberLayout";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const payColor = { verified: "mint", expected: "vio", late: "rose", rejected: "rose" };
const payIcon  = { verified: "✨", expected: "⏳", late: "⏰", rejected: "❌" };

export default function MemberReports() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/member/home")
      .then(res => {
        const history = [];
        res.data.kloters.forEach(k => {
          history.push({
            kloter_name: k.name,
            amount: k.contribution,
            status: k.payment_status,
            period: k.current_period,
            date: k.next_get_date
          });
        });
        setPayments(history);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <MemberLayout title="Laporan Keuangan" subtitle="Rekam jejak iuran dan transaksi kamu ✨">
      <Head>
        <title>Laporan Keuangan | Kloterby Meme ✨</title>
      </Head>

      <div className="grid2">
        {/* Summary Card */}
        <div className="detail-card highlight">
          <div className="sec-head">
            <div className="sec-title">📈 Ringkasan Transaksi</div>
          </div>
          <div className="info-row">
            <div className="ir-label">Total Kloter Aktif</div>
            <div className="ir-val vio">{payments.length}</div>
          </div>
          <div className="info-row">
            <div className="ir-label">Total Iuran Terverifikasi</div>
            <div className="ir-val mint">{fmtRp(payments.filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0))}</div>
          </div>
          <div className="info-row">
            <div className="ir-label">Pembayaran Tertunda</div>
            <div className="ir-val amb">{payments.filter(p => p.status === 'expected').length} Kali</div>
          </div>
        </div>

        {/* Info Card */}
        <div className="detail-card">
          <div className="get-box">
             <div className="cb-icon">💡</div>
             <div className="cb-text">
                <div className="cb-title" style={{color: '#92400e'}}>Tips Keuangan</div>
                <div className="cb-sub" style={{color: '#b45309', fontSize: '11px'}}>Bayar iuran tepat waktu untuk meningkatkan skor reputasi kamu!</div>
             </div>
          </div>
        </div>
      </div>

      <div className="sec-head" style={{ marginTop: '20px' }}>
        <div className="sec-title">📜 Riwayat Iuran Terakhir</div>
      </div>

      <div className="detail-card" style={{ padding: '10px 20px' }}>
        {loading ? (
          <div className="loading-state">Sedang memproses data... ✨</div>
        ) : payments.length > 0 ? (
          <div className="timeline">
            {payments.map((p, i) => (
              <div key={i} className="tl-item">
                <div className={`tl-dot ${p.status === 'verified' ? 'lunas' : p.status === 'expected' ? 'pending' : 'telat'}`}>
                  {payIcon[p.status] || "📦"}
                </div>
                <div className="tl-body">
                  <div className="tl-period">Periode {p.period} — {p.kloter_name}</div>
                  <div className="tl-desc">Pembayaran Iuran {p.kloter_name}</div>
                  <div className="tl-meta">Status: <span className={`tl-status-pill ${p.status === 'verified' ? 'lunas' : p.status === 'expected' ? 'pending' : 'telat'}`}>
                    {p.status === 'verified' ? 'Lunas ✨' : p.status === 'expected' ? 'Menunggu' : p.status}
                  </span></div>
                </div>
                <div className={`tl-amount ${p.status === 'verified' ? '' : 'telat'}`} style={{ alignSelf: 'center' }}>
                  {fmtRp(p.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🍃</div>
            <div className="sec-title">Belum ada transaksi nih</div>
            <p style={{ color: 'var(--ink3)' }}>Mulai ikuti kloter untuk melihat laporan kamu di sini!</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-state {
          padding: 40px;
          text-align: center;
          color: var(--ink3);
          font-weight: 600;
          font-style: italic;
        }
      `}</style>
    </MemberLayout>
  );
}
