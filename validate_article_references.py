#!/usr/bin/env python3
"""Valida a correspondência bidirecional entre citações e referências."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path


WEBAPP_ROOT = Path(__file__).resolve().parent
DEFAULT_ARTICLE = WEBAPP_ROOT.parent / "Artigo" / "Artigo.md"
REFERENCE_HEADING = "**REFERÊNCIAS**"
YEAR_RE = re.compile(r"\b(?:19|20)\d{2}[a-z]?\b", re.IGNORECASE)
PARENTHETICAL_RE = re.compile(r"\(([^()]+)\)")
NARRATIVE_RE = re.compile(
    r"\b("
    r"[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+et\s+al\.)?"
    r"|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]{2,})*"
    r")\s*\(((?:19|20)\d{2}[a-z]?)\)",
    re.UNICODE,
)


@dataclass(frozen=True)
class Citation:
    author: str
    year: str
    line: int
    raw: str


@dataclass(frozen=True)
class Reference:
    author: str
    year: str
    aliases: tuple[str, ...]
    raw: str


def fold(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^A-Z0-9]+", " ", ascii_value.upper()).strip()


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def citation_author(value: str) -> str:
    value = re.sub(r"\s+et\s+al\.?$", "", value.strip(), flags=re.IGNORECASE)
    value = value.split(";", 1)[0].strip()
    if "," in value:
        value = value.split(",", 1)[0].strip()
    folded = fold(value)
    words = folded.split()
    if value == value.upper() or len(words) == 1:
        return folded
    return words[0] if words else ""


def strip_non_prose(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", "", text)
    return re.sub(r"`[^`\n]+`", "", text)


def parse_citations(body: str) -> list[Citation]:
    prose = strip_non_prose(body)
    citations: list[Citation] = []
    for match in PARENTHETICAL_RE.finditer(prose):
        content = match.group(1).strip()
        work = re.fullmatch(r"(.+),\s*((?:19|20)\d{2}[a-z]?)", content, flags=re.IGNORECASE)
        if not work:
            continue
        raw_author, year = work.groups()
        author = citation_author(raw_author)
        if author:
            citations.append(Citation(author, year.lower(), line_number(prose, match.start()), match.group(0)))

    occupied = {(item.line, item.year) for item in citations}
    for match in NARRATIVE_RE.finditer(prose):
        raw_author, year = match.groups()
        previous = re.search(r"([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÀ-ÖØ-öø-ÿ'-]+)\s+$", prose[:match.start()])
        is_mixed_single_name = raw_author != raw_author.upper() and "et al." not in raw_author
        if previous and is_mixed_single_name and previous.group(1).casefold() not in {"segundo", "conforme"}:
            continue
        line = line_number(prose, match.start())
        author = citation_author(raw_author)
        item = Citation(author, year.lower(), line, match.group(0))
        if author and (line, item.year) not in occupied:
            citations.append(item)

    unique = {(item.author, item.year, item.line): item for item in citations}
    return sorted(unique.values(), key=lambda item: (item.line, item.author, item.year))


def reference_aliases(author_block: str) -> tuple[str, ...]:
    aliases: set[str] = set()
    acronym = re.search(r"\(([A-Z][A-Z0-9-]{1,})\)", author_block)
    if acronym:
        aliases.add(fold(acronym.group(1)))
    clean = re.sub(r"\s*\([A-Z][A-Z0-9-]{1,}\)\s*", " ", author_block).strip()
    aliases.add(fold(clean.split(",", 1)[0] if "," in clean else clean))
    return tuple(sorted(alias for alias in aliases if alias))


def parse_references(section: str) -> list[Reference]:
    blocks = [re.sub(r"\s+", " ", block).strip() for block in re.split(r"\n\s*\n", section)]
    references: list[Reference] = []
    for block in blocks:
        if not block or block.startswith("<!--"):
            continue
        years = YEAR_RE.findall(block)
        if not years:
            raise ValueError(f"Referência sem ano reconhecível: {block[:100]}")
        author_match = re.match(r"^(.+?)\.\s", block)
        if not author_match:
            raise ValueError(f"Referência sem autoria reconhecível: {block[:100]}")
        author_block = author_match.group(1).strip()
        references.append(Reference(author_block, years[-1].lower(), reference_aliases(author_block), block))
    return references


def validate(article_path: Path) -> dict[str, object]:
    empty_result = {"cited_without_reference": [], "references_without_citation": []}
    if not article_path.is_file():
        return {"ok": False, "article": str(article_path), "errors": ["Artigo não encontrado."], **empty_result}
    text = article_path.read_text(encoding="utf-8")
    if REFERENCE_HEADING not in text:
        return {"ok": False, "article": str(article_path), "errors": ["Seção **REFERÊNCIAS** ausente."], **empty_result}

    body, reference_section = text.split(REFERENCE_HEADING, 1)
    errors: list[str] = []
    try:
        references = parse_references(reference_section)
    except ValueError as error:
        references = []
        errors.append(str(error))
    citations = parse_citations(body)

    reference_keys: dict[tuple[str, str], list[int]] = {}
    for index, reference in enumerate(references):
        for alias in reference.aliases:
            reference_keys.setdefault((alias, reference.year), []).append(index)

    cited_without_reference: list[dict[str, object]] = []
    matched_references: set[int] = set()
    for citation in citations:
        matches = reference_keys.get((citation.author, citation.year), [])
        if len(matches) == 1:
            matched_references.add(matches[0])
        elif not matches:
            cited_without_reference.append(asdict(citation))
        else:
            errors.append(f"Citação ambígua {citation.raw} na linha {citation.line}.")

    references_without_citation = [
        {"author": reference.author, "year": reference.year, "raw": reference.raw}
        for index, reference in enumerate(references)
        if index not in matched_references
    ]
    duplicate_keys = [
        f"{author}, {year}" for (author, year), indexes in reference_keys.items() if len(indexes) > 1
    ]
    if duplicate_keys:
        errors.append("Chaves autor-data duplicadas: " + ", ".join(sorted(set(duplicate_keys))))

    return {
        "ok": not errors and not cited_without_reference and not references_without_citation,
        "article": str(article_path),
        "citation_occurrences": len(citations),
        "cited_works": len(matched_references),
        "bibliography_entries": len(references),
        "errors": errors,
        "cited_without_reference": cited_without_reference,
        "references_without_citation": references_without_citation,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Cruza citações autor-data e bibliografia do Artigo.md.")
    parser.add_argument("--article", type=Path, default=DEFAULT_ARTICLE)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = validate(args.article.resolve())
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif result["ok"]:
        print("CROSS-REFERENCE VÁLIDO — toda obra citada está na bibliografia e vice-versa.")
        print(f"Obras: {result['cited_works']} | Referências: {result['bibliography_entries']} | Ocorrências: {result['citation_occurrences']}")
    else:
        print("CROSS-REFERENCE INVÁLIDO")
        for error in result.get("errors", []):
            print(f"- {error}")
        for item in result.get("cited_without_reference", []):
            print(f"- Citação sem referência: {item['raw']} (linha {item['line']})")
        for item in result.get("references_without_citation", []):
            print(f"- Referência não citada: {item['author']}, {item['year']}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
