#!/usr/bin/env bash
# ==============================================================================
# LaPS — Script de Deploy Institucional via WSL2 Ubuntu (Sem FortiClient GUI)
# ==============================================================================
# Execução local diretamente dentro do WSL2 Ubuntu:
#   bash scripts/deploy-wsl.sh [--dry-run] [--force]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "Erro: Arquivo .env não encontrado em $ROOT_DIR. Copie de .env.example e preencha as credenciais."
  exit 1
fi

echo "================================================================="
echo "LaPS Deploy — Execução via WSL2 Ubuntu (strongSwan IPsec)"
echo "================================================================="

# Verificar se strongswan está instalado
if ! command -v ipsec >/dev/null 2>&1; then
  echo "Instalando dependências strongSwan no Ubuntu WSL2..."
  sudo apt-get update -qq
  sudo apt-get install -y --no-install-recommends strongswan libcharon-extra-plugins libcharon-extauth-plugins dnsutils python3
fi

cleanup() {
  echo "Limpando túnel IPsec..."
  sudo python3 deploy.py --step ipsec-down 2>/dev/null || true
}
trap cleanup EXIT

echo "Conectando ao gateway vpn.dmz.ufpa.br..."
sudo -E python3 deploy.py --step ipsec-up

echo "Iniciando sincronização FTP..."
python3 deploy.py --step ftp "$@"

echo "Deploy concluído com sucesso via WSL2!"
