"use client";

import { useState } from "react";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setStatus("Selecione um vídeo");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    setStatus("Processando...");

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setVideoUrl(data.url);
      setStatus("Pronto!");
    } catch {
      setStatus("Erro ao enviar");
    }
  };

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

        <input
          type="file"
          accept="video/mp4"
          onChange={(e) => {
  if (e.target.files && e.target.files.length > 0) {
    setFile(e.target.files[0]);
  }
}}
        />

        <br /><br />

        {file && (
          <video width="100%" controls>
            <source src={URL.createObjectURL(file)} />
          </video>
        )}

        <br /><br />

        <button onClick={handleUpload}>
          Converter
        </button>

        <p>{status}</p>

        {videoUrl && (
          <a href={videoUrl} download>
            ⬇️ Baixar vídeo
          </a>
        )}
      </div>
    </div>
  );
}