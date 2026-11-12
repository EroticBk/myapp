# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller Specification File for ClipForge AI Desktop Application
Compiles main.py into a standalone, single-file Windows .exe without console window.
Handles customtkinter asset inclusion and faster-whisper / ctranslate2 hidden imports.
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect customtkinter data files (fonts, themes, assets)
customtkinter_datas = collect_data_files('customtkinter')

# Collect any faster_whisper or ctranslate2 submodules
whisper_hidden = collect_submodules('faster_whisper')
ctranslate_hidden = collect_submodules('ctranslate2')
ollama_hidden = collect_submodules('ollama')

all_hidden_imports = list(set([
    'customtkinter',
    'faster_whisper',
    'ctranslate2',
    'ollama',
    'yt_dlp',
    'ffmpeg',
    'pydub',
    'tkinter',
    'tkinter.filedialog',
    'tkinter.messagebox',
    'typing',
    'threading',
    'json',
    're',
    'subprocess',
    'platform'
] + whisper_hidden + ctranslate_hidden + ollama_hidden))

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=customtkinter_datas,
    hiddenimports=all_hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'scipy', 'notebook', 'torch'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ClipForgeAI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window (pure GUI mode)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None
)
