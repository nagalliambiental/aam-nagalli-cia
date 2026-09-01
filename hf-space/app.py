import os
import re
import unicodedata
from base64 import b64encode

import ddddocr
import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
BASE = "https://sistemas.anm.gov.br"
URL_CM = f"{BASE}/SCM/extra/site/admin/dadosProcesso.aspx"
TOKEN = os.environ.get("SOLVER_TOKEN", "")

app = FastAPI(title="ANM CM Solver", version="1.0.0")

LABELS_CM = [
    "NUP", "Acesso SEI", "Área (ha)", "Tipo de requerimento", "Fase atual", "Ativo",
    "Superintendência", "UF", "Unidade protocolizadora", "Data Protocolo", "Data Prioridade",
    "Pessoas relacionadas", "Número do processo de Cadastro da Empresa", "Títulos",
    "Substâncias", "Municípios", "Condição de propriedade do solo", "Processos associados",
    "Documentos que compõem o processo", "Eventos",
]
ALPHANUM_RE = re.compile(r"^[A-Za-z0-9]{3,6}$")

_ocr = None


def get_ocr():
    global _ocr
    if _ocr is None:
        try:
            _ocr = ddddocr.DdddOcr(show_ad=False, beta=True)
        except Exception:
            _ocr = None
    return _ocr


def verificar_token(x_solver_token: str = Header(default="")):
    if TOKEN and x_solver_token != TOKEN:
        raise HTTPException(status_code=401, detail="Token inválido")


# ---------------------------------------------------------------------------
# Helpers de parse (espelham a lógica da rota Next.js atual)
# ---------------------------------------------------------------------------

def extract_input(html: str, name: str) -> str:
    esc = re.escape(name)
    m = re.search(rf'name="{esc}"[^>]*?value="([^"]*)"', html)
    if not m:
        m = re.search(rf'value="([^"]*)"[^>]*?name="{esc}"', html)
    return m.group(1) if m else ""


def extract_captcha_guid(html: str):
    m = re.search(r"CaptchaImage\.aspx\?guid=([a-f0-9\-]+)", html, re.I)
    return m.group(1) if m else None


def texto_plano(html: str) -> str:
    t = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    t = re.sub(r"<style[\s\S]*?</style>", " ", t, flags=re.I)
    t = re.sub(r"<br\s*/?>", " ", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = t.replace("&nbsp;", " ").replace("&amp;", "&")
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def _esc_label(label: str) -> str:
    return re.sub(r"\s+", r"\\s+", label).replace("(", "\\(").replace(")", "\\)")


def parse_pares(html: str):
    texto = texto_plano(html)
    alt = "|".join(_esc_label(l) for l in LABELS_CM)
    # Fronteira por espaço/início (sem \b): em JS \b é ASCII-only e "Área"
    # começa com Á (não-\w); assim o comportamento é idêntico em Python e JS.
    pattern = rf"(?:^|\s)({alt})\s*:\s*([\s\S]*?)(?=\s+(?:{alt})\s*:|$)"
    mapa = {}
    for m in re.finditer(pattern, texto, re.I):
        key = m.group(1).strip().lower()
        val = re.sub(r"\s+", " ", m.group(2).strip())
        if key and val:
            mapa[key] = val
    return mapa


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)


def extrair_valor(html: str, label: str) -> str:
    mapa = parse_pares(html)
    alvo = _norm(label)
    for k, v in mapa.items():
        if _norm(k) == alvo:
            v = re.sub(r"https?://\S+", "", v)
            v = re.sub(r"Clique aqui", "", v, flags=re.I)
            return v.strip()
    return ""


def extract_sei_url(html: str):
    m = re.search(r'href=["\'](https://sei\.anm\.gov\.br/sei/[^"\']+)["\']', html, re.I)
    if m:
        return m.group(1)
    m = re.search(r'href=["\'](/sei/[^"\']+)["\']', html, re.I)
    if m:
        return "https://sei.anm.gov.br" + m.group(1)
    return None


