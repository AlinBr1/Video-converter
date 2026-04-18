"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-production-b121.up.railway.app";

const UPLOAD_CONFIG = {
  maxSizeMB: 500,
  maxSizeBytes: 500 * 1024 * 1024,
  allowedExtensions: ["mp4", "mov", "avi", "mkv"] as const,
  allowedMimeTypes: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"] as const,
};

const FORMATS = [
  { id: "tiktok", label: "TikTok", icon: "♪", res: "1080×1920", ratio: "9:16" },
  { id: "reels", label: "Reels", icon: "◈", res: "1080×1920", ratio: "9:16" },
  { id: "shorts", label: "Shorts", icon: "▶", res: "1080×1920", ratio: "9:16" },
];

const PLANS = [
  { id: "free", name: "Free", price: 0, label: "Grátis", color: "#6b6b8a", features: ["3 conversões/dia", "Até 50MB por vídeo", "Formatos básicos"] },
  { id: "pro", name: "Pro", price: 7.90, label: "R$ 7,90/mês", color: "#7c3aed", features: ["Conversões ilimitadas", "Até 500MB por vídeo", "Todos os formatos", "Sem fila de espera"] },
  { id: "premium", name: "Premium", price: 14.90, label: "R$ 14,90/mês", color: "#ec4899", features: ["Tudo do Pro", "Fila prioritária", "Suporte dedicado", "Novos formatos em beta"] },
];

const PACKAGES = [
  { id: "pack_10", name: "10 conversões", price: 2.90, label: "R$ 2,90", per: "R$ 0,29/conv", highlight: false },
  { id: "pack_50", name: "50 conversões", price: 9.90, label: "R$ 9,90", per: "R$ 0,20/conv", highlight: true },
  { id: "pack_200", name: "200 conversões", price: 24.90, label: "R$ 24,90", per: "R$ 0,12/conv", highlight: false },
];

type UploadState = "idle" | "uploading" | "converting" | "success" | "error";
type View = "converter" | "plans" | "auth";
type AuthMode = "login" | "register";

interface User {
  email: string;
  plan: string;
  pack_conversions: number;
  today_conversions: number;
  daily_limit: number;
  max_size_mb: number;
}

interface HistoryItem {
  id: string;
  name: string;
  format: string;
  url: string;
  time: string;
}

