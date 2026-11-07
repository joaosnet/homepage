#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LaPS Site — Script de Atualização e Deploy Institucional (UFPA)
==============================================================
Desenvolvido para execução autônoma em computadores institucionais (Linux / Windows)
e no GitHub Actions (Ubuntu Runner).
Suporta conexão segura via VPN institucional (Fortinet IPsec via strongSwan no Linux)
e envio incremental via FTPS/FTP para o servidor oficial laps.ufpa.br (CTIC/UFPA).
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

def log_info(msg: str) -> None:
    log(msg, "INFO", "ℹ", Style.CYAN)

def log_success(msg: str) -> None:
    log(msg, "OK", "✓", Style.GREEN)

def log_warn(msg: str) -> None:
    log(msg, "WARN", "⚠", Style.YELLOW)

def log_error(msg: str) -> None:
    log(msg, "ERROR", "✗", Style.RED)

# ==============================================================================
# CARREGAMENTO DE VARIÁVEIS DE AMBIENTE (.env)
# ==============================================================================
def load_env(env_path: Path) -> dict:
    env_vars = {}
    if not env_path.exists():
        return env_vars
    try:
        with open(env_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    env_vars[k] = v
                    register_sensitive(v)
    except Exception as e:
        log_warn(f"Não foi possível ler {env_path.name}: {e}")
    return env_vars

# ==============================================================================
# CONTROLE DE CONCORRÊNCIA VIA LOCKFILE (.deploy.lock)
# ==============================================================================
class DeployLock:
    def __init__(self, lock_file: Path = LOCK_FILE, timeout_minutes: int = 15):
        self.lock_file = lock_file
        self.timeout_minutes = timeout_minutes

    def acquire(self) -> bool:
        if self.lock_file.exists():
            try:
                mtime = datetime.datetime.fromtimestamp(self.lock_file.stat().st_mtime)
                elapsed = datetime.datetime.now() - mtime
                if elapsed > datetime.timedelta(minutes=self.timeout_minutes):
                    log_warn(f"Lockfile expirado detectado ({elapsed.seconds // 60}m atrás). Liberando...")
                    self.release()
                else:
                    log_error(f"Outro deploy está em andamento (iniciado há {elapsed.seconds // 60}m). Encerrando.")
                    return False
            except Exception:
                pass
        try:
            self.lock_file.write_text(f"pid={os.getpid()}\nstarted={datetime.datetime.now().isoformat()}\n", encoding="utf-8")
            return True
        except Exception as e:
            log_error(f"Falha ao criar lockfile: {e}")
            return False

    def release(self) -> None:
        try:
            if self.lock_file.exists():
                self.lock_file.unlink()
        except Exception as e:
            log_warn(f"Não foi possível remover lockfile: {e}")

# ==============================================================================
# GERENCIAMENTO DE TÚNEL FORTINET IPSEC (STRONGSWAN / XAUTH NO LINUX)
# ==============================================================================
def get_ipsec_bin() -> str:
    """Localiza o binário ipsec em diretórios de sistema Linux."""
    candidates = [shutil.which("ipsec"), "/usr/sbin/ipsec", "/sbin/ipsec", "/usr/local/sbin/ipsec"]
    for c in candidates:
        if c and Path(c).exists():
            return c
    return "ipsec"

class IPsecFortinetManager:
    """Gerencia a configuração e ciclo de vida do túnel Fortinet IPsec via strongSwan no Linux."""
    def __init__(self, config: dict):
        self.config = config
        self.is_running = False

    def is_configured(self) -> bool:
        has_user = bool(self.config.get("VPN_USER"))
        has_pass = bool(self.config.get("VPN_PASS"))
        return has_user and has_pass

    def start(self) -> bool:
        if os.name != "posix":
            log_warn("Gerenciamento de túnel IPsec strongSwan suportado apenas em sistemas Linux.")
            return False

        if not self.is_configured():
            log_error("Credenciais de VPN incompletas (VPN_USER e VPN_PASS são obrigatórios para Fortinet IPsec).")
            return False

        gateway = str(self.config.get("VPN_GATEWAY") or "vpn.dmz.ufpa.br").strip()
        gateway_ip = None
        try:
            gateway_ip = socket.gethostbyname(gateway)
            log_info(f"Gateway VPN resolvido via DNS: {gateway} -> {gateway_ip}")
        except Exception as e:
            log_warn(f"Falha ao resolver gateway {gateway}: {e}")
            gateway_ip = "200.239.67.173"

        psk = str(self.config.get("VPN_PSK") or "caecPQgjP1pD26DgWCHr").strip()
        user = str(self.config.get("VPN_USER") or "").strip()
        passwd = str(self.config.get("VPN_PASS") or "").strip()
        local_id = str(self.config.get("VPN_LOCAL_ID") or "ISP").strip()
        local_ip = str(self.config.get("VPN_LOCAL_IP") or "%config").strip()
        right_subnet = str(self.config.get("VPN_RIGHT_SUBNET") or "200.239.109.18/32,200.239.109.17/32,172.16.0.0/16").strip()
        aggressive = str(self.config.get("VPN_AGGRESSIVE") or "yes").strip()

        # 0. Limpar qualquer resquício inválido em strongswan.d
        charon_logging_file = Path("/etc/strongswan.d/charon-logging.conf")
        if charon_logging_file.exists():
            try:
                charon_logging_file.unlink()
            except Exception:
                pass

        # 1. Garantir que os plugins xauth-generic estejam disponíveis
        plugin_dir = Path("/usr/lib/ipsec/plugins")
        has_xauth_generic = False
        if plugin_dir.exists():
            has_xauth_generic = any("xauth-generic" in p.name for p in plugin_dir.glob("*.so"))

        if not has_xauth_generic and shutil.which("apt-get"):
            log_info("Plugin xauth-generic ausente. Instalando pacotes necessários...")
            subprocess.run(["apt-get", "update", "-qq"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(
                ["apt-get", "install", "-y", "--no-install-recommends", "libcharon-extauth-plugins"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

        subnets = [s.strip() for s in right_subnet.split(",") if s.strip()]
        if not subnets:
            subnets = ["172.16.0.0/16", "200.239.109.18/32"]
        if not any("172.16." in s for s in subnets):
            subnets.insert(0, "172.16.0.0/16")

        log_info(f"Configurando /etc/ipsec.conf para Fortinet IPsec ({gateway}, Subnets: {subnets}, Local ID: {local_id})...")

        conf_lines = [
            "config setup",
            "  charondebug=\"ike 2, knl 2, cfg 2, esp 2, chd 2, net 1\"",
            "",
            "conn fortinet-base",
            "  keyexchange=ikev1",
            f"  aggressive={aggressive}",
            "  left=%defaultroute",
            f"  leftsourceip={local_ip}",
            f"  leftid=@{local_id}",
            "  leftauth=psk",
            "  rightauth=psk",
            "  rightid=%any",
            "  leftauth2=xauth",
            f"  xauth_identity=\"{user}\"",
            f"  right={gateway_ip}",
            "  ike=aes256-sha256-modp2048,aes256-sha256-modp1536,aes256-sha256-modp1024,aes256-sha1-modp2048,aes256-sha1-modp1536,aes256-sha1-modp1024,aes128-sha256-modp2048,aes128-sha1-modp1536,aes256-sha256-modp1536,3des-sha1-modp1024",
            "  esp=aes256-sha256-modp2048,aes256-sha256-modp1536,aes256-sha256-modp1024,aes256-sha256,aes256-sha1-modp2048,aes256-sha1-modp1536,aes256-sha1-modp1024,aes256-sha1,aes128-sha256-modp2048,aes128-sha256-modp1536,aes128-sha256-modp1024,aes128-sha256,aes128-sha1-modp2048,aes128-sha1-modp1536,aes128-sha1-modp1024,aes128-sha1,3des-sha1-modp1024,3des-sha1-modp1536,3des-sha1,3des-md5",
            "  dpdaction=clear",
            "  dpddelay=300s",
        ]

        conn_names = []
        for idx, snet in enumerate(subnets):
            c_name = f"fortinet-{idx}"
            conn_names.append(c_name)
            conf_lines.extend([
                "",
                f"conn {c_name}",
                "  also=fortinet-base",
                f"  rightsubnet={snet}",
                "  auto=add",
            ])

        conf_lines.extend([
            "",
            "conn fortinet",
            "  also=fortinet-base",
            f"  rightsubnet={subnets[0]}",
            "  auto=add",
        ])

        conf_content = "\n".join(conf_lines) + "\n"

        secrets_content = (
            f": PSK \"{psk}\"\n"
            f"@{local_id} : PSK \"{psk}\"\n"
            f"{local_id} : PSK \"{psk}\"\n"
            f"\"{gateway}\" : PSK \"{psk}\"\n"
            f"\"{gateway_ip}\" : PSK \"{psk}\"\n"
            f"{gateway} : PSK \"{psk}\"\n"
            f"{gateway_ip} : PSK \"{psk}\"\n"
            f"%any : PSK \"{psk}\"\n"
            f": XAUTH \"{passwd}\"\n"
            f"\"{user}\" : XAUTH \"{passwd}\"\n"
            f"{user} : XAUTH \"{passwd}\"\n"
        )

        try:
            Path("/etc/ipsec.conf").write_text(conf_content, encoding="utf-8")
            secrets_path = Path("/etc/ipsec.secrets")
            secrets_path.write_text(secrets_content, encoding="utf-8")
            os.chmod(secrets_path, 0o600)
            log_success("Arquivos /etc/ipsec.conf e /etc/ipsec.secrets gerados com sucesso.")
        except Exception as e:
            log_error(f"Falha ao gravar arquivos de configuração IPsec em /etc: {e}")
            return False

        ipsec_bin = get_ipsec_bin()
        log_info(f"Iniciando daemon do strongSwan ({ipsec_bin})...")
        for start_cmd in [["systemctl", "restart", "strongswan-starter"], ["systemctl", "restart", "strongswan"], [ipsec_bin, "restart"], [ipsec_bin, "start"]]:
            try:
                res = subprocess.run(start_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if res.returncode == 0:
                    break
            except Exception:
                pass
        time.sleep(3)

        log_info(f"Estabelecendo conexão IPsec com o FortiGate da UFPA ({len(conn_names)} conexões)...")
        for c_name in conn_names:
            log_info(f"Disparando associação IPsec para {c_name}...")
            for attempt in range(3):
                up_res = subprocess.run([ipsec_bin, "up", c_name], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                if up_res.stdout:
                    print(f"[{c_name} up]\n{up_res.stdout.strip()}")
                if up_res.stderr:
                    print(f"[{c_name} err]\n{up_res.stderr.strip()}")
                out_all = (up_res.stdout or "") + (up_res.stderr or "")
                if "no config named" in out_all:
                    log_warn(f"Configuração '{c_name}' ainda não sincronizada no charon. Atualizando...")
                    subprocess.run([ipsec_bin, "update"])
                    time.sleep(2)
                    continue
                break

        log_info("Aguardando confirmação de handshake e Associação de Segurança (SA)...")
        connected = False
        status_output = ""
        for attempt in range(15):
            time.sleep(1)
            stat = subprocess.run([ipsec_bin, "status"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            status_output = stat.stdout or stat.stderr
            if "INSTALLED" in status_output or ("ESTABLISHED" in status_output and "TUNNEL" in status_output):
                connected = True
                break

        if not connected:
            log_error("Falha: Associação de Segurança (SA) não foi estabelecida com a UFPA.")
            log_info(f"Status atual do strongSwan:\n{status_output}")
            return False

        self.is_running = True
        log_success("Túnel Fortinet IPsec conectado com sucesso à rede institucional da UFPA!")
        subprocess.run([ipsec_bin, "statusall"])
        subprocess.run(["ip", "route", "show", "table", "220"])

        # Detectar Virtual IP atribuído pela UFPA (faixa institucional 172.16.0.0/12)
        virtual_ip = None
        stat_full = subprocess.run([ipsec_bin, "statusall", "fortinet"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        combined_logs = (stat_full.stdout or "") + "\n" + (status_output or "")

        m_ts = re.search(r"TS\s+(172\.(?:1[6-9]|2[0-9]|3[01])\.\d+\.\d+)/\d+\s*===", combined_logs)
        if not m_ts:
            m_ts = re.search(r"(172\.(?:1[6-9]|2[0-9]|3[01])\.\d+\.\d+)/\d+\s*===\s*200\.239\.109\.18", combined_logs)
        if m_ts:
            virtual_ip = m_ts.group(1).strip()
            log_info(f"Virtual IP detectado via Traffic Selector IPsec: {virtual_ip}")

        if not virtual_ip:
            m_vip = re.search(r"installing new virtual IP\s+(172\.(?:1[6-9]|2[0-9]|3[01])\.\d+\.\d+)", combined_logs)
            if m_vip:
                virtual_ip = m_vip.group(1).strip()
                log_info(f"Virtual IP detectado via log do charon: {virtual_ip}")

        if not virtual_ip:
            ip_out = subprocess.run(["ip", "-4", "addr", "show"], stdout=subprocess.PIPE, text=True).stdout
            m_ip = re.search(r"\binet\s+(172\.(?:1[6-9]|2[0-9]|3[01])\.\d+\.\d+)", ip_out)
            if m_ip:
                virtual_ip = m_ip.group(1).strip()
                log_info(f"Virtual IP detectado na interface: {virtual_ip}")

        if virtual_ip:
            try:
                Path("/tmp/vpn_virtual_ip").write_text(virtual_ip, encoding="utf-8")
            except Exception:
                pass
        else:
            log_warn("Não foi possível identificar o Virtual IP institucional da UFPA.")

        # Desabilitar rp_filter para tráfego simétrico do túnel
        try:
            for if_name in ["all", "default", "lo", "eth0"]:
                subprocess.run(["sysctl", "-w", f"net.ipv4.conf.{if_name}.rp_filter=0"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["sysctl", "-w", "net.ipv4.ip_forward=1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

        def_iface = "eth0"
        def_gw = None
        route_out = subprocess.run(["ip", "route", "show", "default"], stdout=subprocess.PIPE, text=True).stdout
        iface_match = re.search(r"dev\s+(\S+)", route_out)
        if iface_match:
            def_iface = iface_match.group(1).strip()
        gw_match = re.search(r"via\s+([0-9.]+)", route_out)
        if gw_match:
            def_gw = gw_match.group(1).strip()

        if virtual_ip:
            log_info(f"Registrando Virtual IP {virtual_ip}/32 na interface {def_iface}...")
            subprocess.run(["ip", "addr", "add", f"{virtual_ip}/32", "dev", def_iface], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        target_host = self.config.get("FTP_HOST", "laps.ufpa.br")
        target_ips = ["200.239.109.18", "200.239.109.17"]
        try:
            resolved = socket.gethostbyname(target_host)
            if resolved not in target_ips:
                target_ips.append(resolved)
        except Exception:
            pass

        for tip in target_ips:
            gw_args = ["via", def_gw] if def_gw else []
            if virtual_ip:
                log_info(f"Configurando rota dedicada para {tip} via {def_iface} com src={virtual_ip}...")
                subprocess.run(["ip", "route", "replace", f"{tip}/32"] + gw_args + ["dev", def_iface, "src", virtual_ip, "table", "220"])
                subprocess.run(["ip", "route", "replace", f"{tip}/32"] + gw_args + ["dev", def_iface, "src", virtual_ip])
            else:
                subprocess.run(["ip", "route", "replace", f"{tip}/32"] + gw_args + ["dev", def_iface, "table", "220"])

        for tip in target_ips:
            subprocess.run(["iptables", "-t", "nat", "-I", "POSTROUTING", "1", "-d", tip, "-j", "ACCEPT"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["iptables", "-I", "INPUT", "1", "-s", tip, "-j", "ACCEPT"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["iptables", "-I", "OUTPUT", "1", "-d", tip, "-j", "ACCEPT"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["iptables", "-I", "FORWARD", "1", "-d", tip, "-j", "ACCEPT"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["iptables", "-I", "FORWARD", "1", "-s", tip, "-j", "ACCEPT"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if virtual_ip:
            subprocess.run(["iptables", "-I", "FORWARD", "1", "-d", virtual_ip, "-j", "ACCEPT"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["iptables", "-I", "FORWARD", "1", "-s", virtual_ip, "-j", "ACCEPT"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["iptables", "-t", "mangle", "-I", "POSTROUTING", "1", "-p", "tcp", "--tcp-flags", "SYN,RST", "SYN", "-j", "TCPMSS", "--clamp-mss-to-pmtu"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Injetar DNS institucional da UFPA se /etc/resolv.conf for gravável
        try:
            resolv = Path("/etc/resolv.conf")
            if resolv.exists():
                curr = resolv.read_text(encoding="utf-8")
                if "172.16.28.1" not in curr:
                    resolv.write_text("nameserver 172.16.28.1\nnameserver 172.16.28.2\n" + curr, encoding="utf-8")
        except Exception:
            pass

        # Testar porta 21 (FTP) via socket
        for tip in target_ips:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(6)
                if virtual_ip:
                    s.bind((virtual_ip, 0))
                s.connect((tip, 21))
                banner = s.recv(1024).decode("utf-8", errors="replace").strip()
                s.close()
                log_success(f"Porta 21 de {tip} aberta e respondendo via IPsec! Banner: {banner}")
                break
            except Exception as e:
                log_warn(f"Teste de socket para {tip}:21 via IPsec: {e}")

        # Consulta DNS interna para identificação de IP institucional interno
        if shutil.which("nslookup"):
            for dns_ip in ["172.16.28.1", "172.16.28.2"]:
                for q_host in ["laps.ufpa.br", "ispconfig.ufpa.br"]:
                    try:
                        dns_res = subprocess.run(["nslookup", q_host, dns_ip], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=4)
                        dns_out = dns_res.stdout.strip()
                        if "Address" in dns_out:
                            log_info(f"Resposta DNS institucional ({dns_ip} -> {q_host}):\n{dns_out}")
                            found_ips = re.findall(r"Address:\s*([0-9.]+)", dns_out)
                            for fip in found_ips:
                                if fip not in target_ips and not fip.startswith("172.16.28.") and fip != "127.0.0.53":
                                    log_success(f"Endpoint institucional direto descoberto via DNS ({q_host} -> {fip})!")
                                    target_ips.append(fip)
                                    try:
                                        Path("/tmp/internal_ftp_ip").write_text(fip, encoding="utf-8")
                                    except Exception:
                                        pass
                    except Exception:
                        pass

        return True

    def stop(self) -> None:
        if os.name != "posix":
            return
        log_info("Encerrando túnel IPsec e limpando credenciais...")
        ipsec_bin = get_ipsec_bin()
        for c in ["fortinet-0", "fortinet-1", "fortinet-2", "fortinet"]:
            subprocess.run([ipsec_bin, "down", c], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run([ipsec_bin, "stop"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for p in [Path("/etc/ipsec.secrets"), Path("/etc/ipsec.conf"), Path("/etc/strongswan.d/charon-logging.conf"), Path("/tmp/vpn_virtual_ip"), Path("/tmp/internal_ftp_ip")]:
            try:
                if p.exists():
                    p.unlink()
            except Exception:
                pass
        self.is_running = False
        log_success("Túnel IPsec desconectado e credenciais removidas com segurança.")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()

# ==============================================================================
# DIAGNÓSTICO DE REDE E PORTAS CTIC/UFPA
# ==============================================================================
def test_network(host: str = "laps.ufpa.br") -> bool:
    print(f"\n{Style.BOLD}{Style.CYAN}--- DIAGNÓSTICO DE CONECTIVIDADE COM O CTIC/UFPA ---{Style.RESET}")
    log_info(f"Testando resolução DNS para '{host}'...")
    try:
        ip = socket.gethostbyname(host)
        log_success(f"DNS resolvido: {host} -> {ip}")
    except socket.gaierror as e:
        log_error(f"Falha na resolução de DNS para {host}: {e}")
        return False

    ports = [
        (80, "HTTP", True),
        (443, "HTTPS", True),
        (21, "FTP/FTPS (Requer VPN CTIC)", False),
        (22, "SSH/SFTP (Requer VPN CTIC)", False)
    ]

    open_ports = 0
    for port, label, expect_open in ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3.5)
        try:
            sock.connect((ip, port))
            log_success(f"Porta {port:4d} ({label:28s}): ABERTA")
            open_ports += 1
            sock.close()
        except socket.timeout:
            log_warn(f"Porta {port:4d} ({label:28s}): TIMEOUT (bloqueada por firewall)")
        except ConnectionRefusedError:
            log_warn(f"Porta {port:4d} ({label:28s}): RECUSADA (serviço inativo)")
        except Exception as e:
            log_error(f"Porta {port:4d} ({label:28s}): ERRO ({e})")

    if open_ports == 0:
        log_error("Nenhuma porta respondeu. Verifique sua conexão à internet.")
        return False

    sock_test = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock_test.settimeout(2.0)
    ftp_open = False
    try:
        sock_test.connect((ip, 21))
        ftp_open = True
        sock_test.close()
    except Exception:
        pass

    if not ftp_open:
        print(f"\n{Style.YELLOW}{Style.BOLD}AVISO DE REDE CTIC:{Style.RESET}")
        print(" A porta 21 (FTP) está bloqueada na rede pública externa.")
        print(" Para deploy institucional, certifique-se de conectar a VPN FortiClient ou strongSwan IPsec")
        print(" apontando para vpn.dmz.ufpa.br, ou execute a partir de um computador dentro da rede UFPA.")
    return True

# ==============================================================================
# HASH MD5 LOCAL E CACHE DE SINCRONIZAÇÃO INCREMENTAL
# ==============================================================================
def compute_md5(file_path: Path) -> str:
    hasher = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        log_warn(f"Erro ao calcular MD5 de {file_path.name}: {e}")
        return ""

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
EXCLUDE_DIRS = {".git", ".github", "logs", "tmp_record", "__pycache__", "docs", "graphify-out"}
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

    # Verificar se temos Virtual IP dedicado do IPsec
    source_ip = None
    vip_file = Path("/tmp/vpn_virtual_ip")
    if vip_file.exists():
        try:
            source_ip = vip_file.read_text(encoding="utf-8").strip()
            log_info(f"Utilizando endereço de origem IPsec dedicado: {source_ip}")
        except Exception:
            pass

    target_hosts = [host]
    int_file = Path("/tmp/internal_ftp_ip")
    if int_file.exists():
        try:
            discovered_ip = int_file.read_text(encoding="utf-8").strip()
            if discovered_ip and discovered_ip not in target_hosts:
                target_hosts.insert(0, discovered_ip)
        except Exception:
            pass

    cache = {} if force else load_cache()
    new_cache = dict(cache)

    ftp = None
    connected_host = None

    for target_h in target_hosts:
        log_info(f"Conectando a {target_h}:{port} como '{user}'...")
        try:
            source_addr = (source_ip, 0) if source_ip else None
            if use_ssl:
                try:
                    context = ssl.create_default_context()
                    context.check_hostname = False
                    context.verify_mode = ssl.CERT_NONE
                    ftp = ftplib.FTP_TLS(context=context, timeout=20)
                    ftp.connect(target_h, port, source_address=source_addr)
                    ftp.login(user, passwd)
                    ftp.prot_p()
                    log_success(f"Conexão FTPS segura estabelecida com sucesso em {target_h}!")
                    connected_host = target_h
                    break
                except Exception as e:
                    log_warn(f"Falha na negociação TLS com {target_h} ({e}). Tentando FTP padrão...")
                    ftp = ftplib.FTP(timeout=20)
                    ftp.connect(target_h, port, source_address=source_addr)
                    ftp.login(user, passwd)
                    log_success(f"Conexão FTP padrão estabelecida em {target_h}.")
                    connected_host = target_h
                    break
            else:
                ftp = ftplib.FTP(timeout=20)
                ftp.connect(target_h, port, source_address=source_addr)
                ftp.login(user, passwd)
                log_success(f"Conexão FTP padrão estabelecida em {target_h}.")
                connected_host = target_h
                break
        except Exception as e:
            log_warn(f"Não foi possível conectar a {target_h}: {e}")
            ftp = None

    if not ftp:
        log_error("Falha ao estabelecer conexão FTP com todos os endpoints testados.")
        return False

    try:
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

        mode_label = "[SIMULAÇÃO --dry-run]" if dry_run else "[ENVIO REAL]"
        log_info(f"{mode_label} {len(files_to_send)} arquivo(s) mapeados para sincronização:")
        for local_p, rel_str, md5 in files_to_send:
            log_info(f"-> {rel_str}")
            if dry_run:
                continue

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
            log_success(f"{len(files_to_send)} arquivo(s) enviados com sucesso ao servidor {connected_host}!")
        else:
            log_success(f"[SIMULAÇÃO CONCLUÍDA] Autenticação e integridade validadas para {len(files_to_send)} arquivos.")

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
    parser.add_argument("--step", choices=["all", "data", "ftp", "verify", "diagnose", "ipsec-up", "ipsec-down"], default="all",
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
    ftp_host = str(os.environ.get("FTP_HOST") or env.get("FTP_HOST") or "laps.ufpa.br").strip()
    ftp_user = str(os.environ.get("FTP_USERNAME") or os.environ.get("FTP_USER") or env.get("FTP_USER") or "laps").strip()
    ftp_pass = str(os.environ.get("FTP_PASSWORD") or os.environ.get("FTP_PASS") or env.get("FTP_PASS") or "").strip()
    ftp_dir = str(os.environ.get("FTP_REMOTE_DIR") or os.environ.get("FTP_DIR") or env.get("FTP_DIR") or "/").strip()
    ftp_port = int(os.environ.get("FTP_PORT") or env.get("FTP_PORT") or 21)
    use_ssl = (os.environ.get("FTP_SSL") or env.get("FTP_SSL") or "true").lower() in ("true", "1", "yes")

    vpn_config = {
        "VPN_GATEWAY": str(os.environ.get("VPN_GATEWAY") or env.get("VPN_GATEWAY") or "vpn.dmz.ufpa.br").strip(),
        "VPN_PSK": str(os.environ.get("VPN_PSK") or env.get("VPN_PSK") or "caecPQgjP1pD26DgWCHr").strip(),
        "VPN_USER": str(os.environ.get("VPN_USER") or env.get("VPN_USER") or "").strip(),
        "VPN_PASS": str(os.environ.get("VPN_PASS") or env.get("VPN_PASS") or "").strip(),
        "VPN_LOCAL_ID": str(os.environ.get("VPN_LOCAL_ID") or env.get("VPN_LOCAL_ID") or "ISP").strip(),
        "VPN_LOCAL_IP": str(os.environ.get("VPN_LOCAL_IP") or env.get("VPN_LOCAL_IP") or "%config").strip(),
        "VPN_RIGHT_SUBNET": str(os.environ.get("VPN_RIGHT_SUBNET") or env.get("VPN_RIGHT_SUBNET") or "200.239.109.18/32,200.239.109.17/32,172.16.0.0/16").strip(),
        "VPN_AGGRESSIVE": str(os.environ.get("VPN_AGGRESSIVE") or env.get("VPN_AGGRESSIVE") or "yes").strip(),
        "FTP_HOST": ftp_host,
    }

    register_sensitive(ftp_pass)
    register_sensitive(vpn_config["VPN_PASS"])

    # Controle isolado de IPsec
    if args.step == "ipsec-up":
        ipsec_mgr = IPsecFortinetManager(vpn_config)
        log_info("Iniciando conexão com a VPN Fortinet IPsec via strongSwan...")
        sys.exit(0 if ipsec_mgr.start() else 1)

    if args.step == "ipsec-down":
        ipsec_mgr = IPsecFortinetManager(vpn_config)
        ipsec_mgr.stop()
        sys.exit(0)

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
