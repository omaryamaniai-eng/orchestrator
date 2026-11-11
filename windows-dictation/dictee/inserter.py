"""Insertion du texte dans la fenetre active (Teams, Outlook, navigateur...).

On passe par le presse-papiers + Ctrl+V : c'est la methode la plus fiable
pour les accents et les applications Electron comme Teams. Le contenu
precedent du presse-papiers est restaure ensuite.
"""

from __future__ import annotations

import time

import keyboard
import pyperclip


def insert_text(text: str) -> None:
    if not text:
        return
    try:
        previous = pyperclip.paste()
    except pyperclip.PyperclipException:
        previous = None

    pyperclip.copy(text)
    time.sleep(0.05)
    keyboard.send("ctrl+v")
    time.sleep(0.3)

    if previous is not None:
        try:
            pyperclip.copy(previous)
        except pyperclip.PyperclipException:
            pass
