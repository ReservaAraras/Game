#!/usr/bin/env python3
"""Valida o Relatorio.md canônico contra o código do Reserva Araras.

O validador não tenta provar eficácia pedagógica. Ele detecta deriva entre o
relatório e os contratos observáveis: grafo ativo, métodos, custos, invariantes,
fórmulas, heurísticas, persistência, segurança e diretor narrativo.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


WEBAPP_ROOT = Path(__file__).resolve().parent
DEFAULT_REPORT = WEBAPP_ROOT.parent / "Relatorio.md"


@dataclass(frozen=True)
class Finding:
    check_id: str
    message: str


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise ValueError(f"{path.name} não está em UTF-8: {error}") from error


def source(name: str) -> str:
    path = WEBAPP_ROOT / name
    if not path.is_file():
        return ""
    return read_text(path)


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*[\s\S]*?\*/", "", text)
    return re.sub(r"^\s*//.*$", "", text, flags=re.MULTILINE)


def extract_object_costs(text: str, object_name: str) -> dict[str, int]:
    match = re.search(
        rf"(?:var|const)\s+{re.escape(object_name)}\s*=\s*\{{([\s\S]*?)\n\s*\}};",
        strip_comments(text),
    )
    if not match:
        return {}
    return {
        key: int(cost)
        for key, cost in re.findall(
            r"^\s*['\"]?([a-z][a-z0-9-]*)['\"]?\s*:\s*\{[^\n}]*\bcost\s*:\s*(\d+)",
            match.group(1),
            flags=re.MULTILINE,
        )
    }


def active_templates() -> set[str]:
    include_re = re.compile(r"<\?!=\s*include\(\s*['\"]([^'\"]+)['\"]\s*\)\s*;?\s*\?>")
    active: set[str] = set()
    queue = ["index"]
    while queue:
        name = queue.pop()
        filename = f"{name}.html"
        if filename in active:
            continue
        path = WEBAPP_ROOT / filename
        if not path.is_file():
            continue
        active.add(filename)
        queue.extend(include_re.findall(read_text(path)))
    return active


def public_functions() -> set[str]:
    names: set[str] = set()
    function_re = re.compile(r"\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(")
    for path in WEBAPP_ROOT.glob("*.gs"):
        names.update(function_re.findall(strip_comments(read_text(path))))
    return names


def frontend_server_methods() -> set[str]:
    text = strip_comments(source("script.html"))
    match = re.search(r"SERVER_METHODS\s*=\s*new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)", text)
    return set(re.findall(r"['\"]([A-Za-z_$][A-Za-z0-9_$]*)['\"]", match.group(1))) if match else set()


def validate(report_path: Path) -> list[Finding]:
    failures: list[Finding] = []

    def fail(check_id: str, message: str) -> None:
        failures.append(Finding(check_id, message))

    if not report_path.is_file():
        return [Finding("report.exists", f"Relatório não encontrado: {report_path}")]
    try:
        report = read_text(report_path)
    except ValueError as error:
        return [Finding("report.encoding", str(error))]

    required_sections = [
        "## 1. Parecer executivo",
        "## 2. Arquitetura efetivamente ativa",
        "## 3. Modelo territorial e estratégias de manejo",
        "## 4. Heurísticas canônicas do núcleo",
        "## 5. Estratégia pedagógica e rastreabilidade",
        "## 6. Diretor narrativo complementar",
        "## 7. Persistência, segurança e operação",
        "## 8. Métodos verificáveis por domínio",
        "## 9. Validação lógica do relatório",
        "## 10. O que ainda falta comprovar",
    ]
    for heading in required_sections:
        if heading not in report:
            fail("report.sections", f"Seção obrigatória ausente: {heading}")

    markers = {
        "ARCHITECTURE", "SIMULATION", "HEURISTICS", "BUDGET", "PEDAGOGY",
        "EXPERIENCE", "SECURITY", "METHODS", "VALIDATOR",
    }
    found_markers = set(re.findall(r"RA-CONTRACT:([A-Z_]+)", report))
    for marker in sorted(markers - found_markers):
        fail("report.markers", f"Marcador contratual ausente: RA-CONTRACT:{marker}")

    expected_active = {"index.html", "login.html", "GameScene.html", "style.html", "script.html"}
    actual_active = active_templates()
    if actual_active != expected_active:
        fail(
            "architecture.templates",
            f"Grafo ativo divergiu: esperado {sorted(expected_active)}, encontrado {sorted(actual_active)}",
        )
    for filename in sorted(expected_active):
        if f"`{filename}`" not in report:
            fail("report.templates", f"Template ativo não documentado: {filename}")

    required_files = {
        "Code.gs", "ConfigManager.gs", "SchemaService.gs", "DatabaseConnector.gs",
        "AuthService.gs", "SessionManager.gs", "SecurityUtils.gs", "SaveLoadManager.gs",
        "AssetService.gs", "PedagogicalTraceabilityService.gs", "FazendaDataController.gs",
        "UIRenderer.gs", "BudgetController.gs", "EvaluationEngine.gs",
        "AgroforestalController.gs", "CarbonSequestration.gs", "ExperienceDirector.gs",
        "MapaGenerator.gs", "FarmStateAdapter.gs",
    }
    for filename in sorted(required_files):
        if not (WEBAPP_ROOT / filename).is_file():
            fail("architecture.files", f"Arquivo descrito não existe: {filename}")
        if f"`{filename}`" not in report:
            fail("report.files", f"Arquivo canônico não aparece no relatório: {filename}")

    expected_methods = {
        "doGet", "include", "includeInlineData", "setupProject", "getPublicConfig",
        "getGameSettings", "setupReservaArarasSchema", "registerPlayer", "loginPlayer",
        "resumeSession", "logout", "getSimulationBootstrap", "evaluateSimulationState",
        "applySimulationAction", "buildDashboardModel", "calculateFazendaScore",
        "classifyFazenda", "processPESIncentive", "listSaves", "saveGame", "loadGame",
        "deleteGame", "getAssetManifest", "getAssetLibraryContract", "getAssetData", "registerParcela",
        "calculateProductivity", "evaluateBiodiversityImpact", "calculateSequestration",
        "generateCarbonCredits", "evaluateMarketPrice", "getAvaliacaoComunidade",
        "getExperienceChapter", "resolveExperienceDecision", "getExperienceEndgame",
        "getExperienceBasicWorkflow", "advanceExperienceBasicWorkflow",
    }
    available_methods = public_functions()
    for method in sorted(expected_methods):
        if method not in available_methods:
            fail("methods.source", f"Método documentado deixou de existir: {method}")
        if f"`{method}`" not in report:
            fail("methods.report", f"Método não rastreado no relatório: {method}")

    expected_server_methods = {
        "loginPlayer", "registerPlayer", "resumeSession", "getSimulationBootstrap",
        "applySimulationAction", "evaluateSimulationState", "saveGame", "listSaves",
        "loadGame", "deleteGame", "getAssetManifest", "getAssetLibraryContract", "getAssetData", "logout",
    }
    actual_server_methods = frontend_server_methods()
    if actual_server_methods != expected_server_methods:
        fail(
            "architecture.transport",
            f"Allowlist do frontend divergiu: esperado {sorted(expected_server_methods)}, encontrado {sorted(actual_server_methods)}",
        )

    backend_costs = extract_object_costs(source("FazendaDataController.gs"), "RESERVA_SIMULATION_TOOLS_")
    frontend_costs = extract_object_costs(source("script.html"), "DEFAULT_TOOLS")
    expected_costs = {"saf": 4500, "reserve": 1800, "trail": 2600, "water": 3200, "clear": 0}
    if backend_costs != expected_costs:
        fail("simulation.backend_tools", f"Ferramentas backend divergiram: {backend_costs}")
    for tool, cost in expected_costs.items():
        if frontend_costs.get(tool) != cost:
            fail("simulation.frontend_tools", f"Custo frontend de {tool} divergiu: {frontend_costs.get(tool)} != {cost}")
        if f"`{tool}`" not in report or f"R$ {cost:,.0f}".replace(",", ".") not in report:
            fail("report.tools", f"Estratégia/custo não documentado de forma canônica: {tool}={cost}")

    config = strip_comments(source("ConfigManager.gs"))
    controller = strip_comments(source("FazendaDataController.gs"))
    pedagogy = strip_comments(source("PedagogicalTraceabilityService.gs"))
    evaluation = strip_comments(source("EvaluationEngine.gs"))
    budget = strip_comments(source("BudgetController.gs"))
    saves = strip_comments(source("SaveLoadManager.gs"))
    security = strip_comments(source("SecurityUtils.gs"))

    source_expectations = [
        ("config.map", config, r"mapWidth:\s*8,\s*mapHeight:\s*6,\s*initialBudget:\s*50000"),
        ("config.session", config, r"SESSION_HOURS:\s*12"),
        ("simulation.tiles", controller, r"Array\(48\)"),
        ("simulation.water", controller, r"waterIndexes\s*=\s*\[11,\s*19,\s*27,\s*35\]"),
        ("simulation.hypothesis", controller, r"!journal\.baseline\s*&&\s*!String\(journal\.hypothesis"),
        ("simulation.pending", controller, r"if\s*\(journal\.pendingIntervention\)"),
        ("simulation.protected_water", controller, r"tile\.type\s*===\s*['\"]water['\"].*Nascentes não podem ser removidas"),
        ("pedagogy.tiles", pedagogy, r"game\.tiles\.length\s*!==\s*48"),
        ("pedagogy.budget", pedagogy, r"game\.budget\s*>\s*50000"),
        ("metrics.conservation", pedagogy, r"counts\.native.*counts\.reserve.*counts\.water.*\/\s*48\s*\*\s*100"),
        ("metrics.carbon", pedagogy, r"120\s*\+\s*\(counts\.reserve.*\*\s*18\s*\+\s*\(counts\.saf.*\*\s*7"),
        ("metrics.production", pedagogy, r"\(counts\.saf.*\*\s*12\s*\+\s*\(counts\.trail.*\*\s*5"),
        ("metrics.balance", pedagogy, r"conservation\s*\*\s*0\.8\s*\+\s*Math\.min\(20,\s*\(counts\.saf.*\*\s*2"),
        ("evaluation.normalizers", evaluation, r"metrics\.carbon,\s*300[\s\S]*metrics\.production,\s*240"),
        ("evaluation.weights", evaluation, r"dimensions\.conservation\s*\*\s*0\.4\s*\+\s*dimensions\.carbon\s*\*\s*0\.25\s*\+\s*dimensions\.production\s*\*\s*0\.15\s*\+\s*dimensions\.balance\s*\*\s*0\.2"),
        ("evaluation.thresholds", evaluation, r"value\s*>=\s*80[\s\S]*value\s*>=\s*60"),
        ("budget.eligibility", budget, r"conservation\s*\*\s*0\.6\s*\+\s*protectedArea\s*\*\s*0\.4"),
        ("budget.incentive", budget, r"eligibility\s*<\s*60\s*\?\s*0\s*:\s*Math\.min\(5000,\s*RESERVA_BUDGET_DEFAULTS_\.pesBase\s*\+\s*eligibility\s*\*\s*20\s*\+\s*Math\.min\(1000,\s*production\s*\*\s*2\)\)"),
        ("saves.limit", saves, r"stateJson\.length\s*>\s*45000"),
        ("security.plaintext", security, r"function\s+hashPassword_\([\s\S]*return\s+String\(password"),
    ]
    for check_id, body, pattern in source_expectations:
        if not re.search(pattern, body, flags=re.IGNORECASE | re.DOTALL):
            fail(check_id, "Evidência lógica esperada não foi encontrada no código.")

    limits_match = re.search(r"JOURNAL_LIMITS\s*=\s*\{([^}]+)\}", pedagogy)
    limits = {
        key: int(value)
        for key, value in re.findall(r"(question|hypothesis|observation|explanation|nextStep)\s*:\s*(\d+)", limits_match.group(1) if limits_match else "")
    }
    expected_limits = {"question": 240, "hypothesis": 600, "observation": 600, "explanation": 800, "nextStep": 400}
    if limits != expected_limits:
        fail("pedagogy.limits", f"Limites pedagógicos divergiram: {limits}")
    for key, value in expected_limits.items():
        if f"`{key}`" not in report or str(value) not in report:
            fail("report.pedagogy_limits", f"Limite não documentado: {key}={value}")
    if not re.search(r"journal\.records\.length\s*>\s*12", pedagogy):
        fail("pedagogy.history", "Limite de 12 versões não foi encontrado.")

    experience = strip_comments(source("ExperienceDirector.gs"))
    chapters = [
        (chapter_id, int(order), int(phase))
        for chapter_id, order, phase in re.findall(
            r"\{\s*id:\s*['\"]([^'\"]+)['\"],\s*order:\s*(\d+),\s*phase:\s*(\d+)",
            experience,
        )
    ]
    if len(chapters) != 8 or [order for _, order, _ in chapters] != list(range(1, 9)) or {phase for _, _, phase in chapters} != {1, 2, 3, 4}:
        fail("experience.chapters", f"Capítulos/fases divergiram: {chapters}")
    experience_expectations = [
        r"Math\.max\(0,\s*Math\.min\(10",
        r"balance\s*>=\s*8[\s\S]*balance\s*>=\s*4",
        r"balance\s*>=\s*10[\s\S]*p\s*>=\s*7",
        r"\['briefing',\s*'prediction',\s*'decision',\s*'observation',\s*'reflection'\]",
    ]
    for index, pattern in enumerate(experience_expectations, 1):
        if not re.search(pattern, experience, flags=re.DOTALL):
            fail(f"experience.heuristic.{index}", "Heurística narrativa divergente.")

    normalized_report = re.sub(r"\s+", " ", re.sub(r"[`*_]", "", report)).casefold()
    required_report_phrases = [
        "não há uma integração direta com a Google Sheets API REST",
        "ILPF não é uma ferramenta disponível no fluxo principal",
        "hashPassword_` atualmente devolve a senha em texto plano",
        "não é nota",
        "implementa hoje um gerador procedural executável",
        "não está conectado ao grafo ativo",
        "45.000 caracteres",
        "8 capítulos",
    ]
    for phrase in required_report_phrases:
        normalized_phrase = re.sub(r"\s+", " ", re.sub(r"[`*_]", "", phrase)).casefold()
        if normalized_phrase not in normalized_report:
            fail("report.boundaries", f"Limite ou risco obrigatório ausente: {phrase}")

    legacy_false_claims = [
        "persistência dos estados e a governança de dados ocorrem de forma segura por meio do *Google Sheets API*",
        "ILPF (`ilpf`) é uma ferramenta do mapa principal",
    ]
    for phrase in legacy_false_claims:
        normalized_phrase = re.sub(r"\s+", " ", re.sub(r"[`*_]", "", phrase)).casefold()
        if normalized_phrase in normalized_report:
            fail("report.legacy_claims", f"Afirmação incompatível reapareceu: {phrase}")

    figure_root = WEBAPP_ROOT.parent / "Artigo"
    expected_figures = {
        "Figura_1.html": "Figura 1",
        "Figura_2.html": "Figura 2",
    }
    for filename, label in expected_figures.items():
        figure_path = figure_root / filename
        if not figure_path.is_file():
            fail("report.figures", f"Artefato visual ausente: {figure_path}")
            continue
        figure = read_text(figure_path)
        normalized_figure = re.sub(r"\s+", " ", figure).casefold()
        required_figure_markers = ("<!doctype html", "<style", "@media", "reserva araras")
        for marker in required_figure_markers:
            if marker not in normalized_figure:
                fail("report.figures", f"{filename} não contém o marcador visual obrigatório: {marker}")
        if re.search(r"<script\b[^>]*\bsrc\s*=", figure, flags=re.IGNORECASE):
            fail("report.figures", f"{filename} depende de script externo; mantenha a figura autocontida.")
        if f"Artigo/{filename}" not in report:
            fail("report.figures", f"{label} não está vinculada no Relatorio.md canônico.")

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida Relatorio.md contra o código do Reserva Araras.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="Caminho do relatório canônico.")
    parser.add_argument("--json", action="store_true", help="Emite resultado JSON.")
    args = parser.parse_args()

    report_path = args.report.resolve()
    failures = validate(report_path)
    payload = {
        "ok": not failures,
        "report": str(report_path),
        "checks": "architecture, methods, simulation, heuristics, pedagogy, security, experience",
        "failures": [asdict(item) for item in failures],
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    elif failures:
        print(f"RELATÓRIO INVÁLIDO — {len(failures)} divergência(s)")
        for finding in failures:
            print(f"- [{finding.check_id}] {finding.message}")
    else:
        print("RELATÓRIO VÁLIDO — arquitetura, métodos, estratégias e heurísticas correspondem ao código.")
        print(f"Fonte validada: {report_path}")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
