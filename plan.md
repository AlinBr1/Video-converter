# Plano de Implementação: Video Converter TikTok

## Objetivo
Transformar o projeto **Video Converter TikTok** em uma plataforma funcional, visualmente profissional e pronta para monetização, cobrindo:
- Correção dos bugs atuais e deploy funcional do backend no Railway e frontend na Vercel
- Evolução de UI/UX
- Autenticação
- Planos pagos e limites de uso
- Histórico, dashboard e analytics

## Contexto Analisado

### Frontend (Next.js 16.2.3 em `C:\Users\anacl\Video-converter`)
**Stack atual:**
- Next.js 16.2.3 (App Router)
- React 19.2.4
- Tailwind CSS 4
- TypeScript 5

**Estrutura:**
- `app/page.tsx` - componente principal do upload
- `app/layout.tsx` - layout global com fontes Geist
- `app/globals.css` - Tailwind v4 config inline
- Sem componentes auxiliares, helpers ou lib

**Problemas identificados em `app/page.tsx`:**
1. ❌ URL do backend sem protocolo: `"backend-alinbr1.up.railway.app/upload"` (linha 22)
2. ❌ Link de download usa variável `{videoUrl}` diretamente, mas pode não funcionar se a URL for relativa
3. ❌ Sem validação de tipo/tamanho de arquivo
4. ❌ Sem loading state durante upload
5. ❌ Sem desabilitação do botão durante processamento
6. ❌ Apenas aceita `video/mp4` no input, mas não valida no código
7. ❌ Sem tratamento de erro estruturado
8. ❌ Sem variável de ambiente para URL do backend

### Backend Flask (`https://github.com/AlinBr1/Backend`)
**Arquivos principais:**
- `main.py` - aplicação Flask
- `Dockerfile` - build com FFmpeg
- `Procfile.py` - ⚠️ nome incorreto (deveria ser `Procfile`)
- `railway.json` - configuração Railway
- `requirements.txt` - dependências

**Problemas críticos identificados:**
1. ❌ Rota `/outputs/<filename>` com erro de sintaxe na última linha do arquivo
2. ❌ Sem tratamento de erro do FFmpeg
3. ❌ Sem validação de arquivos enviados
4. ❌ Uploads não são limpos após conversão
5. ❌ Possível erro no entrypoint WSGI (deve ser `main:app` e não `app:app`)
6. ❌ `Procfile.py` deveria ser `Procfile` (sem extensão)
7. ❌ FFmpeg deve ser instalado via Dockerfile
8. ❌ Dependencies desnecessárias no requirements.txt

---

# Fase 1 — Fix bugs + deploy funcional

## 1.1 ✅ Auditoria técnica inicial do frontend
**Resultado:**
- Next.js 16.2.3 com App Router
- Tailwind CSS v4 com config inline
- Sem helpers ou lib customizados
- Contrato FE/BE mapeado:
  - POST `/upload` com FormData field `video`
  - Resposta esperada: `{ url: string }`
  - Download via URL retornada

## 1.2 Correções urgentes do frontend

### Alvos
- `app/page.tsx`
- Criar `.env.local.example`
- Atualizar `next.config.ts` para variáveis públicas

### Tarefas
- [ ] Adicionar protocolo HTTPS na URL do backend
- [ ] Criar variável de ambiente `NEXT_PUBLIC_API_BASE_URL`
- [ ] Adicionar validação de extensões permitidas (mp4, mov, avi, mkv)
- [ ] Adicionar validação de tamanho máximo (500MB)
- [ ] Adicionar estados: idle, uploading, converting, success, error
- [ ] Desabilitar botão durante processamento
- [ ] Melhorar feedback de erro
- [ ] Corrigir link de download para usar URL completa retornada

### Verificações
- Upload de arquivo válido funciona
- Tentativa com arquivo inválido mostra erro
- Tentativa com arquivo acima do limite mostra erro
- Feedback visual durante processamento
- Download funciona em produção

## 1.3 Correções urgentes do backend

### Alvos
- `main.py`
- `requirements.txt`

### Tarefas
- [ ] Corrigir rota `/outputs/<filename>` (erro de sintaxe)
- [ ] Adicionar `from werkzeug.utils import secure_filename`
- [ ] Validar campo `video` no request
- [ ] Validar extensão com whitelist
- [ ] Definir `MAX_CONTENT_LENGTH = 500 * 1024 * 1024`
- [ ] Envolver FFmpeg com tratamento de erro e captura de stderr
- [ ] Verificar se arquivo de saída existe antes de responder
- [ ] Limpar arquivo original após conversão
- [ ] Usar `uuid.uuid4()` em vez de timestamp
- [ ] Adicionar rota `/health`
- [ ] Revisar CORS para domínio Vercel
- [ ] Reduzir requirements.txt ao mínimo

### Verificações
- Upload e conversão com arquivo válido
- Erro claro quando FFmpeg falhar
- Rota de download 200/404 adequados
- Healthcheck respondendo

