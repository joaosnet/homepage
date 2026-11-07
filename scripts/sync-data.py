#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LaPS Data Sync — Camada 1: Sincronização e Validação de Dados Acadêmicos
=======================================================================
Consulta a API pública do ORCID v3.0 e a API Crossref para atualizar
e validar de forma idempotente a produção científica dos docentes do LaPS,
além de validar a estrutura de integrantes.json e projetos.json.
"""

import argparse
import json
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

INTEGRANTES_PATH = DATA_DIR / "integrantes.json"
PROJETOS_PATH = DATA_DIR / "projetos.json"
PRODUCAO_PATH = DATA_DIR / "producao.json"

USER_AGENT = "LaPS-DataSync/1.0 (https://laps.ufpa.br; mailto:laps@ufpa.br)"


def extract_orcid_id(orcid_str: str) -> str:
    """Extrai o identificador puro (0000-0000-0000-0000) de uma URL ou string."""
    if not orcid_str:
        return ""
    match = re.search(r"(\d{4}-\d{4}-\d{4}-[\dX]{4})", orcid_str)
    return match.group(1) if match else ""


def fetch_orcid_works(orcid_id: str, timeout: int = 10) -> list:
    """Busca a lista de trabalhos públicos de um pesquisador no ORCID v3.0."""
    if not orcid_id:
        return []
    url = f"https://pub.orcid.org/v3.0/{orcid_id}/works"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": USER_AGENT
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                groups = data.get("group", [])
                works = []
                for g in groups:
                    summaries = g.get("work-summary", [])
                    for s in summaries:
                        title_obj = s.get("title", {}).get("title", {})
                        title = title_obj.get("value", "").strip() if title_obj else ""
                        pub_date = s.get("publication-date") or {}
                        year_val = pub_date.get("year", {}).get("value")
                        year = int(year_val) if year_val and str(year_val).isdigit() else None
                        
                        # Extrair DOI se houver
                        doi = ""
                        ext_ids = s.get("external-ids", {}).get("external-id", [])
                        for eid in ext_ids:
                            if eid.get("external-id-type") == "doi":
                                doi = eid.get("external-id-value", "").strip()
                                break
                        
                        if title:
                            works.append({
                                "title": title,
                                "year": year,
                                "doi": doi
                            })
                return works
    except Exception as e:
        print(f"  [AVISO] Falha ao consultar ORCID {orcid_id}: {e}", file=sys.stderr)
        return []


def format_crossref_citation(doi: str, fallback_title: str, year: int) -> str:
    """Consulta Crossref para gerar citação estruturada em texto plano."""
    if not doi:
        return f"{fallback_title}. ({year})."
    
    clean_doi = doi.replace("https://doi.org/", "").replace("http://doi.org/", "").strip()
    url = f"https://api.crossref.org/works/{urllib.parse.quote(clean_doi)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                item = json.loads(response.read().decode("utf-8")).get("message", {})
                authors = item.get("author", [])
                author_names = []
                for a in authors[:6]:
                    family = a.get("family", "").upper()
                    given = a.get("given", "")
                    if family and given:
                        author_names.append(f"{family}, {given[0]}.")
                    elif family:
                        author_names.append(family)
                
                authors_str = " ; ".join(author_names) if author_names else "LAPS RESEARCHERS"
                title = (item.get("title", [""])[0] or fallback_title).strip()
                container = item.get("container-title", [""])[0] if item.get("container-title") else ""
                volume = item.get("volume", "")
                page = item.get("page", "")
                pub_year = year or item.get("issued", {}).get("date-parts", [[year]])[0][0]
                
                citation = f"{authors_str} . {title}. "
                if container:
                    citation += f"{container}, "
                if volume:
                    citation += f"v. {volume}, "
                if page:
                    citation += f"p. {page}, "
                citation += f"{pub_year}."
                if clean_doi:
                    citation += f" DOI: {clean_doi}"
                return citation.strip()
    except Exception:
        pass
    
    return f"{fallback_title}. ({year}). DOI: {clean_doi}" if clean_doi else f"{fallback_title}. ({year})."


def validate_json_schema(data: dict, schema_type: str) -> tuple[bool, str]:
    """Valida requisitos mínimos de schema para cada arquivo JSON."""
    if schema_type == "integrantes":
        if not isinstance(data, dict) or "professores" not in data or not isinstance(data["professores"], list):
            return False, "Campo 'professores' ausente ou inválido em integrantes.json"
        for idx, p in enumerate(data["professores"]):
            if "nome" not in p or not p["nome"].strip():
                return False, f"Professor #{idx+1} não possui nome obrigatório."
        return True, "integrantes.json válido."
    
    elif schema_type == "projetos":
        if not isinstance(data, dict) or "projetos" not in data or not isinstance(data["projetos"], list):
            return False, "Campo 'projetos' ausente ou inválido em projetos.json"
        for idx, proj in enumerate(data["projetos"]):
            if "titulo" not in proj or not proj["titulo"].strip():
                return False, f"Projeto #{idx+1} não possui título obrigatório."
        return True, "projetos.json válido."
    
    elif schema_type == "producao":
        if not isinstance(data, dict) or "producoes" not in data or not isinstance(data["producoes"], list):
            return False, "Campo 'producoes' ausente ou inválido em producao.json"
        for idx, prod in enumerate(data["producoes"]):
            if "ano" not in prod or not isinstance(prod["ano"], int):
                return False, f"Bloco #{idx+1} de produção sem ano válido."
            if "trabalhos" not in prod or not isinstance(prod["trabalhos"], list):
                return False, f"Bloco do ano {prod.get('ano')} sem lista de 'trabalhos'."
        return True, "producao.json válido."
    
    return False, f"Tipo de schema desconhecido: {schema_type}"


def sync_academic_data(dry_run: bool = False, check_only: bool = False) -> int:
    """Executa a rotina de sincronização e validação das 3 bases de dados."""
    print("=" * 65)
    print("LaPS — Camada 1: Sincronização & Validação de Dados JSON")
    print("=" * 65)

    # 1. Carregar e validar integrantes.json
    if not INTEGRANTES_PATH.exists():
        print(f"[ERRO] Arquivo não encontrado: {INTEGRANTES_PATH}")
        return 1
    
    try:
        with open(INTEGRANTES_PATH, "r", encoding="utf-8") as f:
            integrantes_data = json.load(f)
    except Exception as e:
        print(f"[ERRO] Falha ao ler integrantes.json: {e}")
        return 1

    valid, msg = validate_json_schema(integrantes_data, "integrantes")
    if not valid:
        print(f"[ERRO] {msg}")
        return 1
    print(f"[OK] integrantes.json: {len(integrantes_data['professores'])} docentes cadastrados.")

    # 2. Carregar e validar projetos.json
    if not PROJETOS_PATH.exists():
        print(f"[ERRO] Arquivo não encontrado: {PROJETOS_PATH}")
        return 1
    
    try:
        with open(PROJETOS_PATH, "r", encoding="utf-8") as f:
            projetos_data = json.load(f)
    except Exception as e:
        print(f"[ERRO] Falha ao ler projetos.json: {e}")
        return 1

    valid, msg = validate_json_schema(projetos_data, "projetos")
    if not valid:
        print(f"[ERRO] {msg}")
        return 1
    print(f"[OK] projetos.json: {len(projetos_data['projetos'])} projetos cadastrados.")

    # 3. Carregar e validar producao.json
    if not PRODUCAO_PATH.exists():
        print(f"[ERRO] Arquivo não encontrado: {PRODUCAO_PATH}")
        return 1
    
    try:
        with open(PRODUCAO_PATH, "r", encoding="utf-8") as f:
            producao_data = json.load(f)
    except Exception as e:
        print(f"[ERRO] Falha ao ler producao.json: {e}")
        return 1

    valid, msg = validate_json_schema(producao_data, "producao")
    if not valid:
        print(f"[ERRO] {msg}")
        return 1
    
    total_trabalhos = sum(len(p.get("trabalhos", [])) for p in producao_data["producoes"])
    print(f"[OK] producao.json: {len(producao_data['producoes'])} anos, totalizando {total_trabalhos} publicações.")

    if check_only:
        print("\nModo --check-only concluído com sucesso. Todos os esquemas JSON são válidos!")
        return 0

    # 4. Sincronização via ORCID dos docentes
    print("\nIniciando checagem de publicações recentes via ORCID API v3.0...")
    existing_citations = set()
    for prod in producao_data["producoes"]:
        for t in prod.get("trabalhos", []):
            # Normalizar para evitar duplicidade
            clean = re.sub(r"[^\w\s]", "", t.lower())
            existing_citations.add(" ".join(clean.split()[:8]))

    novos_adicionados = 0
    producoes_por_ano = {p["ano"]: p["trabalhos"] for p in producao_data["producoes"]}

    for prof in integrantes_data["professores"]:
        orcid_url = prof.get("orcid", "")
        orcid_id = extract_orcid_id(orcid_url)
        if not orcid_id:
            continue
        
        print(f"-> Verificando produções de: {prof['nome']} (ORCID: {orcid_id})")
        works = fetch_orcid_works(orcid_id)
        for w in works:
            year = w.get("year")
            title = w.get("title", "")
            doi = w.get("doi", "")
            
            if not year or not title:
                continue

            # Verificar se já existe
            clean_title = re.sub(r"[^\w\s]", "", title.lower())
            title_key = " ".join(clean_title.split()[:8])
            
            if title_key in existing_citations:
                continue

            # Formatar citação
            citation = format_crossref_citation(doi, title, year)
            if year not in producoes_por_ano:
                producoes_por_ano[year] = []
            
            producoes_por_ano[year].insert(0, citation)
            existing_citations.add(title_key)
            novos_adicionados += 1
            print(f"   [NOVA PRODUÇÃO] ({year}) {title[:75]}...")

    if novos_adicionados > 0:
        print(f"\n[SUCESSO] {novos_adicionados} novas publicações identificadas!")
        # Reconstruir lista ordenada decrescente por ano
        sorted_years = sorted(producoes_por_ano.keys(), reverse=True)
        new_producoes_list = [
            {"ano": yr, "trabalhos": producoes_por_ano[yr]}
            for yr in sorted_years if producoes_por_ano[yr]
        ]
        producao_data["producoes"] = new_producoes_list

        if not dry_run:
            with open(PRODUCAO_PATH, "w", encoding="utf-8") as f:
                json.dump(producao_data, f, indent=4, ensure_ascii=False)
            print(f"[GRAVADO] Arquivo atualizado: {PRODUCAO_PATH}")
        else:
            print("[DRY-RUN] Nenhuma alteração foi persistida no disco.")
    else:
        print("\n[INFO] Nenhuma nova publicação encontrada no ORCID. Base já está atualizada.")

    return 0


def main():
    parser = argparse.ArgumentParser(description="LaPS Data Sync — Sincronização e Validação Acadêmica")
    parser.add_argument("--dry-run", action="store_true", help="Simula a busca sem gravar alterações no disco.")
    parser.add_argument("--check-only", action="store_true", help="Apenas valida a sintaxe e schemas dos JSONs.")
    args = parser.parse_args()

    sys.exit(sync_academic_data(dry_run=args.dry_run, check_only=args.check_only))


if __name__ == "__main__":
    main()
