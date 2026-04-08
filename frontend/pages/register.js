import { useState, useRef } from "react";
import { useRouter } from "next/router";
import api from "../lib/api";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    wa: "",
    nik: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  });
  const [selfie, setSelfie] = useState(null);
  const [ktp, setKtp] = useState(null);
  const [previews, setPreviews] = useState({ selfie: null, ktp: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "selfie") setSelfie(file);
    else setKtp(file);

    const reader = new FileReader();
    reader.onload = (e) => setPreviews(prev => ({ ...prev, [type]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selfie || !ktp) {
        setError("Harap upload Foto Selfie dan KTP.");
        return;
    }
    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      Object.keys(form).forEach(key => fd.append(key, form[key]));
      fd.append("selfie", selfie);
      fd.append("ktp", ktp);

      await api.post("/member/self-register", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal mendaftar. Pastikan data benar.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="member-login-page">
        <div className="bg-blobs"><div className="blob blob1" /><div className="blob blob2" /></div>
        <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ maxWidth: 450, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>⏳</div>
            <h2 style={{ fontSize: 24, marginBottom: 16 }}>Pendaftaran Terkirim!</h2>
            <p style={{ color: "var(--ink3)", lineHeight: 1.6, marginBottom: 24 }}>
              Data kamu sedang diverifikasi oleh admin. Kamu akan mendapatkan notifikasi atau bisa mencoba login kembali dalam 1x24 jam.
            </p>
            <Link href="/login" className="btn-main">Kembali ke Login</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="member-login-page">
      <div className="bg-blobs"><div className="blob blob1" /><div className="blob blob2" /></div>
      <div className="page">
        <div className="card-wrap" style={{ maxWidth: 900 }}>
          <div className="left-panel" style={{ width: "35%", minWidth: 300 }}>
             <div className="lp-noise" />
             <div className="lp-hero">
                <span className="lp-emoji">📝</span>
                <div className="lp-title">Gabung<br /><span>Kloter</span><br />Digital</div>
                <div className="lp-sub">Isi formulir pendaftaran dengan jujur untuk memudahkan verifikasi admin.</div>
             </div>
          </div>
          
          <div className="right-panel" style={{ width: "65%", padding: "40px 50px" }}>
            <div className="rp-head">
               <div className="rp-hi">Member Baru</div>
               <div className="rp-title">Formulir Pendaftaran</div>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <div className="grid2">
                <div className="field">
                  <label className="label">Nama Lengkap</label>
                  <input className="inp" name="name" value={form.name} onChange={handleInput} required placeholder="Sesuai KTP" />
                </div>
                <div className="field">
                  <label className="label">Nomor WhatsApp</label>
                  <input className="inp" name="wa" value={form.wa} onChange={handleInput} required placeholder="0812..." />
                </div>
              </div>

              <div className="field">
                <label className="label">Nomor NIK (KTP)</label>
                <input className="inp" name="nik" value={form.nik} onChange={handleInput} required placeholder="16 digit NIK" maxLength={16} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "20px 0" }}>
                <div className="field">
                  <label className="label">📸 Foto Selfie</label>
                  <div 
                    onClick={() => document.getElementById('selfie-inp').click()}
                    style={{ 
                        height: 120, border: "2px dashed var(--bd)", borderRadius: 12, 
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" 
                    }}
                  >
                    {previews.selfie ? <img src={previews.selfie} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 12, color: "var(--ink3)" }}>Upload Selfie</span>}
                  </div>
                  <input id="selfie-inp" type="file" hidden accept="image/*" onChange={(e) => handleFile(e, "selfie")} />
                </div>

                <div className="field">
                  <label className="label">🪪 Foto KTP</label>
                  <div 
                    onClick={() => document.getElementById('ktp-inp').click()}
                    style={{ 
                        height: 120, border: "2px dashed var(--bd)", borderRadius: 12, 
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" 
                    }}
                  >
                    {previews.ktp ? <img src={previews.ktp} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 12, color: "var(--ink3)" }}>Upload KTP</span>}
                  </div>
                  <input id="ktp-inp" type="file" hidden accept="image/*" onChange={(e) => handleFile(e, "ktp")} />
                </div>
              </div>

              <div style={{ padding: 15, background: "var(--surf2)", borderRadius: 12, marginBottom: 20 }}>
                 <h4 style={{ fontSize: 13, marginBottom: 10 }}>🏦 Rekening Pencairan (Opsional)</h4>
                 <div className="grid2">
                    <input className="inp" name="bank_name" value={form.bank_name} onChange={handleInput} placeholder="Nama Bank" />
                    <input className="inp" name="bank_account_number" value={form.bank_account_number} onChange={handleInput} placeholder="No. Rekening" />
                 </div>
              </div>

              {error && <div className="err-msg" style={{ marginBottom: 15 }}>{error}</div>}

              <button className="btn-main" type="submit" disabled={loading}>
                {loading ? "Memproses..." : "🚀 Daftar Sekarang"}
              </button>
              
              <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--ink3)" }}>
                Sudah punya akun? <Link href="/login" style={{ color: "var(--vio)", fontWeight: 700 }}>Masuk di sini</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
