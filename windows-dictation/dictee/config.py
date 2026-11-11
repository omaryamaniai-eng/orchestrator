"""Configuration persistante de l'application (fichier JSON dans %APPDATA%)."""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path

APP_NAME = "Dictee"

# Modeles proposes dans le menu. Cle = identifiant faster-whisper / Hugging Face.
MODELS = {
    "tiny": "Tiny (39M) - tres rapide, qualite limitee",
    "base": "Base (74M) - rapide",
    "small": "Small (244M) - bon compromis CPU",
    "large-v3-turbo": "Large v3 Turbo (809M) - meilleure qualite, GPU conseille",
}

LANGUAGES = {
    "fr": "Francais",
    "en": "Anglais",
    "auto": "Detection automatique",
}


def app_dir() -> Path:
    base = os.environ.get("APPDATA") or str(Path.home() / ".config")
    path = Path(base) / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def models_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / ".cache")
    path = Path(base) / APP_NAME / "models"
    path.mkdir(parents=True, exist_ok=True)
    return path


@dataclass
class Config:
    model: str = "small"
    language: str = "fr"
    # "auto" : CUDA si disponible, sinon CPU. Valeurs possibles : auto, cpu, cuda.
    device: str = "auto"
    # "toggle" : un appui demarre, un second appui arrete et transcrit.
    # "push_to_talk" : on parle tant que la touche est maintenue.
    mode: str = "toggle"
    hotkey: str = "ctrl+alt+space"
    push_to_talk_key: str = "right ctrl"
    beam_size: int = 1
    beep: bool = True
    # Ajoute un espace apres le texte insere pour enchainer les dictees.
    trailing_space: bool = True
    initial_prompt: str = ""
    extra: dict = field(default_factory=dict)

    @classmethod
    def load(cls) -> "Config":
        path = app_dir() / "config.json"
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                known = {k: v for k, v in data.items() if k in cls.__dataclass_fields__}
                return cls(**known)
            except (OSError, ValueError, TypeError):
                pass
        cfg = cls()
        cfg.save()
        return cfg

    def save(self) -> None:
        path = app_dir() / "config.json"
        path.write_text(json.dumps(asdict(self), indent=2, ensure_ascii=False), encoding="utf-8")
