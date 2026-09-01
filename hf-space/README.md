# ANM CM Solver — Hugging Face Space

Serviço grátis em Python (FastAPI) que fala com o Cadastro Mineiro (SCM) da ANM
pelo IP do Hugging Face e resolve o captcha localmente com **ddddocr** (OCR de
deep learning, sem GPU).

Motivo: a ANM bloqueia o egresso de clouds estrangeiras (Vercel/Render); o
Hugging Face geralmente **não** está nesses bloqueios. Este Space faz o acesso
à ANM **e** o captcha num único serviço.

## Arquitetura

```
Navegador → Vercel (Next.js) → este Space (FastAPI + ddddocr) → sistemas.anm.gov.br
```

O Vercel só precisa da env `ANM_SOLVER_URL` (se não existir, o app mantém o
fluxo local atual por aqui).

## Endpoints

| Endpoint | Método | Uso |
|---|---|---|
| `/health` | GET | Autoteste alcançando a ANM (primeira coisa a validar) |
| `/anm/cm/consultar` | POST | Consulta no SCM. Sem `codigo` tenta OCR automático; com `codigo`+sessão usa o código informado |
| `/anm/probe` | POST | Testa alcance de uma URL `*.anm.gov.br` (ex.: SEI) |

Body de `/anm/cm/consultar`:

```json
{ "numero": "866.123/2024", "codigo": "ab12", "cookies": "...", "viewState": "...", "viewStateGen": "...", "eventValidation": "..." }
```

`codigo`/sessão são opcionais (primeira chamada = só `numero`).

## Passo a passo (deploy grátis)

1. **Crie a conta** em https://huggingface.co/join (grátis, sem cartão).

2. **Crie o Space:** https://huggingface.co/new-space
   - Name: `anm-solver`
   - SDK: **Docker**, Hardware: **CPU basic** (grátis)
   - Visibilidade: Private (só você) ou Public — como vamos usar token, Public serve.

3. **Envie os arquivos** deste diretório (`app.py`, `Dockerfile`,
   `requirements.txt`, `README.md`).
   - Jeito fácil (Smart WebUI): na aba **Files** do Space, use **Add file →
     Upload files** e envie os 4.
   - Jeito git: clone o repo do Space e dê push.

4. **Variável de ambiente (opcional, recomendado):** Settings → **Variables and
   secrets** → adicione `SOLVER_TOKEN` com um valor secreto. Ele será exigido
   no header `X-Solver-Token` (o Next.js envia via `ANM_SOLVER_TOKEN`).

5. **Build:** o Space roda o `Dockerfile` automaticamente (1–3 min na primeira
   vez; aparece o log ao vivo em Logs).

6. **Teste de alcance (o passo mais importante):**
   ```bash
   curl "https://SEU-USER-anm-solver.hf.space/health"
   ```
   Se vier `"ok": true`, o IP do HF passa no WAF da ANM — sucesso total.
   Se `"ok": false`, o bloqueio atinge o HF também e o deploy não resolve o caso.

7. **Configure o Vercel:**
   - `ANM_SOLVER_URL` = `https://SEU-USER-anm-solver.hf.space`
   - `ANM_SOLVER_TOKEN` = valor do `SOLVER_TOKEN` criado acima (se tiver criado)
   - Redeploy e pronto.

## Manutenção do plano free

- O Space free **dorme** depois de ~48h sem uso e acorda no próximo acesso
  (primeira chamada pode dar erro/timeout no cold start).
- Para mantê-lo acordado em produção use um monitor gratuito que dê **um GET no
  `/health` a cada 15–30 min** (ex.: UptimeRobot, cron de um PC ligado) — ou
  troque para hardware pago quando fizer sentido.
- Conta free roda ~8 Spaces CPU em paralelo; pause os não usados.

## Teste local (opcional)

```bash
cd hf-space
python -m venv .venv && . .venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn app:app --port 7860
curl "http://localhost:7860/health"
```