import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function MemberUpload() {
  const router = useRouter();
  const { id: queryId } = router.query;

  const [payments, setPayments] = useState([]);
  const [active, setActive] = useState(null);
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote]       = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api.get("/member/payments/pending").then((r) => {
        if (alive && r.data?.payments?.length) {
          setPayments(r.data.payments);
          // If queryId exists and is in the list, use it. Otherwise use the first one.
          setActive((prev) => {
            if (queryId && r.data.payments.find(p => p.id === queryId)) return queryId;
            if (prev && r.data.payments.find(p => p.id === prev)) return prev;
            return r.data.payments[0].id;
          });
        }
      }).catch(() => {});
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { alive = false; clearInterval(interval); };
  }, [queryId]);

  const current = payments.find((p) => p.id === active);

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("Ukuran file maksimal 10MB"); return; }
    if (!["image/jpeg", "image/png", "application/pdf"].includes(f.type)) { setError("Format harus JPG, PNG, atau PDF"); return; }
    setFile(f);
    setError("");
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (e) => setPreview(e.target.result);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0]);
  };

  const removeFile = () => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; };

  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");

  useEffect(() => {
    api.get("/bank/member/list").then(r => {
      setBanks(r.data);
      if (r.data.length > 0) setSelectedBank(r.data[0].id);
    }).catch(err => console.error("Gagal load bank", err));
  }, []);

  const submit = async () => {
    if (!active || !file) { setError("Pilih pembayaran dan file terlebih dahulu"); return; }
    if (!selectedBank) { setError("Pilih bank tujuan transfer"); return; }
    setUploading(true); setError(""); setSuccess(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (note) fd.append("note", note);
      
      const res = await api.post(`/payments/member/${active}/proof?bank_account_id=${selectedBank}`, fd, { 
        headers: { "Content-Type": "multipart/form-data" } 
      });
      
      // Update local state to show 'Menunggu' immediately
      setPayments((prev) => prev.map((p) => p.id === active ? { ...p, status: "proof_uploaded", proof_url: res.data.proof_url } : p));
      setSuccess(true);
      removeFile();
      setNote("");
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal upload. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <MemberLayout title="Verifikasi & Bayar" subtitle="Upload bukti transfer ke rekening admin">
      <div className="sec-head" style={{ marginBottom: 20 }}>
        <div className="sec-title">💸 Verifikasi & Bayar Iuran</div>
      </div>

      <div className="grid2">
        {/* LEFT: payment info */}
        <div>
          {/* Payment selector */}
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2)", marginBottom: 10 }}>1️⃣ Pilih Pembayaran</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {payments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActive(p.id); removeFile(); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer", border: "1.5px solid",
                    borderColor: p.status === "verified" ? "#6ee7b7" : p.status === "rejected" ? "#fca5a5" : active === p.id ? "var(--vio)" : "var(--bd)",
                    background: p.status === "verified" ? "#f0fdf4" : p.status === "rejected" ? "#fff1f2" : active === p.id ? "var(--vio-l)" : "var(--surf2)",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: p.status === "verified" ? "#059669" : p.status === "rejected" ? "#e11d48" : active === p.id ? "var(--vio-d)" : "var(--ink)" }}>{p.kloter_name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", fontFamily: "'JetBrains Mono', monospace" }}>Kode #{p.unique_code}</div>
                    {p.status === "verified" && <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", marginTop: 2 }}>✅ Lunas · Pembayaran terverifikasi!</div>}
                    {p.status === "rejected" && <div style={{ fontSize: 10, fontWeight: 700, color: "#e11d48", marginTop: 2 }}>❌ Ditolak · Upload ulang bukti</div>}
                    {p.status === "proof_uploaded" && <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", marginTop: 2 }}>⏳ Menunggu verifikasi admin</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: p.status === "verified" ? "#059669" : active === p.id ? "var(--vio)" : "var(--ink2)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtRp(p.expected_amount)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment details */}
          {current && (
            <div className="detail-card highlight">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>📋</span>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Detail Pembayaran</div>
              </div>
              <div className="info-row">
                <div className="ir-label">Kloter</div>
                <div className="ir-val">{current.kloter_name}</div>
              </div>
              <div className="info-row">
                <div className="ir-label">Iuran</div>
                <div className="ir-val mono">{fmtRp(current.expected_amount)}</div>
              </div>
              <div className="info-row">
                <div className="ir-label">Kode Unik</div>
                <div className="ir-val mono vio">#{current.unique_code}</div>
              </div>
              <div className="info-row" style={{ borderTop: "2px solid var(--bd)", paddingTop: 10, marginTop: 2 }}>
                <div className="ir-label" style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Total Transfer</div>
                <div className="ir-val mono" style={{ fontSize: 17, color: "var(--vio)" }}>{fmtRp(current.expected_amount + Number(current.unique_code))}</div>
              </div>
              <div style={{ marginTop: 10, background: "var(--amb-l)", border: "1.5px solid #fcd34d", borderRadius: 10, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--amb-d)", display: "flex", gap: 8 }}>
                <span>⚡</span>
                <span>Transfer tepat <b>{fmtRp(current.expected_amount + Number(current.unique_code))}</b> (iuran + kode unik <b>#{current.unique_code}</b>) untuk verifikasi otomatis!</span>
              </div>

              {/* Verified */}
              {current.status === "verified" && (
                <div style={{ marginTop: 12, borderTop: "1.5px solid #6ee7b7", paddingTop: 12, background: "#f0fdf4", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#059669", marginBottom: 4 }}>🎉 Pembayaran Lunas!</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#065f46" }}>Admin sudah verifikasi bukti pembayaran kamu. Terima kasih!</div>
                  {current.proof_url && (
                    <a href={current.proof_url} target="_blank" rel="noreferrer">
                      <img src={current.proof_url} alt="Bukti bayar" style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8, border: "1.5px solid #6ee7b7", cursor: "pointer", marginTop: 8 }} />
                    </a>
                  )}
                </div>
              )}

              {/* Rejected */}
              {current.status === "rejected" && (
                <div style={{ marginTop: 12, borderTop: "1.5px solid #fca5a5", paddingTop: 12, background: "#fff1f2", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#e11d48", marginBottom: 4 }}>❌ Bukti Ditolak</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#9f1239" }}>Upload ulang bukti transfer yang jelas dan benar.</div>
                </div>
              )}

              {/* Proof uploaded — waiting */}
              {current.status === "proof_uploaded" && current.proof_url && (
                <div style={{ marginTop: 12, borderTop: "1.5px solid var(--bd)", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 8 }}>⏳ Bukti dikirim {current.submitted_at && `· ${current.submitted_at}`} · Menunggu verifikasi</div>
                  <a href={current.proof_url} target="_blank" rel="noreferrer">
                    <img src={current.proof_url} alt="Bukti bayar" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, border: "1.5px solid #fcd34d", cursor: "pointer" }} />
                  </a>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, textAlign: "center" }}>Klik gambar untuk buka penuh</div>
                </div>
              )}
              {current.status === "proof_uploaded" && !current.proof_url && (
                <div style={{ marginTop: 12, borderTop: "1.5px solid var(--bd)", paddingTop: 12, fontSize: 11, fontWeight: 700, color: "#d97706" }}>
                  ⏳ Bukti sudah dikirim · Menunggu verifikasi admin
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: upload */}
        <div>
          {/* Bank selector */}
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2)", marginBottom: 10 }}>2️⃣ Transfer ke Mana?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
              {banks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBank(b.id)}
                  style={{
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: "1.5px solid",
                    borderColor: selectedBank === b.id ? "var(--vio)" : "var(--bd)",
                    background: selectedBank === b.id ? "var(--vio-l)" : "var(--surf2)",
                    transition: "all .15s", position: "relative"
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase" }}>{b.bank_name}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", margin: "2px 0" }}>{b.account_number}</div>
                  <div style={{ fontSize: 10, color: "var(--ink3)" }}>an. {b.account_holder_name}</div>
                  {selectedBank === b.id && <div style={{ position: "absolute", top: 6, right: 6, fontSize: 12 }}>✅</div>}
                </div>
              ))}
            </div>
            {banks.length === 0 && <div style={{ fontSize: 12, color: "var(--ink3)", textAlign: "center", padding: 10 }}>Tidak ada rekening admin aktif. Hubungi admin.</div>}
          </div>

          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 14 }}>3️⃣ Upload Bukti Transfer</div>

            {/* Upload zone */}
            <div
              className={`upload-zone${file ? "" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => pickFile(e.target.files?.[0])} disabled={uploading} />
              {preview ? (
                <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, objectFit: "contain" }} />
              ) : (
                <>
                  <div className="uz-icon">📷</div>
                  <div className="uz-title">Ketuk untuk upload screenshot</div>
                  <div className="uz-sub">JPG, PNG, PDF · Maks 10MB</div>
                </>
              )}
            </div>

            {/* File preview row */}
            {file && (
              <div className="file-preview show">
                <div className="fp-icon">{file.type.startsWith("image/") ? "🖼️" : "📄"}</div>
                <div className="fp-name">{file.name}</div>
                <div className="fp-remove" onClick={removeFile}>✕</div>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2)", marginBottom: 8 }}>💬 Catatan (opsional)</div>
            <textarea
              className="inp"
              style={{ resize: "none", height: 80, fontSize: 12.5, fontWeight: 500 }}
              placeholder="Tambahkan catatan untuk admin..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Error / success */}
          {error && (
            <div style={{ background: "var(--rose-l)", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "var(--rose)", marginBottom: 10 }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ background: "var(--mint-l)", border: "1.5px solid #6ee7b7", borderRadius: 10, padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "var(--mint-d)", marginBottom: 10 }}>
              ✅ Bukti berhasil dikirim!<br />
              <span style={{ fontWeight: 500 }}>Admin akan verifikasi dalam ~1 jam. Status kamu sudah diupdate di daftar kiri.</span>
            </div>
          )}

          {/* Buttons */}
          <button 
            className="btn-pay" 
            onClick={submit} 
            disabled={!file || !active || uploading || current?.status === "verified" || current?.status === "proof_uploaded"}
            style={{ opacity: (!file || !active || uploading || current?.status === "verified" || current?.status === "proof_uploaded") ? 0.6 : 1 }}
          >
            <span>💸</span>
            <span>
              {uploading ? "Mengirim…" : 
               current?.status === "proof_uploaded" ? "Sedang Diverifikasi" : 
               current?.status === "verified" ? "Sudah Terverifikasi" : 
               "Kirim Bukti Bayar"}
            </span>
          </button>
          {!active && <div style={{ fontSize: 11, color: "var(--rose)", textAlign: "center", marginTop: 4 }}>⚠️ Pilih 1 pembayaran di kolom kiri dulu</div>}
          {!file && active && <div style={{ fontSize: 11, color: "var(--vio)", textAlign: "center", marginTop: 4 }}>📸 Klik kotak di atas untuk pilih foto bukti</div>}
          <button className="btn-wa">
            <span>💬</span>
            <span>Tanya Admin via WA</span>
          </button>
          <button className="btn-ghost" onClick={() => window.history.back()}>
            ← Kembali ke Dashboard
          </button>

          {/* Verification flow */}
          <div style={{ marginTop: 14, background: "var(--mint-l)", border: "1.5px solid #6ee7b7", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--mint-d)", marginBottom: 4 }}>ℹ️ Alur Verifikasi</div>
            <div style={{ fontSize: 11, color: "#065f46", fontWeight: 500, lineHeight: 1.65 }}>
              1. Upload bukti transfer → <b>Status: Menunggu</b><br />
              2. Admin verifikasi (biasanya &lt; 1 jam)<br />
              3. Status update jadi <b>✅ Lunas</b><br />
              4. Dapat notif WA dari admin 🎉
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
