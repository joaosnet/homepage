# Manual de Deploy e Infraestrutura — LaPS (UFPA)

Guia operacional para publicação do site institucional no servidor oficial do LaPS na Universidade Federal do Pará.

---

## 1. Topologia da Rede Institucional

O domínio `laps.ufpa.br` está hospedado no cluster ISPConfig do Centro de Tecnologia da Informação e Comunicação (CTIC/UFPA):

- **Host Oficial**: `laps.ufpa.br`
- **Endereço IP**: `200.239.109.18` (slave-ispconfig-01.ufpa.br)
- **Portas Públicas**: 80 (HTTP) e 443 (HTTPS)
- **Porta de Gerenciamento / Upload**: 21 (FTP / FTPS com TLS 1.2+)

> ⚠️ **Bloqueio de Firewall**: A porta 21 é protegida pelo firewall do CTIC para acessos externos. O upload de arquivos requer conexão à VPN institucional (`vpn.dmz.ufpa.br`) via FortiClient ou strongSwan, ou execução a partir de um computador conectado à rede interna do campus universitário.

---

## 2. Diagnóstico de Conectividade Local

Antes de tentar o deploy, teste a conectividade com os servidores da universidade:

```bash
# Diagnóstico completo de DNS e portas:
python deploy.py --test-network
```

O comando reporta a resolução DNS, o status das portas 21, 22, 80 e 443, além da acessibilidade das APIs acadêmicas externas.

---

## 3. Deploy Local via Linha de Comando

1. Copie o arquivo de exemplo e insira as credenciais institucionais:
   ```bash
   cp .env.example .env
   ```

2. Edite `.env` com suas credenciais:
   ```ini
   FTP_HOST=laps.ufpa.br
   FTP_USER=laps
   FTP_PASS=sua_senha_aqui
   FTP_DIR=/
   ```

3. Execute o script de publicação:
   ```bash
   # Simulação sem envio (Dry Run):
   python deploy.py --step ftp --dry-run

   # Publicação real com sincronização incremental via cache MD5:
   python deploy.py --step ftp --verify-live

   # Forçar reenvio de todos os arquivos (ignora o cache):
   python deploy.py --step ftp --force --verify-live
   ```

O script mantém um arquivo `.ftp_sync_cache.json` com os hashes dos arquivos já enviados. Somente arquivos criados ou modificados serão transmitidos, economizando banda e tempo.

---

## 4. Deploy Automático no GitHub Actions (`deploy.yml`)

O workflow `.github/workflows/deploy.yml` é executado a cada push na branch `master` ou por disparo manual (`workflow_dispatch`).

Para habilitar o deploy automatizado na nuvem, adicione os seguintes segredos no repositório GitHub (**Settings > Secrets and variables > Actions**):

- `FTP_HOST`: `laps.ufpa.br`
- `FTP_USERNAME`: usuário FTP institucional (ex.: `laps`)
- `FTP_PASSWORD`: senha do usuário FTP
- `FTP_REMOTE_DIR`: `/`
- `VPN_GATEWAY`: `vpn.dmz.ufpa.br`
- `VPN_USER`: usuário institucional (Sagitta/UFPA)
- `VPN_PASS`: senha institucional
- `VPN_PSK`: chave pré-compartilhada IPsec (`caecPQgjP1pD26DgWCHr`)

Caso os segredos de VPN não estejam configurados, o job em nuvem ignora o envio sem falhar o build, permitindo que a publicação seja feita via estação de trabalho local.
