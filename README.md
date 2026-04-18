# Video Converter TikTok

Plataforma de conversão de vídeos para o formato vertical do TikTok (1080x1920).

## 🚀 Stack

### Frontend
- Next.js 16.2.3 (App Router)
- React 19.2.4
- Tailwind CSS 4
- TypeScript 5
- Deploy: Vercel

### Backend
- Flask (Python)
- FFmpeg para conversão
- Gunicorn
- Deploy: Railway

## 📋 Pré-requisitos

- Node.js 20+
- npm ou pnpm

## 🛠️ Configuração Local

1. Clone o repositório:
```bash
git clone <repo-url>
cd video-converter
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.local.example .env.local
```

Edite `.env.local` e configure a URL do backend:
```
NEXT_PUBLIC_API_BASE_URL=https://backend-alinbr1.up.railway.app
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📦 Deploy

### Frontend (Vercel)

1. Conecte o repositório na Vercel
2. Configure a variável de ambiente:
   - `NEXT_PUBLIC_API_BASE_URL`: URL do backend no Railway

### Backend (Railway)

Ver documentação no repositório: https://github.com/AlinBr1/Backend

## 🎯 Funcionalidades Atuais (Fase 1)

- ✅ Upload de vídeos (mp4, mov, avi, mkv)
- ✅ Validação de formato e tamanho (máx 500MB)
- ✅ Conversão para formato TikTok (1080x1920)
- ✅ Download do vídeo convertido
- ✅ Estados de loading e erro
- ✅ Validação no cliente e servidor

## 📝 Roadmap

Ver `plan.md` para o plano completo de desenvolvimento.

### Próximas Fases
- **Fase 2**: UI/UX profissional com design moderno
- **Fase 3**: Autenticação de usuários
- **Fase 4**: Planos pagos e limites de uso
- **Fase 5**: Histórico, dashboard e analytics

## 🐛 Problemas Conhecidos

- Backend pode ter filesystem efêmero (arquivos convertidos são temporários)
- Conversão é síncrona (pode ter timeout em vídeos muito grandes)

## 📄 Licença

MIT