export default function Page() {
  const [view, setView] = useState<View>("converter");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState("tiktok");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<string>("");

  useEffect(() => {
    const savedToken = localStorage.getItem("clipflip_token");
    if (savedToken) { setToken(savedToken); fetchMe(savedToken); }
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setTimeout(() => { if (savedToken) fetchMe(savedToken); }, 2000);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const fetchMe = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { setUser(await res.json()); }
      else { localStorage.removeItem("clipflip_token"); setToken(""); }
    } catch {}
  };

  const handleAuth = async () => {
    if (!authEmail || !authPassword) { setAuthError("Preencha todos os campos"); return; }
    setAuthLoading(true); setAuthError("");
    try {
      const res = await fetch(`${API_BASE_URL}/${authMode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao autenticar");
      localStorage.setItem("clipflip_token", data.token);
      setToken(data.token); await fetchMe(data.token);
      setView("converter"); setAuthEmail(""); setAuthPassword("");
    } catch (e: any) { setAuthError(e.message); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem("clipflip_token"); setToken(""); setUser(null); };

  const handlePayment = async (type: "subscription" | "package", itemId: string) => {
    if (!token) { setView("auth"); return; }
    setPaymentLoading(itemId);
    try {
      const res = await fetch(`${API_BASE_URL}/payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, item_id: itemId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.sandbox_init_point || data.init_point;
    } catch (e: any) { alert(e.message); }
    finally { setPaymentLoading(""); }
  };

  const validateFile = (f: File): string | null => {
    const maxMb = user?.max_size_mb || 50;
    if (f.size > maxMb * 1024 * 1024) return `Arquivo muito grande. Seu plano permite até ${maxMb}MB`;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !(UPLOAD_CONFIG.allowedExtensions as readonly string[]).includes(ext)) return `Formato não permitido.`;
    if (!(UPLOAD_CONFIG.allowedMimeTypes as readonly string[]).includes(f.type)) return `Tipo inválido.`;
    return null;
  };

  const processFile = (f: File) => {
    const error = validateFile(f);
    if (error) { setErrorMessage(error); setState("error"); setFile(null); setPreviewUrl(null); return; }
    setFile(f); setState("idle"); setErrorMessage(""); setVideoUrl(""); setPreviewUrl(URL.createObjectURL(f));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }, [user]);

  const simulateProgress = (start: number, end: number, duration: number) => {
    const steps = 30, step = (end - start) / steps;
    let current = start, count = 0;
    progressRef.current = setInterval(() => {
      count++; current += step; setProgress(Math.min(current, end));
      if (count >= steps) clearInterval(progressRef.current!);
    }, duration / steps);
  };

  const handleUpload = async () => {
    if (!token) { setView("auth"); return; }
    if (!file) return;
    const formData = new FormData();
    formData.append("video", file);
    setState("uploading"); setErrorMessage(""); setProgress(0);
    simulateProgress(0, 40, 1500);
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      clearInterval(progressRef.current!); setProgress(50); setState("converting"); simulateProgress(50, 90, 3000);
      if (!res.ok) { const e = await res.json().catch(() => ({ error: "Erro" })); throw new Error(e.error); }
      const data = await res.json();
      if (!data.url) throw new Error("URL não retornada");
      clearInterval(progressRef.current!); setProgress(100); setVideoUrl(data.url); setState("success");
      const fmt = FORMATS.find((f) => f.id === selectedFormat);
      setHistory((prev) => [{ id: Date.now().toString(), name: file.name, format: fmt?.label || selectedFormat, url: data.url, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }, ...prev.slice(0, 4)]);
      await fetchMe(token);
    } catch (error) {
      clearInterval(progressRef.current!); setProgress(0);
      setErrorMessage(error instanceof Error ? error.message : "Erro ao enviar"); setState("error");
    }
  };

  const reset = () => { setFile(null); setState("idle"); setErrorMessage(""); setVideoUrl(""); setProgress(0); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const isProcessing = state === "uploading" || state === "converting";
  const isLimitReached = user && user.daily_limit !== -1 && user.today_conversions >= user.daily_limit && user.pack_conversions <= 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --bg: #0a0a0f; --surface: #13131a; --surface2: #1c1c26; --border: #2a2a3a; --accent: #7c3aed; --accent2: #a855f7; --accent3: #ec4899; --text: #f0f0f8; --muted: #6b6b8a; --success: #22d3a5; --error: #f43f5e; }
        body { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
        .bg-grid { position: fixed; inset: 0; background-image: linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; }
        .bg-glow { position: fixed; top: -30%; left: 50%; transform: translateX(-50%); width: 800px; height: 500px; background: radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%); pointer-events: none; }
        nav { position: relative; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid var(--border); }
        .logo { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, var(--accent), var(--accent3)); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .logo-text { font-size: 18px; font-weight: 800; }
        .logo-text span { background: linear-gradient(90deg, var(--accent2), var(--accent3)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-btn { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid var(--border); background: transparent; color: var(--muted); }
        .nav-btn:hover { color: var(--text); border-color: var(--accent); }
        .nav-btn.active { background: rgba(124,58,237,0.15); border-color: var(--accent); color: var(--text); }
        .nav-btn.primary { background: linear-gradient(135deg, var(--accent), var(--accent3)); border: none; color: #fff; }
        .user-badge { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); background: var(--surface2); border: 1px solid var(--border); padding: 6px 12px; border-radius: 20px; }
        .plan-badge { font-family: 'DM Mono', monospace; font-size: 10px; padding: 3px 8px; border-radius: 10px; margin-left: 6px; }
        .plan-free { background: rgba(107,107,138,0.2); color: var(--muted); }
        .plan-pro { background: rgba(124,58,237,0.2); color: var(--accent2); }
        .plan-premium { background: rgba(236,72,153,0.2); color: var(--accent3); }
        .layout { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; display: grid; grid-template-columns: 1fr 320px; gap: 32px; align-items: start; }
        @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } nav { padding: 16px 20px; } .plans-grid { grid-template-columns: 1fr !important; } .packages-grid { grid-template-columns: 1fr !important; } }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 32px; display: flex; flex-direction: column; gap: 28px; }
        .section-label { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
        .limit-banner { background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.3); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .limit-banner p { font-size: 13px; color: var(--error); font-weight: 600; }
        .limit-banner button { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; padding: 8px 16px; background: var(--error); color: #fff; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; }
        .formats { display: flex; gap: 10px; }
        .format-btn { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 10px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--muted); }
        .format-btn.active { background: rgba(124,58,237,0.15); border-color: var(--accent); color: var(--text); }
        .format-btn:hover:not(.active) { border-color: var(--muted); color: var(--text); }
        .format-icon { font-size: 20px; } .format-name { font-size: 13px; font-weight: 700; } .format-res { font-family: 'DM Mono', monospace; font-size: 10px; opacity: 0.6; }
        .dropzone { border: 2px dashed var(--border); border-radius: 16px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden; }
        .dropzone.dragging, .dropzone:hover { border-color: var(--accent); background: rgba(124,58,237,0.05); }
        .drop-icon { font-size: 40px; margin-bottom: 12px; display: block; } .drop-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; } .drop-sub { font-size: 13px; color: var(--muted); } .drop-sub strong { color: var(--accent2); }
        .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .preview-wrap { position: relative; border-radius: 14px; overflow: hidden; background: #000; }
        .preview-wrap video { width: 100%; display: block; max-height: 280px; object-fit: contain; }
        .preview-overlay { position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; }
        .preview-tag { font-family: 'DM Mono', monospace; font-size: 10px; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 4px 8px; border-radius: 6px; }
        .change-btn { position: absolute; bottom: 10px; right: 10px; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
        .progress-wrap { display: flex; flex-direction: column; gap: 8px; }
        .progress-header { display: flex; justify-content: space-between; align-items: center; }
        .progress-status { font-size: 13px; font-weight: 600; color: var(--accent2); } .progress-pct { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); }
        .progress-bar-bg { height: 6px; background: var(--surface2); border-radius: 999px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent3)); border-radius: 999px; transition: width 0.3s ease; }
        .progress-steps { display: flex; gap: 8px; }
        .step { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted); font-family: 'DM Mono', monospace; } .step.active { color: var(--accent2); } .step.done { color: var(--success); } .step-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .convert-btn { width: 100%; padding: 16px; border-radius: 14px; border: none; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: linear-gradient(135deg, var(--accent), var(--accent3)); color: #fff; position: relative; overflow: hidden; }
        .convert-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .status-msg { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; }
        .status-msg.success { background: rgba(34,211,165,0.1); border: 1px solid rgba(34,211,165,0.3); color: var(--success); }
        .status-msg.error { background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.3); color: var(--error); }
        .download-section { display: flex; flex-direction: column; gap: 10px; }
        .download-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: var(--success); color: #0a0a0f; text-decoration: none; border-radius: 14px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; }
        .new-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .new-btn:hover { border-color: var(--accent); color: var(--text); }
        .sidebar { display: flex; flex-direction: column; gap: 20px; }
        .info-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 24px; }
        .info-title { font-size: 14px; font-weight: 700; margin-bottom: 16px; }
        .spec-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .spec-row:last-child { border-bottom: none; } .spec-label { color: var(--muted); } .spec-val { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--accent2); }
        .history-empty { text-align: center; color: var(--muted); font-size: 13px; padding: 24px 0; }
        .history-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); } .history-item:last-child { border-bottom: none; }
        .history-icon { width: 36px; height: 36px; background: rgba(124,58,237,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .history-info { flex: 1; min-width: 0; } .history-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .history-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 2px; }
        .history-dl { color: var(--success); font-size: 16px; text-decoration: none; flex-shrink: 0; opacity: 0.7; }
        .usage-bar-bg { height: 4px; background: var(--surface2); border-radius: 999px; overflow: hidden; margin-top: 6px; }
        .usage-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent3)); border-radius: 999px; transition: width 0.3s; }
        .plans-page { position: relative; z-index: 1; max-width: 1000px; margin: 0 auto; padding: 40px 24px 80px; }
        .plans-header { text-align: center; margin-bottom: 48px; }
        .plans-header h1 { font-size: 36px; font-weight: 800; margin-bottom: 12px; }
        .plans-header p { color: var(--muted); font-size: 16px; }
        .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 48px; }
        .plan-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 20px; position: relative; }
        .plan-card.highlighted { border-color: var(--accent); }
        .plan-card-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 700; padding: 4px 14px; border-radius: 20px; background: linear-gradient(135deg, var(--accent), var(--accent3)); color: #fff; white-space: nowrap; }
        .plan-name { font-size: 18px; font-weight: 800; } .plan-price { font-size: 32px; font-weight: 800; } .plan-price span { font-size: 14px; font-weight: 400; color: var(--muted); }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .plan-features li { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 8px; }
        .plan-features li::before { content: "✓"; color: var(--success); font-weight: 700; }
        .plan-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .plan-btn.free { background: var(--surface2); color: var(--muted); cursor: default; }
        .plan-btn.paid { background: linear-gradient(135deg, var(--accent), var(--accent3)); color: #fff; }
        .plan-btn.current { background: rgba(34,211,165,0.1); border: 1px solid var(--success); color: var(--success); cursor: default; }
        .plan-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .packages-section { margin-top: 16px; }
        .packages-title { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
        .packages-sub { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
        .packages-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .pack-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 12px; position: relative; }
        .pack-card.highlighted { border-color: var(--accent2); }
        .pack-card-badge { position: absolute; top: -10px; right: 16px; font-family: 'DM Mono', monospace; font-size: 9px; padding: 3px 10px; border-radius: 10px; background: var(--accent2); color: #fff; }
        .pack-name { font-size: 15px; font-weight: 700; } .pack-price { font-size: 26px; font-weight: 800; } .pack-per { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
        .pack-btn { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--accent); background: rgba(124,58,237,0.1); color: var(--accent2); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .pack-btn:hover { background: rgba(124,58,237,0.2); } .pack-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-page { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 80px); padding: 40px 24px; }
        .auth-card { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 40px; width: 100%; max-width: 400px; }
        .auth-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; } .auth-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .auth-label { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .auth-input { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; color: var(--text); font-family: 'Syne', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%; }
        .auth-input:focus { border-color: var(--accent); }
        .auth-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, var(--accent), var(--accent3)); color: #fff; margin-top: 8px; transition: opacity 0.2s; }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-error { background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.3); color: var(--error); padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; }
        .auth-switch { text-align: center; margin-top: 20px; font-size: 13px; color: var(--muted); }
        .auth-switch button { background: none; border: none; color: var(--accent2); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div className="bg-grid" />
      <div className="bg-glow" />

      <nav>
        <div className="logo" onClick={() => setView("converter")}>
          <div className="logo-icon">🎬</div>
          <div className="logo-text">Clip<span>Flip</span></div>
        </div>
        <div className="nav-right">
          <button className={`nav-btn ${view === "converter" ? "active" : ""}`} onClick={() => setView("converter")}>Converter</button>
          <button className={`nav-btn ${view === "plans" ? "active" : ""}`} onClick={() => setView("plans")}>Planos</button>
          {user ? (
            <>
              <div className="user-badge">{user.email.split("@")[0]}<span className={`plan-badge plan-${user.plan}`}>{user.plan}</span></div>
              <button className="nav-btn" onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <button className="nav-btn primary" onClick={() => setView("auth")}>Entrar</button>
          )}
        </div>
      </nav>

      {view === "auth" && (
        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-title">{authMode === "login" ? "Bem-vindo de volta" : "Criar conta"}</div>
            <div className="auth-sub">{authMode === "login" ? "Entre na sua conta para continuar" : "Crie sua conta gratuitamente"}</div>
            {authError && <div className="auth-error">{authError}</div>}
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="seu@email.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Senha</label>
              <input className="auth-input" type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} />
            </div>
            <button className="auth-btn" onClick={handleAuth} disabled={authLoading}>
              {authLoading ? <><span className="spinner" />Aguarde...</> : authMode === "login" ? "Entrar" : "Criar conta"}
            </button>
            <div className="auth-switch">
              {authMode === "login" ? <>Não tem conta? <button onClick={() => { setAuthMode("register"); setAuthError(""); }}>Criar agora</button></> : <>Já tem conta? <button onClick={() => { setAuthMode("login"); setAuthError(""); }}>Entrar</button></>}
            </div>
          </div>
        </div>
      )}

      {view === "plans" && (
        <div className="plans-page">
          <div className="plans-header">
            <h1>Escolha seu plano</h1>
            <p>Comece grátis e faça upgrade quando precisar</p>
          </div>
          <div className="plans-grid">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`plan-card ${plan.id === "pro" ? "highlighted" : ""}`}>
                {plan.id === "pro" && <div className="plan-card-badge">⭐ Mais popular</div>}
                <div>
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">{plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2).replace(".", ",")}`}{plan.price > 0 && <span>/mês</span>}</div>
                </div>
                <ul className="plan-features">{plan.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
                {plan.price === 0 ? (
                  <button className={`plan-btn ${user?.plan === "free" ? "current" : "free"}`} disabled>{user?.plan === "free" ? "✓ Plano atual" : "Grátis"}</button>
                ) : user?.plan === plan.id ? (
                  <button className="plan-btn current" disabled>✓ Plano atual</button>
                ) : (
                  <button className="plan-btn paid" onClick={() => handlePayment("subscription", plan.id)} disabled={!!paymentLoading}>
                    {paymentLoading === plan.id ? <><span className="spinner" />Aguarde...</> : `Assinar — ${plan.label}`}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="packages-section">
            <div className="packages-title">Pacotes avulsos</div>
            <div className="packages-sub">Sem assinatura. Pague uma vez e use quando quiser.</div>
            <div className="packages-grid">
              {PACKAGES.map((pack) => (
                <div key={pack.id} className={`pack-card ${pack.highlight ? "highlighted" : ""}`}>
                  {pack.highlight && <div className="pack-card-badge">Melhor custo</div>}
                  <div className="pack-name">{pack.name}</div>
                  <div className="pack-price">{pack.label}</div>
                  <div className="pack-per">{pack.per}</div>
                  <button className="pack-btn" onClick={() => handlePayment("package", pack.id)} disabled={!!paymentLoading}>
                    {paymentLoading === pack.id ? <><span className="spinner" />Aguarde...</> : "Comprar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "converter" && (
        <div className="layout">
          <div className="card">
            {isLimitReached && (
              <div className="limit-banner">
                <p>⚠️ Limite diário do plano Free atingido.</p>
                <button onClick={() => setView("plans")}>Ver planos</button>
              </div>
            )}
            <div>
              <div className="section-label">Formato de saída</div>
              <div className="formats">
                {FORMATS.map((f) => (
                  <button key={f.id} className={`format-btn ${selectedFormat === f.id ? "active" : ""}`} onClick={() => setSelectedFormat(f.id)} disabled={isProcessing}>
                    <span className="format-icon">{f.icon}</span><span className="format-name">{f.label}</span><span className="format-res">{f.res}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="section-label">Vídeo</div>
              {!previewUrl ? (
                <div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" className="file-input" accept={UPLOAD_CONFIG.allowedMimeTypes.join(",")} onChange={handleFileChange} disabled={isProcessing} />
                  <span className="drop-icon">⬆</span>
                  <div className="drop-title">Arraste ou clique para enviar</div>
                  <div className="drop-sub"><strong>{UPLOAD_CONFIG.allowedExtensions.join(", ")}</strong> · máx {user?.max_size_mb || 50}MB</div>
                </div>
              ) : (
                <div className="preview-wrap">
                  <video src={previewUrl} controls />
                  <div className="preview-overlay">
                    <span className="preview-tag">{(file!.size / (1024 * 1024)).toFixed(1)}MB</span>
                    <span className="preview-tag">{file!.name.split(".").pop()?.toUpperCase()}</span>
                  </div>
                  {!isProcessing && state !== "success" && <button className="change-btn" onClick={reset}>Trocar vídeo</button>}
                </div>
              )}
            </div>
            {isProcessing && (
              <div className="progress-wrap">
                <div className="progress-header">
                  <span className="progress-status pulse">{state === "uploading" ? "Enviando..." : "Convertendo..."}</span>
                  <span className="progress-pct">{Math.round(progress)}%</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                <div className="progress-steps">
                  <span className={`step ${progress >= 40 ? "done" : progress > 0 ? "active" : ""}`}><span className="step-dot" /> Upload</span>
                  <span className={`step ${progress >= 90 ? "done" : progress >= 40 ? "active" : ""}`}><span className="step-dot" /> Conversão</span>
                  <span className={`step ${progress >= 100 ? "done" : ""}`}><span className="step-dot" /> Pronto</span>
                </div>
              </div>
            )}
            {state === "success" && <div className="status-msg success">✓ Conversão concluída com sucesso!</div>}
            {state === "error" && <div className="status-msg error">✕ {errorMessage}</div>}
            {state === "success" && videoUrl && (
              <div className="download-section">
                <a href={videoUrl} download className="download-btn">⬇ Baixar vídeo convertido</a>
                <button className="new-btn" onClick={reset}>+ Converter outro vídeo</button>
              </div>
            )}
            {state !== "success" && (
              <button className="convert-btn" onClick={handleUpload} disabled={!file || isProcessing || !!isLimitReached}>
                {!token ? "Entrar para converter →" : isProcessing ? <><span className="spinner" />Processando...</> : "Converter →"}
              </button>
            )}
          </div>

          <div className="sidebar">
            {user && (
              <div className="info-card">
                <div className="info-title">👤 Minha conta</div>
                <div className="spec-row"><span className="spec-label">Plano</span><span className="spec-val">{user.plan}</span></div>
                {user.daily_limit !== -1 && (
                  <div className="spec-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span className="spec-label">Conversões hoje</span>
                      <span className="spec-val">{user.today_conversions}/{user.daily_limit}</span>
                    </div>
                    <div className="usage-bar-bg" style={{ width: "100%" }}>
                      <div className="usage-bar-fill" style={{ width: `${Math.min((user.today_conversions / user.daily_limit) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
                {user.pack_conversions > 0 && <div className="spec-row"><span className="spec-label">Pacote avulso</span><span className="spec-val">{user.pack_conversions} conv.</span></div>}
                <button className="new-btn" style={{ marginTop: 8 }} onClick={() => setView("plans")}>Ver planos →</button>
              </div>
            )}
            <div className="info-card">
              <div className="info-title">📐 Especificações</div>
              {(() => { const fmt = FORMATS.find((f) => f.id === selectedFormat)!; return (<>
                <div className="spec-row"><span className="spec-label">Resolução</span><span className="spec-val">{fmt.res}</span></div>
                <div className="spec-row"><span className="spec-label">Proporção</span><span className="spec-val">{fmt.ratio}</span></div>
                <div className="spec-row"><span className="spec-label">Codec</span><span className="spec-val">H.264</span></div>
                <div className="spec-row"><span className="spec-label">Áudio</span><span className="spec-val">AAC 128k</span></div>
                <div className="spec-row"><span className="spec-label">Tamanho máx.</span><span className="spec-val">{user?.max_size_mb || 50}MB</span></div>
              </>); })()}
            </div>
            <div className="info-card">
              <div className="info-title">🕓 Histórico</div>
              {history.length === 0 ? <div className="history-empty">Nenhuma conversão ainda</div> : history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">🎬</div>
                  <div className="history-info"><div className="history-name">{item.name}</div><div className="history-meta">{item.format} · {item.time}</div></div>
                  <a href={item.url} download className="history-dl">⬇</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
