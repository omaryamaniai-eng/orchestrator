"""Mesure le temps de transcription d'un fichier audio sur la machine courante.

Usage : python benchmark.py chemin/vers/audio.wav [--models tiny base small large-v3-turbo] [--device cpu]
Permet de choisir le modele adapte au poste avant de distribuer l'application.
"""

from __future__ import annotations

import argparse
import time

from faster_whisper import WhisperModel, decode_audio


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("--models", nargs="+", default=["tiny", "base", "small", "large-v3-turbo"])
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    parser.add_argument("--language", default="fr")
    args = parser.parse_args()

    audio = decode_audio(args.audio, sampling_rate=16000)
    duration = len(audio) / 16000
    compute_type = "int8" if args.device == "cpu" else "float16"
    print(f"Audio : {duration:.1f} s - device={args.device} compute_type={compute_type}\n")

    for name in args.models:
        t0 = time.perf_counter()
        model = WhisperModel(name, device=args.device, compute_type=compute_type)
        load = time.perf_counter() - t0
        t0 = time.perf_counter()
        segments, _ = model.transcribe(audio, language=args.language, beam_size=1, vad_filter=True)
        text = " ".join(s.text.strip() for s in segments)
        elapsed = time.perf_counter() - t0
        print(f"[{name}] chargement {load:.1f} s | transcription {elapsed:.1f} s | facteur temps reel {elapsed / duration:.2f}")
        print(f"  {text}\n")


if __name__ == "__main__":
    main()