def extrair_substancias_grid(html: str) -> str:
    m = re.search(r'<table[^>]*id="ctl00_conteudo_gridSubstancias"[\s\S]*?</table>', html, re.I)
    if not m:
        return ""
    tbl = m.group(0)
    itens = []
    for row in re.findall(r"<tr[\s>][\s\S]*?</tr>", tbl, re.I):
        if re.search(r"<th[ >]", row, re.I):
            continue
        tds = re.findall(r"<td[^>]*>([\s\S]*?)</td>", row, re.I)
        if not tds:
            continue
        nome = texto_plano(re.sub(r"<input[^>]*>", "", tds[0], flags=re.I))
        uso = texto_plano(re.sub(r"<input[^>]*>", "", tds[1], flags=re.I)) if len(tds) > 1 else ""
        item = f"{nome} ({uso})" if uso and nome else nome
        if item and item not in itens:
            itens.append(item)
    return ", ".join(itens)


def parse_resposta(html: str, numero: str):
    area_txt = extrair_valor(html, "Área (ha)")
    mm = re.search(r"[\d.,]+", area_txt)
    area_ha = None
    if mm:
        v = re.sub(r"\.(?=\d{3})", "", mm.group(0)).replace(",", ".")
        try:
            area_ha = float(v)
        except ValueError:
            area_ha = None
    dados = {
        "numero": numero,
        "nup": extrair_valor(html, "NUP") or None,
        "areaHa": area_ha,
        "fase": extrair_valor(html, "Fase atual") or None,
        "substancias": extrair_substancias_grid(html) or extrair_valor(html, "Substâncias") or None,
        "municipios": extrair_valor(html, "Municípios") or None,
        "tipoRequerimento": extrair_valor(html, "Tipo de requerimento") or None,
        "ativo": extrair_valor(html, "Ativo") or None,
        "superintendencia": extrair_valor(html, "Superintendência") or None,
        "uf": extrair_valor(html, "UF") or None,
        "seiUrl": extract_sei_url(html),
    }
    tem = dados["nup"] or dados["areaHa"] is not None or dados["fase"] or dados["seiUrl"]
    return dados if tem else None


# ---------------------------------------------------------------------------
# Fluxo no SCM
# ---------------------------------------------------------------------------

def normalizar_numero(raw: str):
    m = re.search(r"(\d{3})\.?(\d{3})/(\d{4})", raw.replace(" ", ""))
    if not m:
        return None
    return f"{m.group(1)}.{m.group(2)}/{m.group(3)}"


def preparar_sessao(client: httpx.Client):
    html = ""
    cookies = ""
    try:
        r = client.get(URL_CM)
        html = r.text
        cookies = "; ".join(f"{c.name}={c.value}" for c in client.cookies)
    except Exception:
        pass
    return {
        "cookies": cookies,
        "viewState": extract_input(html, "__VIEWSTATE"),
        "viewStateGen": extract_input(html, "__VIEWSTATEGENERATOR"),
        "eventValidation": extract_input(html, "__EVENTVALIDATION"),
        "guid": extract_captcha_guid(html),
    }


def captcha_img(client: httpx.Client, guid: str):
    try:
        r = client.get(f"{BASE}/SCM/extra/CaptchaImage.aspx?guid={guid}")
        return r.content if r.status_code == 200 else None
    except Exception:
        return None


def consultar_com_captcha(client: httpx.Client, numero: str, codigo: str, vs: str, vg: str, ev: str):
    data = {
        "__EVENTTARGET": "",
        "__EVENTARGUMENT": "",
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vg,
        "__VIEWSTATEENCRYPTED": "",
        "__EVENTVALIDATION": ev,
        "ctl00$conteudo$txtNumeroProcesso": numero,
        "ctl00$conteudo$CaptchaControl1": codigo,
        "ctl00$conteudo$btnConsultarProcesso": "Consultar",
    }
    r = client.post(URL_CM, data=data, headers={
        "Referer": URL_CM,
        "Origin": BASE,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    })
    html = r.text
    codigo_errado = "CaptchaImage.aspx" in html and re.search(r"Informe o c[oó]digo|Informe o código", html, re.I) is not None
    return html, codigo_errado


def solve_captcha(img: bytes) -> str:
    ocr = get_ocr()
    if ocr is None or not img:
        return ""
    try:
        code = ocr.classification(img) or ""
    except Exception:
        return ""
    return re.sub(r"[^A-Za-z0-9]", "", code)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"name": "ANM CM Solver", "health": "/health", "consultar": "POST /anm/cm/consultar"}


