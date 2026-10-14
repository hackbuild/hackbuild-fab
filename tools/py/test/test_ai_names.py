"""tools/py/orca3mf.py reads tools/ai-names.json, the one list of AI tool names (D-001)."""
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools/py"))
import orca3mf  # noqa: E402

NAMES = json.loads((REPO / "tools/ai-names.json").read_text())


@pytest.mark.parametrize("who", ["Claude", "Sonnet 4.5", "Claude Opus", "GPT-4", "Codex", "Cursor", "ChatGPT"])
def test_a_tool_is_refused_as_designer(who):
    with pytest.raises(orca3mf.ExportError):
        orca3mf.attribution(who, "MIT", 315532800)


def test_a_person_passes_and_every_listed_name_is_refused():
    assert orca3mf.attribution("Moheeb Zara", "MIT", 315532800)["designer"] == "Moheeb Zara"
    for n in ("claude", "anthropic", "chatgpt", "openai", "copilot", "gemini", "sonnet", "opus", "haiku", "codex"):
        assert n in NAMES["tools"], n
        assert orca3mf.AI_NAME.search(n.title()), n
