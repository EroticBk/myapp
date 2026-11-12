@echo off
REM =====================================================================
REM ClipForge AI - Windows .exe Build Script (One-Click Standalone Build)
REM =====================================================================

echo [1/4] Checking Python environment...
python --version
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

echo.
echo [2/4] Installing / Updating project dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies from requirements.txt.
    pause
    exit /b 1
)

echo.
echo [3/4] Pulling local Ollama model (llama3.2:1b)...
ollama pull llama3.2:1b

echo.
echo [4/4] Compiling Standalone .exe using PyInstaller...
pyinstaller clipforge.spec --clean --noconfirm

if errorlevel 1 (
    echo [ERROR] Compilation failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo SUCCESS! Your standalone executable is ready:
echo Location: dist\ClipForgeAI.exe
echo =====================================================================
pause