@app.get("/health")
def health(x_solver_token: str = Header(default="")):
    verificar_token(x_solver_token)
    info = {"ok": False, "base": BASE, "url": URL_CM}
    try:
        with httpx.Client(timeout=15, headers={"User-Agent": UA}, follow_redirects=True) as client:
            r = client.get(URL_CM)
            html = r.text
            info["status_code"] = r.status_code
            info["has_captcha_guid"] = extract_captcha_guid(html) is not None
            info["content_type"] = r.headers.get("content-type")
            info["snippet"] = texto_plano(html)[:180]
            info["ok"] = r.status_code == 200 and info["has_captcha_guid"]
    except Exception as e:
        info["error"] = str(e)
    return info


class ConsultarIn(BaseModel):
    numero: str
    codigo: str | None = None
    cookies: str | None = None
    viewState: str | None = None
    viewStateGen: str | None = None
    eventValidation: str | None = None


@app.post("/anm/cm/consultar")
def cm_consultar(body: ConsultarIn, x_solver_token: str = Header(default="")):
    verificar_token(x_solver_token)
    numero = normalizar_numero(body.numero)
    if not numero:
        return JSONResponse(status_code=400, content={"error": "Número inválido. Use 000.000/0000"})

    if body.codigo:
        if not body.cookies or not body.viewState:
            return JSONResponse(status_code=422, content={"error": "Sessão expirada. Dispare a consulta novamente."})
        with httpx.Client(timeout=25, headers={"User-Agent": UA, "Cookie": body.cookies}, follow_redirects=True) as client:
            html, erro = consultar_com_captcha(
                client, numero, body.codigo.strip(),
                body.viewState, body.viewStateGen or "", body.eventValidation or "",
            )
        if erro:
            return JSONResponse(status_code=422, content={"ok": False, "error": "Código incorreto. Tente novamente."})
        if "Validation of viewstate MAC failed" in html:
            return JSONResponse(status_code=422, content={"ok": False, "error": "Sessão expirada ou bloqueada pela ANM. Dispare a consulta novamente."})
        d = parse_resposta(html, numero)
        if d:
            return {"ok": True, "modo": "cm", **d, "mensagem": "Dados do Cadastro Mineiro."}
        return JSONResponse(status_code=404, content={"ok": False, "error": "Processo não encontrado ou sem dados."})

    with httpx.Client(timeout=25, headers={"User-Agent": UA}, follow_redirects=True) as client:
        s = preparar_sessao(client)
        if not s["guid"]:
            return {"ok": False, "modo": "manual_fallback", "numero": numero,
                    "mensagem": "Não foi possível acessar o Cadastro Mineiro. Preencha os dados manualmente."}
        img = captcha_img(client, s["guid"])
        base64img = f"data:image/jpeg;base64,{b64encode(img).decode()}" if img else None

        codigo = solve_captcha(img) if img else ""
        if ALPHANUM_RE.match(codigo):
            html, erro = consultar_com_captcha(client, numero, codigo, s["viewState"], s["viewStateGen"], s["eventValidation"])
            if not erro:
                d = parse_resposta(html, numero)
                if d:
                    return {"ok": True, "modo": "captcha_auto", **d,
                            "mensagem": "Captcha resolvido automaticamente (OCR) e dados obtidos do Cadastro Mineiro."}

        if not base64img:
            return {"ok": False, "modo": "manual_fallback", "numero": numero,
                    "mensagem": "Não foi possível carregar o captcha. Preencha os dados manualmente."}
        return JSONResponse(status_code=422, content={
            "ok": False, "modo": "captcha_manual",
            "mensagem": "OCR não conseguiu o código da imagem. Digite o código abaixo.",
            "numero": numero,
            "captchaBase64": base64img,
            "viewState": s["viewState"], "viewStateGen": s["viewStateGen"],
            "eventValidation": s["eventValidation"], "cookies": s["cookies"],
        })


class ProbeIn(BaseModel):
    url: str


@app.post("/anm/probe")
def probe(body: ProbeIn, x_solver_token: str = Header(default="")):
    verificar_token(x_solver_token)
    if not body.url.lower().startswith("https://"):
        return JSONResponse(status_code=400, content={"error": "URL precisa ser HTTPS."})
    if re.search(r"anm\.gov\.br", body.url) is None:
        return JSONResponse(status_code=400, content={"error": "Apenas domínios anm.gov.br."})
    try:
        with httpx.Client(timeout=15, headers={"User-Agent": UA}, follow_redirects=True) as client:
            r = client.get(body.url)
        return {"ok": r.status_code == 200, "status_code": r.status_code, "url": body.url,
                "len": len(r.content), "snippet": texto_plano(r.text)[:160]}
    except Exception as e:
        return {"ok": False, "url": body.url, "error": str(e)}