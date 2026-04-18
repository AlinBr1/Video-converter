# Guia de Deploy - Video Converter TikTok

## 📦 Fase 1.3 - Correções do Backend (CONCLUÍDA)

Todos os arquivos corrigidos do backend estão em `backend-fixed/`:
- ✅ `main.py` - corrigido e validado
- ✅ `requirements.txt` - enxuto
- ✅ `Dockerfile` - com FFmpeg
- ✅ `Procfile` - renomeado e corrigido
- ✅ `railway.json` - simplificado

## 🚀 Fase 1.4 - Deploy do Backend no Railway

### Passo 1: Substituir arquivos no repositório backend

```bash
# Clone o repositório do backend
git clone https://github.com/AlinBr1/Backend
cd Backend

# Copie os arquivos corrigidos de backend-fixed/
# (copiar main.py, requirements.txt, Dockerfile, Procfile, railway.json)

# Delete o Procfile.py antigo se existir
rm Procfile.py

# Commit e push
git add .
git commit -m "fix: corrigir bugs críticos e deploy Railway"
git push origin main
```

### Passo 2: Verificar deploy no Railway

1. Acesse o dashboard do Railway
2. Aguarde o rebuild automático
3. Verifique os logs de build:
   - ✅ FFmpeg instalado
   - ✅ Dependencies instaladas
   - ✅ Gunicorn iniciado

4. Teste o healthcheck:
```bash
curl https://backend-alinbr1.up.railway.app/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "ffmpeg": true,
  "folders": {
    "uploads": true,
    "outputs": true
  }
}
```

### Passo 3: Atualizar CORS (se necessário)

Se o domínio Vercel for diferente, edite `main.py` linha 22:
```python
CORS(app, origins=[
    "http://localhost:3000",
    "https://SEU-DOMINIO.vercel.app",  # ← Substituir
    "https://backend-alinbr1.up.railway.app"
])
```

## 🌐 Fase 1.5 - Deploy do Frontend na Vercel

### Passo 1: Criar projeto na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New Project"
3. Conecte o repositório do GitHub (frontend)
4. Clique em "Import"

### Passo 2: Configurar variáveis de ambiente

Na página de configuração do projeto:

**Environment Variables:**
- Key: `NEXT_PUBLIC_API_BASE_URL`
- Value: `https://backend-alinbr1.up.railway.app`
- Environments: Production, Preview, Development (marcar todos)

### Passo 3: Deploy

1. Clique em "Deploy"
2. Aguarde o build (deve levar ~2-3 minutos)
3. Verifique se o build passou sem erros

### Passo 4: Testar a integração

1. Acesse a URL do deploy (ex: `https://video-converter-xyz.vercel.app`)
2. Teste o upload de um vídeo pequeno
3. Verifique se a conversão funciona
4. Teste o download

## ✅ Verificação Final (Fase 1 Completa)

### Backend
- [ ] Railway inicia sem erro
- [ ] `/health` retorna status healthy
- [ ] FFmpeg instalado e funcionando
- [ ] CORS permite frontend Vercel

### Frontend
- [ ] Build passa sem erros de TypeScript
- [ ] Variável de ambiente configurada
- [ ] Upload funciona
- [ ] Validação de arquivo funciona
- [ ] Loading states aparecem
- [ ] Download funciona

### Integração
- [ ] Upload do frontend chega no backend
- [ ] Conversão é executada com sucesso
- [ ] URL de download é retornada corretamente
- [ ] Download do vídeo convertido funciona

## 🐛 Troubleshooting

### Backend não inicia no Railway

1. **Verificar logs de build:**
   ```
   Railway Dashboard > Deployments > Build Logs
   ```

2. **Problemas comuns:**
   - FFmpeg não instalado → verificar Dockerfile
   - Erro de módulo → verificar requirements.txt
   - Porta incorreta → verificar CMD no Dockerfile
   - Procfile.py ainda existe → deletar e usar Procfile

### Frontend não conecta ao backend

1. **Verificar variável de ambiente:**
   ```
   Vercel Dashboard > Settings > Environment Variables
   ```

2. **Testar localmente:**
   ```bash
   # .env.local deve ter:
   NEXT_PUBLIC_API_BASE_URL=https://backend-alinbr1.up.railway.app
   
   npm run dev
   ```

3. **Verificar CORS:**
   - Abrir DevTools (F12)
   - Verificar Console para erros de CORS
   - Atualizar origins em `main.py` se necessário

### Conversão falha

1. **Arquivo muito grande:**
   - Limite: 500MB
   - Timeout: 120s

2. **Formato não suportado:**
   - Apenas: mp4, mov, avi, mkv

3. **Verificar logs do Railway:**
   - FFmpeg stderr será retornado no erro

## 📋 Próximos Passos (Fase 2+)

Após a Fase 1 estar funcional:

1. **Fase 2**: Melhorar UI/UX
   - Redesign profissional
   - Drag & drop
   - Progress bar
   - Responsivo

2. **Fase 3**: Adicionar autenticação
   - NextAuth.js
   - Login/registro
   - Sessões

3. **Fase 4**: Monetização
   - Stripe
   - Planos free/paid
   - Limites de uso

4. **Fase 5**: Features extras
   - Histórico
   - Dashboard
   - Analytics

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs do Railway e Vercel
2. Testar endpoints individualmente
3. Consultar `plan.md` para detalhes técnicos
4. Verificar `backend-fixed/README.md` para troubleshooting do backend