## 1.4 Diagnóstico e correção do deploy no Railway

### Problema principal identificado
**Inconsistência entre:**
- Nome do arquivo: `main.py`
- Referência WSGI esperada: `app:app` vs `main:app`
- `Procfile.py` com extensão incorreta
- Conflito Dockerfile + railway.json

### Tarefas
- [ ] Renomear `Procfile.py` → `Procfile`
- [ ] Corrigir entrypoint: `gunicorn main:app --bind 0.0.0.0:$PORT`
- [ ] Escolher Dockerfile como estratégia única
- [ ] Garantir instalação do FFmpeg no Dockerfile
- [ ] Adicionar healthcheck no Dockerfile
- [ ] Simplificar railway.json ou removê-lo
- [ ] Limpar requirements.txt

### Dockerfile esperado
```dockerfile
FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD exec gunicorn main:app --bind 0.0.0.0:${PORT} --workers 4 --timeout 120
```

## 1.5 Deploy do frontend na Vercel

### Tarefas
- [ ] Criar `.env.local.example` documentando variáveis
- [ ] Configurar `NEXT_PUBLIC_API_BASE_URL` na Vercel
- [ ] Atualizar metadados em `app/layout.tsx`
- [ ] Validar build local antes de deploy
- [ ] Configurar domínio/headers se necessário

### Verificações
- Build sem erro na Vercel
- Upload do frontend alcança backend
- Download funcional via URL pública

## Definição de pronto da Fase 1
- ✅ Frontend publica e converte com backend real
- ✅ Backend inicia no Railway sem erro
- ✅ Upload inválido retorna erro amigável
- ✅ Processamento com falha retorna erro consistente
- ✅ Download funciona com URL correta
- ✅ Sem hardcodes locais

---

# Fase 2 — UI/UX profissional

## Objetivo
Transformar o frontend de MVP funcional em landing/app moderna e confiável.

## 2.1 Redesenho da experiência principal

### Alvos
- `app/page.tsx`
- Criar componentes reutilizáveis
- Melhorar estilos globais

### Tarefas
- [ ] Separar homepage em seções:
  - Hero com proposta de valor
  - Área de upload destacada
  - Preview do fluxo
  - Benefícios
  - Pricing teaser
  - FAQ
- [ ] Criar componente dedicado de upload com drag & drop
- [ ] Estados visuais ricos:
  - Progresso com barra/porcentagem
  - Skeleton/spinner
  - Sucesso com CTA de download
  - Erro com retry
- [ ] Responsividade mobile-first
- [ ] Melhorar contraste, espaçamento, hierarquia tipográfica
- [ ] Microinterações e transições

### Tech choices
- Manter Tailwind CSS 4
- Componentes próprios (evitar lib pesada)
- Design tokens consolidados

## 2.2 Estrutura visual e branding

### Tarefas
- [ ] Definir paleta e identidade visual
- [ ] Padronizar botões, inputs, cards, alerts, badges
- [ ] Criar componentes reutilizáveis
- [ ] Preparar base para telas futuras

## 2.3 UX de confiança e conversão

### Tarefas
- [ ] Mostrar formatos aceitos e limite antes do upload
- [ ] Exibir tempo esperado qualitativamente
- [ ] Mensagens de privacidade/retenção
- [ ] Otimizar textos para conversão

## Definição de pronto da Fase 2
- ✅ Interface profissional em desktop e mobile
- ✅ Fluxo principal claro e confiável
- ✅ Componentes reutilizáveis prontos

---

# Fase 3 — Autenticação

## Objetivo
Introduzir contas de usuário para suportar histórico, limites e cobrança.

## 3.1 Modelo de autenticação

### Tech choice recomendada
- NextAuth.js / Auth.js compatível com Next.js 16+
- Banco PostgreSQL para usuários e sessões

### Alternativa
- JWT próprio emitido pelo backend Flask

### Escolha preferencial
**Centralizar auth no frontend/edge Next.js**

## 3.2 Tarefas

### Frontend
- [ ] Instalar e configurar NextAuth.js
- [ ] Criar páginas de login e registro
- [ ] Proteger rotas privadas
- [ ] Propagar token ao backend

### Backend
- [ ] Aceitar e validar token nas rotas protegidas
- [ ] Associar conversões a usuários
- [ ] Registrar consumo por usuário

### Dados
- [ ] Provisionar PostgreSQL
- [ ] Criar schema de usuários
- [ ] Migrar histórico de conversões

## Definição de pronto da Fase 3
- ✅ Usuário cria conta e entra
- ✅ Conversões vinculadas ao usuário
- ✅ Rotas privadas exigem autenticação

---

# Fase 4 — Pagamento e limites de uso

## Objetivo
Monetizar com free tier e planos pagos.

## 4.1 Modelo de monetização

### Free tier
- 10 conversões/mês
- Limite 100MB/vídeo
- Processamento padrão

