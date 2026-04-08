import { useState, useEffect } from "react";
import Head from "next/head";
import MemberLayout from "../../components/member/MemberLayout";
import api from "../../lib/api";

export default function MemberBanks() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bank/member/list")
      .then(res => {
        setBanks(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <MemberLayout title="Rekening Pembayaran" subtitle="Daftar rekening resmi untuk transfer iuran">
      <Head>
        <title>Rekening Pembayaran | Kloterby Meme ✨</title>
      </Head>

      <div className="grid3">
        {loading ? (
          <div className="loading-state">Memuat data bank...</div>
        ) : banks.length > 0 ? (
          banks.map((bank, i) => (
            <div key={i} className="detail-card highlight">
              <div className="kc-head">
                <div className="kc-name">{bank.bank_name}</div>
                <div className="stat-icon vio">🏦</div>
              </div>
              
              <div className="info-row">
                <div className="ir-label">Nomor Rekening</div>
                <div className="ir-val mono" style={{ fontSize: '1.1rem', color: 'var(--vio)' }}>{bank.account_number}</div>
              </div>
              
              <div className="info-row">
                <div className="ir-label">Atas Nama</div>
                <div className="ir-val">{bank.account_holder_name}</div>
              </div>

              <div className="tl-status-pill lunas" style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }}>
                ✅ Rekening Resmi
              </div>
            </div>
          ))
        ) : (
          <div className="detail-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏦</div>
            <div className="sec-title">Belum ada rekening terdaftar</div>
            <p style={{ color: 'var(--ink3)' }}>Hubungi admin untuk info rekening pembayaran.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-state {
          grid-column: 1 / -1;
          padding: 40px;
          text-align: center;
          color: var(--ink3);
        }
      `}</style>
    </MemberLayout>
  );
}
