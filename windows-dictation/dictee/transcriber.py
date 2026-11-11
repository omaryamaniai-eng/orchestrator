"""Transcription locale avec faster-whisper (CTranslate2).

Sur CPU le modele est charge en int8 ; sur GPU NVIDIA en float16.
"""

from __future__ import annotations

import os
import threading

import numpy as np

from .config import Config, models_dir


def _cuda_available() -> bool:
    try:
        import ctranslate2

        return ctranslate2.get_cuda_device_count() > 0
    except Exception:  # noqa: BLE001
        return False


def resolve_device(requested: str) -> tuple[str, str]:
    """Retourne (device, compute_type)."""
    if requested == "cuda" or (requested == "auto" and _cuda_available()):
        return "cuda", "float16"
    return "cpu", "int8"


class Transcriber:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self._model = None
        self._loaded_key: tuple | None = None
        self._lock = threading.Lock()
        self.device = "cpu"

    def load(self) -> None:
        from faster_whisper import WhisperModel

        device, compute_type = resolve_device(self.cfg.device)
        key = (self.cfg.model, device, compute_type)
        with self._lock:
            if self._loaded_key == key:
                return
            threads = max(1, (os.cpu_count() or 4) - 1)
            self._model = WhisperModel(
                self.cfg.model,
                device=device,
                compute_type=compute_type,
                cpu_threads=threads,
                download_root=str(models_dir()),
            )
            self._loaded_key = key
            self.device = device

    def transcribe(self, audio: np.ndarray) -> str:
        if audio.size < 16000 * 0.3:  # moins de 300 ms : on ignore
            return ""
        self.load()
        language = None if self.cfg.language == "auto" else self.cfg.language
        with self._lock:
            segments, _info = self._model.transcribe(
                audio,
                language=language,
                beam_size=self.cfg.beam_size,
                vad_filter=True,
                condition_on_previous_text=False,
                initial_prompt=self.cfg.initial_prompt or None,
            )
            text = " ".join(seg.text.strip() for seg in segments)
        return " ".join(text.split())
