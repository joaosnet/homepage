#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LaPS Site — Script de Atualização e Deploy Institucional (UFPA)
==============================================================
Desenvolvido para execução autônoma em computadores institucionais (Linux / Windows)
e no GitHub Actions (Ubuntu Runner).
Suporta conexão segura via VPN institucional (Fortinet IPsec / OpenVPN) e envio
incremental via FTPS/FTP para o servidor oficial laps.ufpa.br (CTIC/UFPA).
"""

import argparse
import base64
import datetime
import ftplib
import hashlib
import io
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

# Garantir UTF-8 no stdout/stderr em Windows e Linux
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ==============================================================================
# FORMATAÇÃO E CORES DO TERMINAL
# ==============================================================================
USE_COLOR = sys.stdout.isatty() and (os.name != "nt" or "WT_SESSION" in os.environ)

class Style:
    RESET = "\033[0m" if USE_COLOR else ""
    BOLD = "\033[1m" if USE_COLOR else ""
    DIM = "\033[2m" if USE_COLOR else ""
    CYAN = "\033[96m" if USE_COLOR else ""
    GREEN = "\033[92m" if USE_COLOR else ""
    YELLOW = "\033[93m" if USE_COLOR else ""
    RED = "\033[91m" if USE_COLOR else ""
    MAGENTA = "\033[95m" if USE_COLOR else ""
    BLUE = "\033[94m" if USE_COLOR else ""

# ==============================================================================
# LOGS DIÁRIOS E PROTEÇÃO DE DADOS SENSÍVEIS (ZERO LEAK)
# ==============================================================================
ROOT_DIR = Path(__file__).resolve().parent
LOGS_DIR = ROOT_DIR / "logs"
LOCK_FILE = ROOT_DIR / ".deploy.lock"
CACHE_FILE = ROOT_DIR / ".ftp_sync_cache.json"

REDACT_PATTERNS = [
    re.compile(r"ghp_[a-zA-Z0-9]{20,}", re.IGNORECASE),
    re.compile(r"github_pat_[a-zA-Z0-9_]{20,}", re.IGNORECASE),
]
_SENSITIVE_VALUES = set()

def register_sensitive(val: str) -> None:
    if val and len(str(val).strip()) >= 4:
        _SENSITIVE_VALUES.add(str(val).strip())

def sanitize_text(text: str) -> str:
    if not text:
        return ""
    text_str = str(text)
    for pat in REDACT_PATTERNS:
        text_str = pat.sub("[REDACTED_TOKEN]", text_str)
    for val in _SENSITIVE_VALUES:
        text_str = text_str.replace(val, "[REDACTED_SECRET]")
    return text_str

def get_daily_log_file() -> Path:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    return LOGS_DIR / f"deploy-{today_str}.log"

def log(message: str, level: str = "INFO", tag: str = "•", color: str = Style.RESET) -> None:
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    clean_msg = sanitize_text(message)
    plain_text = f"[{now_str}] [{level:5s}] {clean_msg}"
    
    try:
        with open(get_daily_log_file(), "a", encoding="utf-8") as lf:
            lf.write(plain_text + "\n")
    except Exception as e:
        sys.stderr.write(f"Aviso ao gravar log: {e}\n")

    tag_colored = f"{color}{Style.BOLD}{tag}{Style.RESET}"
    print(f" {tag_colored} {clean_msg}")

def log_success(msg: str) -> None:
    log(msg, level="INFO", tag="✔", color=Style.GREEN)

def log_warn(msg: str) -> None:
    log(msg, level="WARN", tag="▲", color=Style.YELLOW)

def log_error(msg: str) -> None:
    log(msg, level="ERROR", tag="✖", color=Style.RED)

def log_info(msg: str) -> None:
    log(msg, level="INFO", tag="ℹ", color=Style.CYAN)

# ==============================================================================
# CONTROLE DE CONCORRÊNCIA (LOCKFILE)
# ==============================================================================
class DeployLock:
    def __init__(self, lock_file: Path = LOCK_FILE):
        self.lock_file = lock_file
        self.acquired = False

    def acquire(self) -> bool:
        if self.lock_file.exists():
            try:
                content = self.lock_file.read_text(encoding="utf-8").strip()
                pid, created = content.split(":", 1)
                log_warn(f"Outro deploy parece estar em andamento (PID {pid}, iniciado em {created}).")
            except Exception:
                log_warn("Arquivo de lock existente encontrado.")
            return False

        try:
            self.lock_file.write_text(f"{os.getpid()}:{datetime.datetime.now().isoformat()}", encoding="utf-8")
            self.acquired = True
            return True
        except Exception as e:
            log_error(f"Não foi possível criar lock: {e}")
            return False

    def release(self) -> None:
        if self.acquired and self.lock_file.exists():
            try:
                self.lock_file.unlink()
                self.acquired = False
            except Exception:
                pass

# ==============================================================================
# CARREGAMENTO DE VARIÁVEIS DE AMBIENTE (.env)
# ==============================================================================
def load_env(env_path: Path) -> dict:
    env = {}
    if not env_path.exists():
        return env
    
    try:
        with open(env_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("\"'")
                env[k] = v
                if "PASS" in k or "SECRET" in k or "TOKEN" in k or "PSK" in k:
                    register_sensitive(v)
    except Exception as e:
        log_warn(f"Erro ao ler {env_path.name}: {e}")
    return env

# ==============================================================================
# DIAGNÓSTICO DE REDE E TESTE DE CONECTIVIDADE
# ==============================================================================
def test_network(host: str = "laps.ufpa.br") -> bool:
    print(f"\n{Style.BOLD}{Style.CYAN}--- DIAGNÓSTICO DE REDE INSTITUCIONAL UFPA ---{Style.RESET}")
    log_info(f"Testando resolução DNS para '{host}'...")
    
    resolved_ip = None
    try:
        resolved_ip = socket.gethostbyname(host)
        log_success(f"DNS resolvido com sucesso: {host} -> {resolved_ip}")
    except Exception as e:
        log_error(f"Falha ao resolver DNS de {host}: {e}")
        return False

    ports = [
        (21, "FTP / FTPS (Deploy)"),
        (22, "SSH / SFTP"),
        (80, "HTTP (Web Público)"),
        (443, "HTTPS (Web Seguro)")
    ]

    print("\nTestando conectividade de portas TCP:")
    port_21_open = False
    for port, label in ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3.0)
        start = time.time()
        try:
            sock.connect((resolved_ip, port))
            sock.close()
            elapsed = (time.time() - start) * 1000
            log_success(f"Porta {port:3d} ({label:20s}): ABERTA / ACESSÍVEL ({elapsed:.0f}ms)")
            if port == 21:
                port_21_open = True
        except Exception:
            log_error(f"Porta {port:3d} ({label:20s}): BLOQUEADA / TIMEOUT (Firewall)")

    # Teste de serviços externos
    print("\nTestando serviços auxiliares:")
    for test_host, test_port in [("github.com", 443), ("pub.orcid.org", 443), ("api.crossref.org", 443)]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)
        try:
            s.connect((test_host, test_port))
            s.close()
            log_success(f"{test_host:20s}: ACESSÍVEL")
        except Exception:
            log_warn(f"{test_host:20s}: INACESSÍVEL / TIMEOUT")

    if not port_21_open:
        print(f"\n{Style.YELLOW}{Style.BOLD}AVISO DE REDE CTIC:{Style.RESET}")
        print(" A porta 21 (FTP) está bloqueada na rede pública externa.")
        print(" Para deploy institucional, certifique-se de conectar a VPN FortiClient ou strongSwan IPsec")
        print(" apontando para vpn.dmz.ufpa.br, ou execute a partir de um computador dentro da rede UFPA.")
    return True

# ==============================================================================
# HASH MD5 LOCAL E CACHE DE SINCRONIZAÇÃO INCREMENTAL
# ==============================================================================
def compute_md5(file_path: Path) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def load_cache() -> dict:
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_cache(cache: dict) -> None:
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        log_warn(f"Não foi possível salvar cache de deploy: {e}")

# ==============================================================================
# ENVIO FTPS / FTP COM SINCRONIZAÇÃO INCREMENTAL
# ==============================================================================
EXCLUDE_DIRS = {".git", ".github", "logs", "tmp_record", "__pycache__", "docs"}
EXCLUDE_FILES = {
    ".env", ".env.example", ".deploy.lock", ".ftp_sync_cache.json",
    "deploy.py"
}

def sync_ftp(
    host: str,
    user: str,
    passwd: str,
    remote_dir: str = "/",
    port: int = 21,
    use_ssl: bool = True,
    force: bool = False,
    dry_run: bool = False
) -> bool:
    print(f"\n{Style.BOLD}{Style.CYAN}--- INICIANDO ENVIO DE ARQUIVOS VIA FTP/TLS ---{Style.RESET}")
    log_info(f"Conectando a {host}:{port} como '{user}'...")

    cache = {} if force else load_cache()
    new_cache = dict(cache)

    ftp = None
    try:
        if use_ssl:
            try:
                context = ssl.create_default_context()
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                ftp = ftplib.FTP_TLS(context=context, timeout=20)
                ftp.connect(host, port)
                ftp.login(user, passwd)
                ftp.prot_p()  # Ativa canal seguro de dados
                log_success("Conexão FTPS segura estabelecida com sucesso!")
            except Exception as e:
                log_warn(f"Falha na negociação TLS ({e}). Tentando FTP padrão...")
                ftp = ftplib.FTP(timeout=20)
                ftp.connect(host, port)
                ftp.login(user, passwd)
                log_success("Conexão FTP padrão estabelecida.")
        else:
            ftp = ftplib.FTP(timeout=20)
            ftp.connect(host, port)
            ftp.login(user, passwd)
            log_success("Conexão FTP padrão estabelecida.")

        if remote_dir and remote_dir != "/":
            ftp.cwd(remote_dir)

        # Mapear arquivos locais a enviar
        files_to_send = []
        for p in ROOT_DIR.rglob("*"):
            if p.is_dir():
                continue
            rel = p.relative_to(ROOT_DIR)
            parts = rel.parts

            if any(part in EXCLUDE_DIRS for part in parts):
                continue
            if rel.name in EXCLUDE_FILES or rel.name.endswith(".pyc"):
                continue

            md5 = compute_md5(p)
            rel_str = str(rel).replace("\\", "/")

            if force or cache.get(rel_str) != md5:
                files_to_send.append((p, rel_str, md5))
            else:
                new_cache[rel_str] = md5

        if not files_to_send:
            log_success("Todos os arquivos já estão sincronizados no servidor. Nenhum upload necessário!")
            ftp.quit()
            return True

        log_info(f"{len(files_to_send)} arquivo(s) precisam de atualização no servidor:")
        for local_p, rel_str, md5 in files_to_send:
            log_info(f"-> {rel_str}")
            if dry_run:
                continue

            # Garantir criação de diretórios remotos
            remote_parts = rel_str.split("/")[:-1]
            current_path = ""
            for part in remote_parts:
                current_path += "/" + part
                try:
                    ftp.mkd(current_path)
                except Exception:
                    pass

            remote_dest = (f"{remote_dir.rstrip('/')}/{rel_str}").replace("//", "/")
            with open(local_p, "rb") as f:
                ftp.storbinary(f"STOR {remote_dest}", f)
            new_cache[rel_str] = md5

        if not dry_run:
            save_cache(new_cache)
            log_success(f"{len(files_to_send)} arquivo(s) enviados com sucesso ao servidor {host}!")

        ftp.quit()
        return True

    except Exception as e:
        log_error(f"Erro durante a sincronização FTP: {e}")
        if ftp:
            try:
                ftp.close()
            except Exception:
                pass
        return False

# ==============================================================================
# VERIFICAÇÃO PÓS-DEPLOY
# ==============================================================================
def verify_live_site(url: str = "https://laps.ufpa.br/") -> bool:
    print(f"\n{Style.BOLD}{Style.CYAN}--- VERIFICAÇÃO DE INTEGRIDADE ONLINE ---{Style.RESET}")
    log_info(f"Testando resposta HTTP em {url}...")
    
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (LaPS Deploy Verifier)"})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            code = response.status
            body = response.read().decode("utf-8", errors="replace")
            if code == 200 and "LaPS" in body:
                log_success(f"Site institucional respondendo com HTTP {code} e conteúdo validado!")
                return True
            else:
                log_warn(f"Site respondeu com código HTTP {code}, mas conteúdo pode estar incompleto.")
                return False
    except Exception as e:
        log_error(f"Falha ao validar site público online: {e}")
        return False

# ==============================================================================
# ROTINA PRINCIPAL (CLI)
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="LaPS Deploy — Atualização e Publicação Institucional UFPA")
    parser.add_argument("--step", choices=["all", "data", "ftp", "verify", "diagnose"], default="all",
                        help="Etapa a executar (padrão: all).")
    parser.add_argument("--test-network", action="store_true", help="Executa diagnóstico de rede com a UFPA e encerra.")
    parser.add_argument("--force", action="store_true", help="Força reenvio de todos os arquivos ignorando o cache.")
    parser.add_argument("--dry-run", action="store_true", help="Simula o envio sem alterar arquivos no servidor.")
    parser.add_argument("--verify-live", action="store_true", help="Valida se https://laps.ufpa.br responde 200 após o deploy.")
    parser.add_argument("--env-file", default=".env", help="Caminho do arquivo de credenciais (padrão: .env).")
    args = parser.parse_args()

    # Banner institucional
    print(f"{Style.BOLD}{Style.BLUE}================================================================={Style.RESET}")
    print(f"{Style.BOLD}{Style.BLUE}LaPS — Laboratório de Processamento de Sinais | UFPA Deploy Engine{Style.RESET}")
    print(f"{Style.BOLD}{Style.BLUE}================================================================={Style.RESET}")

    env_path = ROOT_DIR / args.env_file
    env = load_env(env_path)

    # Obter credenciais do ambiente ou .env
    ftp_host = os.environ.get("FTP_HOST") or env.get("FTP_HOST") or "laps.ufpa.br"
    ftp_user = os.environ.get("FTP_USERNAME") or os.environ.get("FTP_USER") or env.get("FTP_USER") or "laps"
    ftp_pass = os.environ.get("FTP_PASSWORD") or os.environ.get("FTP_PASS") or env.get("FTP_PASS") or ""
    ftp_dir = os.environ.get("FTP_REMOTE_DIR") or os.environ.get("FTP_DIR") or env.get("FTP_DIR") or "/"
    ftp_port = int(os.environ.get("FTP_PORT") or env.get("FTP_PORT") or 21)
    use_ssl = (os.environ.get("FTP_SSL") or env.get("FTP_SSL") or "true").lower() in ("true", "1", "yes")

    register_sensitive(ftp_pass)

    if args.test_network or args.step == "diagnose":
        test_network(ftp_host)
        return

    lock = DeployLock()
    if not lock.acquire():
        sys.exit(1)

    try:
        # Etapa 1: Dados
        if args.step in ("all", "data"):
            log_info("Validando dados acadêmicos...")
            sync_script = ROOT_DIR / "scripts" / "sync-data.py"
            if sync_script.exists():
                subprocess.run([sys.executable, str(sync_script), "--check-only"], check=True)

        # Etapa 2: FTP
        if args.step in ("all", "ftp"):
            if not ftp_pass:
                log_warn("Nenhuma senha de FTP encontrada em variáveis de ambiente ou arquivo .env.")
                log_warn("Para realizar o envio, configure FTP_PASS no .env ou passe por variáveis de ambiente.")
                if args.step == "ftp":
                    sys.exit(1)
            else:
                success = sync_ftp(
                    host=ftp_host,
                    user=ftp_user,
                    passwd=ftp_pass,
                    remote_dir=ftp_dir,
                    port=ftp_port,
                    use_ssl=use_ssl,
                    force=args.force,
                    dry_run=args.dry_run
                )
                if not success and args.step == "ftp":
                    sys.exit(1)

        # Etapa 3: Verificação
        if args.step in ("all", "verify") or args.verify_live:
            verify_live_site(f"https://{ftp_host}/")

    finally:
        lock.release()

    log_success("Rotina de deploy concluída com sucesso.")

if __name__ == "__main__":
    main()
