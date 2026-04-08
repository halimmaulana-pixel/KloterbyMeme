import { useState, useEffect } from "react";
import Head from "next/head";
import MemberLayout from "../../components/member/MemberLayout";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function MemberReports() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll reuse the pending payments endpoint but maybe for history later
    api.get("/member/home")
      .then(res => {
        // Logic to flat map all payment expectations from memberships
        const history = [];
        res.data.kloters.forEach(k => {
          // This is a simplified report for now based on current kloters
          history.push({
            kloter_name: k.name,
            amount: k.contribution,
            status: k.payment_status,
            period: k.current_period
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
    <MemberLayout title="Laporan Keuangan" subtitle="Riwayat iuran dan penarikan kamu">
      <Head>
        <title>Laporan Keuangan | Kloterby Meme ✨</title>
      </Head>

      <div className="detail-card">
        <div className="sec-head">
          <div className="sec-title">📊 Riwayat Iuran Terakhir</div>
        </div>
        
        {loading ? (
          <div className="loading-state">Memuat riwayat...</div>
        ) : payments.length > 0 ? (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Kloter</th>
                  <th>Periode</th>
                  <th>Nominal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i}>
                    <td><b>{p.kloter_name}</b></td>
                    <td><span className="kc-chip">Periode {p.period}</span></td>
                    <td className="mono">{fmtRp(p.amount)}</td>
                    <td>
                      <span className={`tl-status-pill ${p.status === 'verified' ? 'lunas' : p.status === 'expected' ? 'pending' : 'telat'}`}>
                        {p.status === 'verified' ? 'Lunas ✨' : p.status === 'expected' ? 'Pending' : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📈</div>
            <div className="sec-title">Belum ada riwayat transaksi</div>
            <p style={{ color: 'var(--ink3)' }}>Semua pembayaran kamu akan muncul di sini nanti!</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-state {
          padding: 40px;
          text-align: center;
          color: var(--ink3);
        }
        .table-responsive {
          overflow-x: auto;
          margin-top: 10px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .report-table th {
          padding: 12px;
          border-bottom: 2px solid var(--bd);
          color: var(--ink3);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .05em;
        }
        .report-table td {
          padding: 15px 12px;
          border-bottom: 1px solid var(--bd);
          font-size: 13px;
        }
        .report-table tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </MemberLayout>
  );
}
