# Construit Dictee.exe (dossier dist\Dictee) sur un poste Windows avec Python 3.11+.
$ErrorActionPreference = "Stop"
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip install -r requirements.txt pyinstaller
.\.venv\Scripts\pyinstaller --noconfirm --clean --windowed --name Dictee `
    --collect-all faster_whisper --collect-all ctranslate2 `
    --collect-binaries onnxruntime --collect-data onnxruntime `
    --hidden-import pystray._win32 `
    run_dictee.py
Write-Host "Executable : dist\Dictee\Dictee.exe"
