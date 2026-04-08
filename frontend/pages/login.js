import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import api from "../lib/api";
import { setSession } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: phone, 2: otp
  const [phone, setPhone] = useState("");
  const [phoneOk, setPhoneOk] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState({ type: "", text: "" });
  const [method, setMethod] = useState("wa"); // "wa" | "sms"
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpMsg, setOtpMsg] = useState({ type: "", text: "" });
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successName, setSuccessName] = useState("Anggota");
  const [redirect, setRedirect] = useState(3);
  const countdownRef = useRef(null);
  const otpRefs = useRef([]);

  // Phone input formatter
  const handlePhoneInput = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.startsWith("62")) v = "0" + v.slice(2);
    // Format: 0812-3456-7890
    let fmt = "";
    for (let i = 0; i < v.length; i++) {
      if (i === 4 || i === 8) fmt += "-";
      fmt += v[i];
    }
    setPhone(fmt);
    validatePhone(v);
  };

  const validatePhone = (raw) => {
    if (!raw.length) { setPhoneMsg({ type: "", text: "" }); setPhoneOk(false); return false; }
    if (!raw.startsWith("08")) { setPhoneMsg({ type: "err", text: "❌ Nomor harus diawali 08" }); setPhoneOk(false); return false; }
    if (raw.length < 10 || raw.length > 13) { setPhoneMsg({ type: "err", text: "❌ Format nomor tidak valid" }); setPhoneOk(false); return false; }
    setPhoneMsg({ type: "ok", text: "✅ Nomor valid" });
    setPhoneOk(true);
    return true;
  };

  // Normalize local format (08xxx) to international (628xxx) for API calls
  const toInternational = (raw) => {
    if (raw.startsWith("0")) return "62" + raw.slice(1);
    return raw;
  };

  const sendOTP = async (m) => {
    const raw = phone.replace(/\D/g, "");
    if (!validatePhone(raw)) return;
    setMethod(m);
    setLoading(true);
    try {
      await api.post("/auth/otp/send", { wa: toInternational(raw), tenant_id: "0f8fa7196e434d799b7955b323872357" });
    } catch (_) {
      // continue to step 2 for demo/dev
    } finally {
      setLoading(false);
      goToStep2(raw);
    }
  };

  const goToStep2 = (raw) => {
    setStep(2);
    startCountdown();
    setTimeout(() => otpRefs.current[0]?.focus(), 200);
  };

  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          setCanResend(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setOtpMsg({ type: "", text: "" });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    if (digit && i === 5) {
      // auto verify when last digit filled
      const code = [...next].join("");
      if (code.length === 6) setTimeout(() => verifyOTP([...next]), 100);
    }
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      const next = [...otp];
      next[i - 1] = "";
      setOtp(next);
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setOtp(next);
    if (text.length === 6) setTimeout(() => verifyOTP(next), 100);
    else otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const verifyOTP = async (digits = otp) => {
    const code = digits.join("");
    if (code.length < 6) { setOtpMsg({ type: "err", text: "⚠️ Isi semua 6 digit dulu ya!" }); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/otp/verify", {
        tenant_id: "0f8fa7196e434d799b7955b323872357",
        wa: toInternational(phone.replace(/\D/g, "")),
        otp_code: code,
      });
      setSession({ token: res.data.access_token, role: res.data.role });
      setSuccessName(res.data.name || "Anggota");
      showSuccess();
      setTimeout(() => {
        router.push(res.data.role === "admin" ? "/admin/dashboard" : "/member/home");
      }, 3000);
    } catch (_) {
      setOtpMsg({ type: "err", text: "❌ Kode salah atau sudah kadaluarsa" });
      setOtp(["", "", "", "", "", ""]);
      const next = ["", "", "", "", "", ""];
      setOtp(next);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = () => {
    setSuccess(true);
    let n = 3;
    const t = setInterval(() => {
      n--;
      setRedirect(n);
      if (n <= 0) clearInterval(t);
    }, 1000);
  };

  const backToStep1 = () => {
    setStep(1);
    setOtp(["", "", "", "", "", ""]);
    setOtpMsg({ type: "", text: "" });
    clearInterval(countdownRef.current);
  };

  return (
    <main className="member-login-page">
      {/* Background blobs */}
      <div className="bg-blobs">
        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
      </div>

      {/* Topbar */}
      <nav className="topbar">
        <a href="/" className="logo">
          <div className="logo-mark">🏦</div>
          <div className="logo-name"><b>K</b>loterby<span style={{ color: "var(--ora)" }}>.</span> <span style={{ fontWeight: 400, color: "var(--ink3)" }}>by Meme</span></div>
        </a>
        <div className="tb-r">Masalah masuk? <a href="#">Chat Admin</a></div>
      </nav>

      {/* Page */}
      <div className="page">
        <div className="card-wrap">

          {/* LEFT PANEL */}
          <div className="left-panel">
            <div className="lp-noise" />
            <div className="lp-logo">
              <div className="lp-logomark">🏦</div>
              <div className="lp-logoname"><span>K</span>loterby<span className="lp-logodot">.</span></div>
            </div>
            <div className="lp-hero">
              <span className="lp-emoji">💰</span>
              <div className="lp-title">Klotermu<br /><span>menunggu</span><br />kamu! 🎉</div>
              <div className="lp-sub">
                Cek giliran GET, pantau iuran,<br />
                dan lihat riwayat pembayaran kamu<br />
                — semua dalam satu tempat.
              </div>
              <div className="lp-stats">
                <div className="stat-pill">
                  <div className="stat-icon">📅</div>
                  <div className="stat-text"><b>Jatuh Tempo</b>Tgl 28 tiap bulan · jam 20:00</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-text"><b>GET Real-time</b>Pantau giliran kamu kapan saja</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-icon">💬</div>
                  <div className="stat-text"><b>Notif WA Otomatis</b>Reminder sebelum deadline</div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#7c6a9a", fontWeight: 600, marginTop: "auto", paddingTop: 20 }}>
              © 2025 Kloterby Meme · Arisan digital tanpa drama 🌸
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            <div className="rp-head">
              <div className="rp-hi">👋 Selamat datang</div>
              <div className="rp-title">Masuk ke Klotermu</div>
              <div className="rp-sub">Masukkan nomor WA yang didaftarkan ke admin</div>
            </div>

            {/* Step dots */}
            {!success && (
              <div className="step-indicator">
                <div className={`si ${step === 1 ? "active" : "done"}`} />
                <div className={`si ${step === 2 ? "active" : step > 2 ? "done" : ""}`} />
              </div>
            )}

            {/* STEP 1: NOMOR HP */}
            {!success && (
              <div className={`form-panel${step === 1 ? " active" : ""}`} style={{ display: step === 1 ? "block" : "none" }}>
                <div className="info-box purple">
                  💡 Gunakan nomor WhatsApp yang kamu daftarkan ke admin kloter
                </div>
                <div className="field">
                  <label className="label">
                    Nomor WhatsApp
                    <span className="label-hint">Tanpa +62</span>
                  </label>
                  <div className="inp-wrap">
                    <span className="flag">🇮🇩</span>
                    <input
                      className={`inp inp-phone${phoneMsg.type === "err" ? " err" : phoneMsg.type === "ok" ? " ok" : ""}`}
                      type="tel"
                      placeholder="0812-3456-7890"
                      maxLength={14}
                      value={phone}
                      onChange={handlePhoneInput}
                      onKeyDown={(e) => e.key === "Enter" && sendOTP("wa")}
                      disabled={loading}
                      autoComplete="tel"
                    />
                  </div>
                  {phoneMsg.text && (
                    <div className={phoneMsg.type === "err" ? "err-msg" : "ok-msg"}>
                      {phoneMsg.text}
                    </div>
                  )}
                </div>

                <button
                  className={`btn-wa${loading && method === "wa" ? " loading" : ""}`}
                  onClick={() => sendOTP("wa")}
                  disabled={loading}
                >
                  <span style={{ fontSize: 18 }}>💬</span>
                  <span className="btn-text">Kirim Kode via WhatsApp</span>
                </button>

                <div className="divider"><span>atau masuk via</span></div>

                <button
                  className={`btn-sms${loading && method === "sms" ? " loading" : ""}`}
                  onClick={() => sendOTP("sms")}
                  disabled={loading}
                >
                  <span style={{ fontSize: 16 }}>📱</span>
                  <span className="btn-text">Kirim Kode via SMS</span>
                </button>

                <div className="security-box">
                  <div className="sec-title">🔒 Aman & terlindungi</div>
                  <div className="sec-body">
                    Kode OTP berlaku <b>5 menit</b> dan hanya sekali pakai.<br />
                    Kloterby <b>tidak pernah</b> meminta password atau PIN kamu.
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: OTP */}
            {!success && (
              <div className={`form-panel${step === 2 ? " active" : ""}`} style={{ display: step === 2 ? "block" : "none" }}>
                <div className="phone-preview">
                  <div className="phone-avatar">👤</div>
                  <div className="phone-info">
                    <div className="phone-name">Anggota Kloter</div>
                    <div className="phone-num">{phone || "08xx-xxxx-xxxx"}</div>
                  </div>
                  <div className="phone-change" onClick={backToStep1}>✏️ Ganti</div>
                </div>

                <div className="info-box green">
                  ✅ Kode OTP dikirim via <b>{method === "wa" ? "WhatsApp" : "SMS"}</b> — cek pesanmu!
                </div>

                <div className="field">
                  <label className="label" style={{ justifyContent: "center", marginBottom: 12 }}>
                    Masukkan 6 digit kode OTP
                  </label>
                  <div className="otp-row" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        className={`otp-box${digit ? " filled" : ""}${otpMsg.type === "err" ? " err" : ""}`}
                        maxLength={1}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        disabled={loading}
                      />
                    ))}
                  </div>
                  {otpMsg.text && (
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <span className={otpMsg.type === "err" ? "err-msg" : "ok-msg"} style={{ justifyContent: "center" }}>
                        {otpMsg.text}
                      </span>
                    </div>
                  )}
                  <div className="otp-resend">
                    {canResend ? (
                      <span>
                        Tidak menerima? &nbsp;
                        <b onClick={() => { startCountdown(); setOtp(["", "", "", "", "", ""]); }}>
                          Kirim ulang sekarang ↩
                        </b>
                      </span>
                    ) : (
                      <span>Tidak menerima? &nbsp;Kirim ulang dalam <span className="countdown">{countdown}</span>s</span>
                    )}
                  </div>
                </div>

                <button
                  className={`btn-main${loading ? " loading" : ""}`}
                  onClick={() => verifyOTP()}
                  disabled={otp.join("").length !== 6 || loading}
                >
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span className="btn-text">Verifikasi &amp; Masuk</span>
                </button>
              </div>
            )}

            {/* SUCCESS STATE */}
            {success && (
              <div className="success-state show">
                <div className="success-ring">🎉</div>
                <div className="success-title">Berhasil masuk!</div>
                <div className="success-sub">
                  Halo <b>{successName}</b>! 👋<br />
                  Selamat datang di Kloterby Meme~ 💰
                </div>
                <div className="success-redirect">
                  Redirect ke dashboard dalam <b>{redirect}</b> detik...
                </div>
              </div>
            )}

            <div className="rp-footer">
              Belum terdaftar? <Link href="/register" style={{ color: "var(--vio)", fontWeight: 700 }}>Daftar di sini</Link> &nbsp;·&nbsp; <a href="#">Syarat &amp; Ketentuan</a>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