### Planos pagos
**Basic ($9/mês):**
- 100 conversões/mês
- Limite 500MB/vídeo
- Sem fila

**Pro ($29/mês):**
- Conversões ilimitadas
- Limite 2GB/vídeo
- Prioridade de processamento
- Histórico expandido

## 4.2 Provider de pagamento
**Stripe** - integração com Vercel/Next.js

## 4.3 Tarefas

### Dados
- [ ] Criar tabela de planos
- [ ] Criar tabela de assinaturas
- [ ] Criar tabela de uso

### Frontend
- [ ] Criar página de pricing
- [ ] Integrar Stripe Checkout
- [ ] Portal do cliente

### Backend
- [ ] Validar cota antes de conversão
- [ ] Registrar uso
- [ ] Processar webhooks Stripe
- [ ] Bloquear quando limite atingido

## Definição de pronto da Fase 4
- ✅ Usuário free tem limite aplicado
- ✅ Upgrade e renovação funcionam
- ✅ Bloqueios aplicados no backend

---

# Fase 5 — Features extras

## Objetivo
Adicionar retenção, visibilidade e valor recorrente.

## 5.1 Histórico do usuário

### Tarefas
- [ ] Listar conversões anteriores
- [ ] Mostrar status, data, arquivo
- [ ] Re-download enquanto disponível
- [ ] Política de retenção clara

## 5.2 Dashboard do usuário

### Tarefas
- [ ] Exibir consumo do plano
- [ ] Mostrar conversões realizadas
- [ ] Informar limite restante
- [ ] Destacar upgrade

## 5.3 Analytics e observabilidade

### Tarefas
- [ ] Registrar eventos principais:
  - Upload iniciado/falhou
  - Conversão concluída
  - Download clicado
  - Limite atingido
  - Checkout iniciado/concluído
- [ ] Monitoramento de erros
- [ ] Medir taxa de sucesso

## 5.4 Melhorias técnicas futuras

### Tarefas
- [ ] Mover para storage objeto (S3/R2)
- [ ] Conversão assíncrona com fila
- [ ] Worker dedicado
- [ ] Gerar thumbnail/preview

## Definição de pronto da Fase 5
- ✅ Usuário vê histórico e consumo
- ✅ Equipe mede uso, falhas e conversão
- ✅ Base preparada para escalar

---

# Escolhas Técnicas

## Frontend
- **Next.js 16.2.3** com App Router
- **Tailwind CSS 4**
- **TypeScript 5**
- Variáveis públicas para URL do backend

## Backend
- **Flask** para MVP
- **Gunicorn** em produção
- **FFmpeg** via Dockerfile

## Infra
- **Vercel** para frontend
- **Railway** para backend
- **PostgreSQL** a partir da Fase 3

## Pagamentos
- **Stripe**

---

# Prioridades

## Prioridade máxima
1. Corrigir start do backend no Railway
2. Corrigir rota de download
3. Remover hardcodes do frontend
4. Upload/download ponta a ponta

## Prioridade alta
1. Validação de arquivos
2. Loading/error states
3. CORS de produção
4. Healthcheck
5. Requirements enxuto

## Prioridade média
1. Redesign profissional
2. Autenticação
3. Estrutura de planos

## Prioridade seguinte
1. Histórico, dashboard, analytics
2. Fila assíncrona
3. Storage persistente

---

# Riscos e Mitigação

## Risco: Deploy Railway continua falhando
**Mitigação:** Alinhar estratégia única (Dockerfile), revisar logs, reduzir deps

## Risco: Filesystem efêmero apaga outputs
**Mitigação:** Aceitar na Fase 1, documentar retenção curta, migrar para object storage depois

## Risco: Conversão síncrona causa timeout
**Mitigação:** Manter vídeos curtos e limite de tamanho, mover para fila quando necessário

---

# Traceabilidade

| Etapa | Alvos principais | Verificação |
|---|---|---|
| Fase 1.1 | `app/page.tsx`, `package.json`, componentes | Contrato FE/BE mapeado |
| Fase 1.2 | UI de upload e config de API | Upload, erro, loading, download |
| Fase 1.3 | `main.py`, `requirements.txt` | Conversão válida, erro, healthcheck |
| Fase 1.4 | `Dockerfile`, `Procfile`, `railway.json` | Backend inicia no Railway |
| Fase 1.5 | Config Vercel + envs | Frontend integra com backend |
| Fase 2 | Homepage, componentes, estilos | UX profissional e responsiva |
| Fase 3 | Auth pages, sessão, usuário | Login e recursos protegidos |
| Fase 4 | Pricing, billing, limites | Free tier e assinatura |
| Fase 5 | Histórico, dashboard, analytics | Retenção e métricas |

---

# Status Atual
- ✅ Plano aprovado e salvo
- 🚧 Fase 1.1 concluída (auditoria frontend)
- ⏳ Próximo: Fase 1.2 (correções frontend)
