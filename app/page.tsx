"use client";

import { useState, useRef, useCallback } from "react";

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

type UploadState = "idle" | "uploading" | "converting" | "success" | "error";

interface HistoryItem {
  id: string;
  name: string;
  format: string;
  url: string;
  time: string;
}

export default function Page() {
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

  const validateFile = (f: File): string | null => {
    if (f.size > UPLOAD_CONFIG.maxSizeBytes)
      return `Arquivo muito grande. Máximo: ${UPLOAD_CONFIG.maxSizeMB}MB`;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !(UPLOAD_CONFIG.allowedExtensions as readonly string[]).includes(ext))
      return `Formato não permitido. Use: ${UPLOAD_CONFIG.allowedExtensions.join(", ")}`;
    if (!(UPLOAD_CONFIG.allowedMimeTypes as readonly string[]).includes(f.type))
      return `Tipo de arquivo inválido. Envie apenas vídeos.`;
    return null;
  };

  const processFile = (f: File) => {
    const error = validateFile(f);
    if (error) {
      setErrorMessage(error);
      setState("error");
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setState("idle");
    setErrorMessage("");
    setVideoUrl("");
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const simulateProgress = (start: number, end: number, duration: number) => {
    const steps = 30;
    const step = (end - start) / steps;
    let current = start;
    let count = 0;
    progressRef.current = setInterval(() => {
      count++;
      current += step;
      setProgress(Math.min(current, end));
      if (count >= steps) clearInterval(progressRef.current!);
    }, duration / steps);
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("video", file);

    setState("uploading");
    setErrorMessage("");
    setProgress(0);

    simulateProgress(0, 40, 1500);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressRef.current!);
      setProgress(50);
      setState("converting");
      simulateProgress(50, 90, 3000);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      if (!data.url) throw new Error("URL do vídeo não retornada");

      clearInterval(progressRef.current!);
      setProgress(100);
      setVideoUrl(data.url);
      setState("success");

      const fmt = FORMATS.find((f) => f.id === selectedFormat);
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          name: file.name,
          format: fmt?.label || selectedFormat,
          url: data.url,
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev.slice(0, 4),
      ]);
    } catch (error) {
      clearInterval(progressRef.current!);
      setProgress(0);
      const message = error instanceof Error ? error.message : "Erro ao enviar";
      setErrorMessage(message);
      setState("error");
    }
  };

  const reset = () => {
    setFile(null);
    setState("idle");
    setErrorMessage("");
    setVideoUrl("");
    setProgress(0);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isProcessing = state === "uploading" || state === "converting";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0f;
          --surface: #13131a;
          --surface2: #1c1c26;
          --border: #2a2a3a;
          --accent: #7c3aed;
          --accent2: #a855f7;
          --accent3: #ec4899;
          --text: #f0f0f8;
          --muted: #6b6b8a;
          --success: #22d3a5;
          --error: #f43f5e;
        }

        body {
          font-family: 'Syne', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .bg-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .bg-glow {
          position: fixed;
          top: -30%;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 500px;
          background: radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .layout {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 32px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr; }
        }

        header {
          grid-column: 1 / -1;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--accent), var(--accent3));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .logo-text span {
          background: linear-gradient(90deg, var(--accent2), var(--accent3));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .badge {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--muted);
          background: var(--surface2);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 20px;
        }

        /* MAIN CARD */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        /* FORMAT SELECTOR */
        .formats {
          display: flex;
          gap: 10px;
        }

        .format-btn {
          flex: 1;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--muted);
        }

        .format-btn.active {
          background: rgba(124,58,237,0.15);
          border-color: var(--accent);
          color: var(--text);
        }

        .format-btn:hover:not(.active) {
          border-color: var(--muted);
          color: var(--text);
        }

        .format-icon { font-size: 20px; }
        .format-name { font-size: 13px; font-weight: 700; }
        .format-res {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          opacity: 0.6;
        }

        /* DROP ZONE */
        .dropzone {
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s;
          background: transparent;
          position: relative;
          overflow: hidden;
        }

        .dropzone.dragging, .dropzone:hover {
          border-color: var(--accent);
          background: rgba(124,58,237,0.05);
        }

        .dropzone.has-file {
          padding: 0;
          border-style: solid;
          border-color: var(--border);
        }

        .drop-icon {
          font-size: 40px;
          margin-bottom: 12px;
          display: block;
        }

        .drop-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .drop-sub {
          font-size: 13px;
          color: var(--muted);
        }

        .drop-sub strong {
          color: var(--accent2);
        }

        .file-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }

        /* PREVIEW */
        .preview-wrap {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          background: #000;
        }

        .preview-wrap video {
          width: 100%;
          display: block;
          max-height: 280px;
          object-fit: contain;
        }

        .preview-overlay {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 6px;
        }

        .preview-tag {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .change-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .change-btn:hover { background: rgba(0,0,0,0.9); }

        /* PROGRESS */
        .progress-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-status {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent2);
        }

        .progress-pct {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: var(--muted);
        }

        .progress-bar-bg {
          height: 6px;
          background: var(--surface2);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--accent3));
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .progress-steps {
          display: flex;
          gap: 8px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--muted);
          font-family: 'DM Mono', monospace;
        }

        .step.active { color: var(--accent2); }
        .step.done { color: var(--success); }

        .step-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        /* CONVERT BUTTON */
        .convert-btn {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: none;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
          background: linear-gradient(135deg, var(--accent), var(--accent3));
          color: #fff;
          position: relative;
          overflow: hidden;
        }

        .convert-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .convert-btn:hover:not(:disabled)::after { opacity: 1; }
        .convert-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* STATUS MESSAGES */
        .status-msg {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .status-msg.success {
          background: rgba(34,211,165,0.1);
          border: 1px solid rgba(34,211,165,0.3);
          color: var(--success);
        }

        .status-msg.error {
          background: rgba(244,63,94,0.1);
          border: 1px solid rgba(244,63,94,0.3);
          color: var(--error);
        }

        /* DOWNLOAD */
        .download-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .download-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: var(--success);
          color: #0a0a0f;
          text-decoration: none;
          border-radius: 14px;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          transition: opacity 0.2s;
        }

        .download-btn:hover { opacity: 0.9; }

        .new-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .new-btn:hover {
          border-color: var(--accent);
          color: var(--text);
        }

        /* SIDEBAR */
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
        }

        .info-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }

        .spec-row:last-child { border-bottom: none; }

        .spec-label { color: var(--muted); }

        .spec-val {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: var(--accent2);
        }

        /* HISTORY */
        .history-empty {
          text-align: center;
          color: var(--muted);
          font-size: 13px;
          padding: 24px 0;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }

        .history-item:last-child { border-bottom: none; }

        .history-icon {
          width: 36px;
          height: 36px;
          background: rgba(124,58,237,0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .history-info { flex: 1; min-width: 0; }

        .history-name {
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .history-meta {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          margin-top: 2px;
        }

        .history-dl {
          color: var(--success);
          font-size: 16px;
          text-decoration: none;
          flex-shrink: 0;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .history-dl:hover { opacity: 1; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        .pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="bg-grid" />
      <div className="bg-glow" />

      <div className="layout">
        <header>
          <div className="logo">
            <div className="logo-icon">🎬</div>
            <div className="logo-text">Clip<span>Flip</span></div>
          </div>
          <div className="badge">v2.0 · vertical converter</div>
        </header>

        {/* MAIN */}
        <div className="card">
          {/* FORMAT */}
          <div>
            <div className="section-label">Formato de saída</div>
            <div className="formats">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  className={`format-btn ${selectedFormat === f.id ? "active" : ""}`}
                  onClick={() => setSelectedFormat(f.id)}
                  disabled={isProcessing}
                >
                  <span className="format-icon">{f.icon}</span>
                  <span className="format-name">{f.label}</span>
                  <span className="format-res">{f.res}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DROP ZONE / PREVIEW */}
          <div>
            <div className="section-label">Vídeo</div>
            {!previewUrl ? (
              <div
                className={`dropzone ${dragging ? "dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="file-input"
                  accept={UPLOAD_CONFIG.allowedMimeTypes.join(",")}
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
                <span className="drop-icon">⬆</span>
                <div className="drop-title">Arraste ou clique para enviar</div>
                <div className="drop-sub">
                  <strong>{UPLOAD_CONFIG.allowedExtensions.join(", ")}</strong> · máx {UPLOAD_CONFIG.maxSizeMB}MB
                </div>
              </div>
            ) : (
              <div className="preview-wrap">
                <video src={previewUrl} controls />
                <div className="preview-overlay">
                  <span className="preview-tag">
                    {(file!.size / (1024 * 1024)).toFixed(1)}MB
                  </span>
                  <span className="preview-tag">
                    {file!.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
                {!isProcessing && state !== "success" && (
                  <button className="change-btn" onClick={reset}>Trocar vídeo</button>
                )}
              </div>
            )}
          </div>

          {/* PROGRESS */}
          {isProcessing && (
            <div className="progress-wrap">
              <div className="progress-header">
                <span className="progress-status pulse">
                  {state === "uploading" ? "Enviando..." : "Convertendo..."}
                </span>
                <span className="progress-pct">{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-steps">
                <span className={`step ${progress >= 40 ? "done" : progress > 0 ? "active" : ""}`}>
                  <span className="step-dot" /> Upload
                </span>
                <span className={`step ${progress >= 90 ? "done" : progress >= 40 ? "active" : ""}`}>
                  <span className="step-dot" /> Conversão
                </span>
                <span className={`step ${progress >= 100 ? "done" : ""}`}>
                  <span className="step-dot" /> Pronto
                </span>
              </div>
            </div>
          )}

          {/* STATUS */}
          {state === "success" && (
            <div className="status-msg success">✓ Conversão concluída com sucesso!</div>
          )}
          {state === "error" && (
            <div className="status-msg error">✕ {errorMessage}</div>
          )}

          {/* DOWNLOAD */}
          {state === "success" && videoUrl && (
            <div className="download-section">
              <a href={videoUrl} download className="download-btn">
                ⬇ Baixar vídeo convertido
              </a>
              <button className="new-btn" onClick={reset}>+ Converter outro vídeo</button>
            </div>
          )}

          {/* CONVERT BUTTON */}
          {state !== "success" && (
            <button
              className="convert-btn"
              onClick={handleUpload}
              disabled={!file || isProcessing}
            >
              {isProcessing ? (
                <><span className="spinner" />Processando...</>
              ) : (
                "Converter →"
              )}
            </button>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="sidebar">
          {/* SPECS */}
          <div className="info-card">
            <div className="info-title">📐 Especificações</div>
            {(() => {
              const fmt = FORMATS.find((f) => f.id === selectedFormat)!;
              return (
                <>
                  <div className="spec-row">
                    <span className="spec-label">Resolução</span>
                    <span className="spec-val">{fmt.res}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Proporção</span>
                    <span className="spec-val">{fmt.ratio}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Codec</span>
                    <span className="spec-val">H.264</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Áudio</span>
                    <span className="spec-val">AAC 128k</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Tamanho máx.</span>
                    <span className="spec-val">{UPLOAD_CONFIG.maxSizeMB}MB</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* HISTORY */}
          <div className="info-card">
            <div className="info-title">🕓 Histórico</div>
            {history.length === 0 ? (
              <div className="history-empty">Nenhuma conversão ainda</div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">🎬</div>
                  <div className="history-info">
                    <div className="history-name">{item.name}</div>
                    <div className="history-meta">{item.format} · {item.time}</div>
                  </div>
                  <a href={item.url} download className="history-dl">⬇</a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
