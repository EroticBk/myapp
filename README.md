# ClipForge AI - 100% Free, Offline, Local Video Clipper Desktop App

A completely local, privacy-respecting desktop application that takes any long-form video (YouTube link or local media file), transcribes speech locally using Whisper on CPU, extracts peak-hook 45-60 second highlights using a local Ollama LLM (`llama3.2:1b`), and automatically crops to **9:16 vertical video** with a synchronized **.srt subtitle file** ready for CapCut Pro or Premiere Pro.

---

## 🚀 Key Features

* **100% Offline & Free:** No OpenAI, no Gemini, no cloud subscriptions, no API keys, no monthly fees.
* **Modern Dark GUI (`customtkinter`):** Sleek interface with fluid progress bars, real-time logging, and file browsing.
* **Non-Blocking Background Threads:** Processing runs entirely in a dedicated background daemon thread—the UI never freezes or shows "Not Responding".
* **Local Whisper Engine (`faster-whisper`):** Fast quantized CPU speech-to-text with word-level timestamps.
* **Local AI Hook Hunter (`ollama` + `llama3.2:1b`):** Evaluates speech content with strict system prompting and regex MM:SS extraction to find the most viral 45-60 second hook.
* **Audio Peak Detector (`pydub`):** Scans for volume spikes and reaction moments to prioritize intense sections.
* **FFmpeg Vertical Cropper (`ffmpeg-python`):** Cuts and applies `-vf "crop=ih*9/16:ih"` to center 16:9 video into 9:16 format.
* **Synced Subtitle (.srt) Generator:** Outputs ready-to-use subtitles offset to match the new clip timestamp starting from `00:00:00,000`.

---

## 🛠️ Prerequisites

1. **Python 3.10+**: [python.org](https://www.python.org/downloads/)
2. **FFmpeg**: Must be installed and added to system PATH.
   - *Windows:* `winget install Gyan.FFmpeg` or download from [ffmpeg.org](https://ffmpeg.org).
   - *Mac:* `brew install ffmpeg`
   - *Linux:* `sudo apt install ffmpeg`
3. **Ollama**: [ollama.com](https://ollama.com)
   - After installing Ollama, pull the required local model:
     ```bash
     ollama run llama3.2:1b
     ```

---

## 📦 Quick Start (Running from Python)

1. Clone or extract this repository into a folder.
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the desktop application:
   ```bash
   python main.py
   ```

---

## 🔨 Compiling to Standalone `.exe` (PyInstaller)

To compile the application into a single standalone `.exe` without a console window, run:

### Option A: Using the provided spec file (Recommended)
```bash
pyinstaller clipforge.spec --clean --noconfirm
```

### Option B: Single terminal command (Direct PyInstaller CLI)

**On Windows:**
```bash
pyinstaller --noconsole --onefile --name "ClipForgeAI" --collect-all customtkinter --hidden-import faster_whisper --hidden-import ctranslate2 --hidden-import ollama --hidden-import yt_dlp --hidden-import ffmpeg --hidden-import pydub main.py
```

**Alternative Windows CLI with exact customtkinter path:**
```bash
python -c "import customtkinter, os; print(os.path.dirname(customtkinter.__file__))"
# Use the printed path in --add-data:
pyinstaller --noconsole --onefile --name "ClipForgeAI" --add-data "<CUSTOMTKINTER_PATH>;customtkinter/" --hidden-import faster_whisper --hidden-import ctranslate2 --hidden-import ollama main.py
```

Your compiled `.exe` will be located in the `dist/` directory:
```
dist/ClipForgeAI.exe
```
Double-click `ClipForgeAI.exe` to run the desktop application anywhere without needing Python installed.

---

## 📂 Project Architecture

```
clipforge/
│
├── main.py              # CustomTkinter Dark GUI + Background Threading Controller
├── transcriber.py       # faster-whisper CPU transcription + word timestamps + SRT maker
├── ai_logic.py          # Local Ollama llama3.2:1b bridge + strict regex timestamp parser
├── audio_filter.py      # pydub audio peak & volume spike analyzer
├── video_editor.py      # yt-dlp downloader + FFmpeg 9:16 center-crop + export
├── requirements.txt     # Python dependencies
├── clipforge.spec       # Standalone PyInstaller build configuration
├── build_exe.bat        # Windows one-click automated build script
└── README.md            # Complete documentation
```
