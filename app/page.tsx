"use client";

import { useState } from "react";
import { API_BASE_URL, UPLOAD_CONFIG } from "@/lib/config";

type UploadState = "idle" | "uploading" | "converting" | "success" | "error";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const validateFile = (file: File): string | null => {
    // Validar tamanho
    if (file.size > UPLOAD_CONFIG.maxSizeBytes) {
      return `Arquivo muito grande. Máximo: ${UPLOAD_CONFIG.maxSizeMB}MB`;
    }

    // Validar extensão
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !(UPLOAD_CONFIG.allowedExtensions as readonly string[]).includes(extension)) {
      return `Formato não permitido. Use: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`;
    }

    // Validar MIME type
    if (!(UPLOAD_CONFIG.allowedMimeTypes as readonly string[]).includes(file.type)) {
      return `Tipo de arquivo inválido. Envie apenas vídeos.`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const error = validateFile(selectedFile);
      
      if (error) {
        setErrorMessage(error);
        setState("error");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setState("idle");
      setErrorMessage("");
      setVideoUrl("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Selecione um vídeo");
      setState("error");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    setState("uploading");
    setErrorMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || `Erro ${res.status}`);
      }

      setState("converting");

      const data = await res.json();
      
      if (!data.url) {
        throw new Error("URL do vídeo não retornada");
      }

      setVideoUrl(data.url);
      setState("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar";
      setErrorMessage(message);
      setState("error");
    }
  };

  const getStatusMessage = () => {
    switch (state) {
      case "uploading":
        return "Enviando vídeo...";
      case "converting":
        return "Convertendo para TikTok...";
      case "success":
        return "Conversão concluída!";
      case "error":
        return errorMessage || "Erro ao processar";
      default:
        return "";
    }
  };

  const isProcessing = state === "uploading" || state === "converting";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f5f5f5"
    }}>
      <div style={{
        background: "#fff",
        padding: 20,
        borderRadius: 10,
        width: 350,
        textAlign: "center",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)"
      }}>
        <h2>🎬 Converter para TikTok</h2>

        <p style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
          Formatos: {UPLOAD_CONFIG.allowedExtensions.join(', ')} | Máx: {UPLOAD_CONFIG.maxSizeMB}MB
        </p>

        <input
          type="file"
          accept={UPLOAD_CONFIG.allowedMimeTypes.join(',')}
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        <br /><br />

        {file && state !== "error" && (
          <video width="100%" controls>
            <source src={URL.createObjectURL(file)} />
          </video>
        )}

        <br /><br />

        <button 
          onClick={handleUpload}
          disabled={!file || isProcessing}
          style={{
            opacity: (!file || isProcessing) ? 0.5 : 1,
            cursor: (!file || isProcessing) ? "not-allowed" : "pointer"
          }}
        >
          {isProcessing ? "Processando..." : "Converter"}
        </button>

        {getStatusMessage() && (
          <p style={{ 
            color: state === "error" ? "#ef4444" : state === "success" ? "#10b981" : "#666",
            fontWeight: 500,
            marginTop: 10
          }}>
            {getStatusMessage()}
          </p>
        )}

        {videoUrl && state === "success" && (
          <a 
            href={videoUrl} 
            download
            style={{
              display: "inline-block",
              marginTop: 15,
              padding: "10px 20px",
              background: "#10b981",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 5,
              fontWeight: 500
            }}
          >
            ⬇️ Baixar vídeo
          </a>
        )}
      </div>
    </div>
  );
}