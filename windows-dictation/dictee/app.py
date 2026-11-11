"""Application de dictee : icone dans la barre des taches + raccourci global.

Flux : raccourci -> enregistrement micro -> raccourci -> transcription locale
-> collage du texte dans la fenetre qui a le focus.
"""

from __future__ import annotations

import logging
import queue
import sys
import threading

import keyboard
import pystray
from PIL import Image, ImageDraw

from .config import LANGUAGES, MODELS, Config, app_dir
from .inserter import insert_text
from .recorder import Recorder
from .transcriber import Transcriber

log = logging.getLogger("dictee")

COLORS = {
    "loading": (120, 120, 120),
    "idle": (40, 120, 220),
    "recording": (220, 40, 40),
    "processing": (240, 160, 0),
    "error": (0, 0, 0),
}


def _icon_image(state: str) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    color = COLORS[state]
    draw.ellipse((4, 4, 60, 60), fill=color)
    # Micro stylise
    draw.rounded_rectangle((24, 14, 40, 38), radius=8, fill="white")
    draw.arc((18, 24, 46, 46), start=0, end=180, fill="white", width=3)
    draw.line((32, 46, 32, 52), fill="white", width=3)
    return img


def _beep(freq: int) -> None:
    if sys.platform == "win32":
        import winsound

        threading.Thread(target=winsound.Beep, args=(freq, 80), daemon=True).start()


class DictationApp:
    def __init__(self) -> None:
        self.cfg = Config.load()
        self.recorder = Recorder()
        self.transcriber = Transcriber(self.cfg)
        self.jobs: queue.Queue = queue.Queue()
        self.state = "loading"
        self.icon = pystray.Icon("dictee", _icon_image("loading"), "Dictee - chargement", self._menu())

    # ------------------------------------------------------------------ etat
    def _set_state(self, state: str, detail: str = "") -> None:
        self.state = state
        labels = {
            "loading": "chargement du modele",
            "idle": f"pret ({self.cfg.hotkey if self.cfg.mode == 'toggle' else self.cfg.push_to_talk_key})",
            "recording": "enregistrement...",
            "processing": "transcription...",
            "error": "erreur",
        }
        title = f"Dictee - {labels[state]}"
        if detail:
            title += f" - {detail}"
        self.icon.icon = _icon_image(state)
        self.icon.title = title[:127]

    # ----------------------------------------------------------- dictee
    def start_recording(self) -> None:
        if self.recorder.recording or self.state in ("loading", "processing"):
            return
        try:
            self.recorder.start()
        except Exception as exc:  # noqa: BLE001
            log.exception("Micro indisponible")
            self._set_state("error", str(exc))
            return
        if self.cfg.beep:
            _beep(880)
        self._set_state("recording")

    def stop_recording(self) -> None:
        if not self.recorder.recording:
            return
        audio = self.recorder.stop()
        if self.cfg.beep:
            _beep(440)
        self._set_state("processing")
        self.jobs.put(audio)

    def toggle(self) -> None:
        if self.recorder.recording:
            self.stop_recording()
        else:
            self.start_recording()

    def _worker(self) -> None:
        try:
            self.transcriber.load()
            self._set_state("idle", self.transcriber.device.upper())
        except Exception as exc:  # noqa: BLE001
            log.exception("Chargement du modele impossible")
            self._set_state("error", str(exc))

        while True:
            job = self.jobs.get()
            if job is None:
                return
            if job == "reload":
                self._set_state("loading")
                try:
                    self.transcriber.load()
                    self._set_state("idle", self.transcriber.device.upper())
                except Exception as exc:  # noqa: BLE001
                    log.exception("Rechargement impossible")
                    self._set_state("error", str(exc))
                continue
            try:
                text = self.transcriber.transcribe(job)
                if text:
                    if self.cfg.trailing_space:
                        text += " "
                    insert_text(text)
                self._set_state("idle", self.transcriber.device.upper())
            except Exception as exc:  # noqa: BLE001
                log.exception("Transcription en echec")
                self._set_state("error", str(exc))

    # ---------------------------------------------------------- raccourcis
    def _register_hotkeys(self) -> None:
        keyboard.unhook_all()
        if self.cfg.mode == "push_to_talk":
            key = self.cfg.push_to_talk_key
            keyboard.on_press_key(key, lambda _e: self.start_recording(), suppress=False)
            keyboard.on_release_key(key, lambda _e: self.stop_recording(), suppress=False)
        else:
            keyboard.add_hotkey(self.cfg.hotkey, self.toggle, suppress=True)

    # ---------------------------------------------------------------- menu
    def _menu(self) -> pystray.Menu:
        def model_item(key: str, label: str) -> pystray.MenuItem:
            return pystray.MenuItem(
                label,
                lambda _i, _it: self._change(model=key),
                checked=lambda _it: self.cfg.model == key,
                radio=True,
            )

        def lang_item(key: str, label: str) -> pystray.MenuItem:
            return pystray.MenuItem(
                label,
                lambda _i, _it: self._change(language=key),
                checked=lambda _it: self.cfg.language == key,
                radio=True,
            )

        def device_item(key: str, label: str) -> pystray.MenuItem:
            return pystray.MenuItem(
                label,
                lambda _i, _it: self._change(device=key),
                checked=lambda _it: self.cfg.device == key,
                radio=True,
            )

        def mode_item(key: str, label: str) -> pystray.MenuItem:
            return pystray.MenuItem(
                label,
                lambda _i, _it: self._change(mode=key),
                checked=lambda _it: self.cfg.mode == key,
                radio=True,
            )

        return pystray.Menu(
            pystray.MenuItem("Demarrer / arreter la dictee", lambda _i, _it: self.toggle(), default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Modele", pystray.Menu(*(model_item(k, v) for k, v in MODELS.items()))),
            pystray.MenuItem("Langue", pystray.Menu(*(lang_item(k, v) for k, v in LANGUAGES.items()))),
            pystray.MenuItem(
                "Processeur",
                pystray.Menu(
                    device_item("auto", "Automatique (GPU si disponible)"),
                    device_item("cpu", "CPU"),
                    device_item("cuda", "GPU NVIDIA (CUDA)"),
                ),
            ),
            pystray.MenuItem(
                "Mode",
                pystray.Menu(
                    mode_item("toggle", "Appui pour demarrer / arreter"),
                    mode_item("push_to_talk", "Maintenir pour parler"),
                ),
            ),
            pystray.MenuItem("Ouvrir le dossier de configuration", lambda _i, _it: self._open_config()),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quitter", lambda _i, _it: self.quit()),
        )

    def _change(self, **changes) -> None:
        for key, value in changes.items():
            setattr(self.cfg, key, value)
        self.cfg.save()
        if "mode" in changes:
            self._register_hotkeys()
            self._set_state(self.state)
        if {"model", "device"} & changes.keys():
            self.jobs.put("reload")

    def _open_config(self) -> None:
        if sys.platform == "win32":
            import os

            os.startfile(app_dir())  # noqa: S606

    def quit(self) -> None:
        if self.recorder.recording:
            self.recorder.stop()
        keyboard.unhook_all()
        self.jobs.put(None)
        self.icon.stop()

    # ---------------------------------------------------------------- run
    def run(self) -> None:
        threading.Thread(target=self._worker, daemon=True).start()
        self._register_hotkeys()
        self.icon.run()


def main() -> None:
    logging.basicConfig(
        filename=str(app_dir() / "dictee.log"),
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    DictationApp().run()


if __name__ == "__main__":
    main()
