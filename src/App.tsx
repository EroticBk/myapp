/**
 * ClipForge AI - Local Video Clipper Desktop Studio
 * React Web Studio, Simulator, Code Explorer & PyInstaller Compilation Center
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Code,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  FolderOpen,
  Terminal,
  Cpu,
  Sparkles,
  Scissors,
  FileText,
  Layers,
  Settings,
  HelpCircle,
  ExternalLink,
  Volume2,
  RefreshCw,
  Video,
  Monitor,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import JSZip from 'jszip';
import { CODEBASE_FILES, CodeFile } from './data/codebaseFiles';
import {
  extractTimestampsFromLlm,
  mmSsToSeconds,
  secondsToMmSs,
  formatTimestampSrt,
  calculate9x16Crop,
  buildSrtFromWords,
  WordTimestamp
} from './utils/pipelineLogic';

// Sample presets for instant testing
interface DemoPreset {
  title: string;
  urlOrPath: string;
  sourceTitle: string;
  durationSec: number;
  aiHighlight: {
    startMmSs: string;
    endMmSs: string;
    hookText: string;
  };
  sampleWords: WordTimestamp[];
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    title: "Podcast: The Secret to High Performance Habits",
    urlOrPath: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    sourceTitle: "The High Performance Habit Loop (Ep. 42)",
    durationSec: 1820,
    aiHighlight: {
      startMmSs: "04:15",
      endMmSs: "05:08",
      hookText: "If you don't control your morning, someone else will control your entire day."
    },
    sampleWords: [
      { word: "If", start: 255.0, end: 255.2 },
      { word: "you", start: 255.3, end: 255.5 },
      { word: "don't", start: 255.6, end: 255.9 },
      { word: "control", start: 256.0, end: 256.4 },
      { word: "your", start: 256.5, end: 256.7 },
      { word: "morning", start: 256.8, end: 257.2 },
      { word: "routine,", start: 257.3, end: 257.7 },
      { word: "someone", start: 258.0, end: 258.3 },
      { word: "else", start: 258.4, end: 258.6 },
      { word: "will", start: 258.7, end: 258.9 },
      { word: "dictate", start: 259.0, end: 259.4 },
      { word: "your", start: 259.5, end: 259.7 },
      { word: "entire", start: 259.8, end: 260.2 },
      { word: "future.", start: 260.3, end: 260.8 },
      { word: "The", start: 261.2, end: 261.4 },
      { word: "greatest", start: 261.5, end: 262.0 },
      { word: "athletes", start: 262.1, end: 262.6 },
      { word: "and", start: 262.7, end: 262.8 },
      { word: "founders", start: 262.9, end: 263.4 },
      { word: "protect", start: 263.5, end: 263.9 },
      { word: "their", start: 264.0, end: 264.2 },
      { word: "first", start: 264.3, end: 264.6 },
      { word: "two", start: 264.7, end: 264.9 },
      { word: "hours", start: 265.0, end: 265.4 },
      { word: "like", start: 265.5, end: 265.7 },
      { word: "gold.", start: 265.8, end: 266.3 },
    ]
  },
  {
    title: "Tech Keynote: Why Local On-Device AI Wins",
    urlOrPath: "C:\\Videos\\Keynote_Local_AI_Models_2026.mp4",
    sourceTitle: "Keynote_Local_AI_Models_2026.mp4",
    durationSec: 2450,
    aiHighlight: {
      startMmSs: "12:30",
      endMmSs: "13:24",
      hookText: "Cloud APIs cost fortune and leak your data. Local 1B models now run in 20 milliseconds on a laptop."
    },
    sampleWords: [
      { word: "Cloud", start: 750.0, end: 750.4 },
      { word: "APIs", start: 750.5, end: 750.9 },
      { word: "cost", start: 751.0, end: 751.3 },
      { word: "a", start: 751.4, end: 751.5 },
      { word: "fortune", start: 751.6, end: 752.1 },
      { word: "and", start: 752.2, end: 752.4 },
      { word: "leak", start: 752.5, end: 752.8 },
      { word: "your", start: 752.9, end: 753.1 },
      { word: "data.", start: 753.2, end: 753.7 },
      { word: "Small", start: 754.2, end: 754.6 },
      { word: "quantized", start: 754.7, end: 755.3 },
      { word: "models", start: 755.4, end: 755.8 },
      { word: "run", start: 756.0, end: 756.3 },
      { word: "in", start: 756.4, end: 756.5 },
      { word: "twenty", start: 756.6, end: 757.0 },
      { word: "milliseconds", start: 757.1, end: 757.9 },
      { word: "on", start: 758.0, end: 758.2 },
      { word: "your", start: 758.3, end: 758.5 },
      { word: "laptop.", start: 758.6, end: 759.1 },
    ]
  },
  {
    title: "Gaming Clutch: 1v4 Final Circle Tournament Victory",
    urlOrPath: "https://www.youtube.com/watch?v=k9vKx9QeF_A",
    sourceTitle: "Apex Legends Grand Finals Match 7",
    durationSec: 960,
    aiHighlight: {
      startMmSs: "08:10",
      endMmSs: "09:02",
      hookText: "NO WAY! He just hit the wall-bounce Kraber headshot to win the world championship!"
    },
    sampleWords: [
      { word: "NO", start: 490.0, end: 490.3 },
      { word: "WAY!", start: 490.4, end: 490.9 },
      { word: "He", start: 491.2, end: 491.4 },
      { word: "just", start: 491.5, end: 491.7 },
      { word: "hit", start: 491.8, end: 492.0 },
      { word: "the", start: 492.1, end: 492.2 },
      { word: "wall-bounce", start: 492.3, end: 492.9 },
      { word: "Kraber", start: 493.0, end: 493.5 },
      { word: "headshot!", start: 493.6, end: 494.3 },
      { word: "They", start: 494.8, end: 495.1 },
      { word: "won", start: 495.2, end: 495.4 },
      { word: "the", start: 495.5, end: 495.6 },
      { word: "entire", start: 495.7, end: 496.1 },
      { word: "championship!", start: 496.2, end: 497.0 },
    ]
  }
];

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'simulator' | 'codebase' | 'pyinstaller' | 'architecture' | 'tester'>('simulator');

  // Simulator State
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [inputUrlOrPath, setInputUrlOrPath] = useState<string>(DEMO_PRESETS[0].urlOrPath);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Ready. Enter a video and click 'Generate Clips'.");
  const [progressValue, setProgressValue] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "System initialized. Local Whisper, Ollama (llama3.2:1b), and FFmpeg ready.",
    "Hardware detected: CPU/APU execution enabled (CTranslate2 int8)."
  ]);

  // Result state
  const [completedOutput, setCompletedOutput] = useState<{
    videoName: string;
    srtName: string;
    duration: number;
    startMmSs: string;
    endMmSs: string;
    srtText: string;
    hookText: string;
  } | null>(null);

  // Video preview simulation
  const [isPlayingClip, setIsPlayingClip] = useState<boolean>(true);
  const [playbackTime, setPlaybackTime] = useState<number>(0);

  // Codebase Explorer State
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Tester State
  const [testLlmPromptOutput, setTestLlmPromptOutput] = useState<string>("[START: 01:25, END: 02:20]");
  const [testSourceWidth, setTestSourceWidth] = useState<number>(1920);
  const [testSourceHeight, setTestSourceHeight] = useState<number>(1080);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Clip playback timer
  useEffect(() => {
    let interval: any;
    if (completedOutput && isPlayingClip) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          const next = prev + 0.5;
          if (next >= (completedOutput?.duration || 50)) {
            return 0;
          }
          return next;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [completedOutput, isPlayingClip]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleDownloadSingleFile = (file: CodeFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZipBundle = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      CODEBASE_FILES.forEach((f) => {
        zip.file(f.name, f.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ClipForge_AI_Local_Clipper.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP creation failed", err);
    } finally {
      setIsZipping(false);
    }
  };

  // Run the simulated desktop pipeline step-by-step
  const runSimulatedPipeline = () => {
    if (isProcessing) return;

    const currentPreset = DEMO_PRESETS[selectedPresetIndex] || DEMO_PRESETS[0];
    const target = inputUrlOrPath.trim() || currentPreset.urlOrPath;

    setIsProcessing(true);
    setCompletedOutput(null);
    setProgressValue(0.05);
    setStatusMessage("Connecting and loading video source...");

    const addLog = (msg: string) => {
      setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    addLog(`============================================================`);
    addLog(`Starting ClipForge Local Pipeline for: ${target}`);

    // Step 1: Video Retrieval
    setTimeout(() => {
      const isUrl = target.startsWith('http://') || target.startsWith('https://');
      if (isUrl) {
        setStatusMessage("Downloading YouTube Video (yt-dlp)...");
        addLog("[Step 1/5] yt-dlp: Extracting best video/audio streams...");
        addLog("[Step 1/5] yt-dlp: Merging into mp4 container (1080p high bitrate)...");
      } else {
        setStatusMessage("Verifying local media file...");
        addLog(`[Step 1/5] Local file verified: ${target}`);
      }
      setProgressValue(0.25);
    }, 900);

    // Step 2: Audio Peak Analysis
    setTimeout(() => {
      setStatusMessage("Analyzing Audio Volume Peaks (pydub)...");
      addLog("[Step 2/5] pydub: Sampling audio chunks (1000ms window)...");
      addLog("[Step 2/5] pydub: Peak energy volume spike detected at -4.2 dBFS.");
      setProgressValue(0.40);
    }, 2000);

    // Step 3: Local Whisper Transcription
    setTimeout(() => {
      setStatusMessage("Transcribing Audio with faster-whisper (CPU int8)...");
      addLog("[Step 3/5] faster-whisper: Initializing 'base' model on CPU (int8 quantization)...");
      addLog("[Step 3/5] faster-whisper: Running Voice Activity Detection (silence filter)...");
      addLog(`[Step 3/5] faster-whisper: Generated ${currentPreset.sampleWords.length * 15} word timestamps with start/end millisecond precision.`);
      setProgressValue(0.65);
    }, 3400);

    // Step 4: Local Ollama llama3.2:1b Highlight Selection
    setTimeout(() => {
      setStatusMessage("AI Analyzing Highlight (Ollama llama3.2:1b)...");
      addLog("[Step 4/5] Ollama: Sending transcript to local 'llama3.2:1b' daemon (temp=0.2)...");
      addLog(`[Step 4/5] Ollama Response: "[START: ${currentPreset.aiHighlight.startMmSs}, END: ${currentPreset.aiHighlight.endMmSs}]"`);
      addLog(`[Step 4/5] Regex Parser: Extracted window ${currentPreset.aiHighlight.startMmSs} -> ${currentPreset.aiHighlight.endMmSs}`);
      setProgressValue(0.85);
    }, 4900);

    // Step 5: FFmpeg 9:16 Vertical Cropping & SRT
    setTimeout(() => {
      setStatusMessage("Rendering 9:16 Vertical Video (FFmpeg crop=ih*9/16:ih)...");
      addLog("[Step 5/5] FFmpeg: Applying filter '-vf crop=ih*9/16:ih' (centered 1080x1920 crop)...");
      addLog("[Step 5/5] Subtitle Generator: Offsetting word timestamps relative to clip start 00:00:00,000...");
      setProgressValue(0.95);
    }, 6200);

    // Completion
    setTimeout(() => {
      const startSec = mmSsToSeconds(currentPreset.aiHighlight.startMmSs);
      const endSec = mmSsToSeconds(currentPreset.aiHighlight.endMmSs);
      const duration = endSec - startSec;
      const srtText = buildSrtFromWords(currentPreset.sampleWords, startSec, endSec, 4);

      const outVideo = `ViralClip_${currentPreset.sourceTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${intSafe(startSec)}s_to_${intSafe(endSec)}s_9x16.mp4`;
      const outSrt = `ViralClip_${currentPreset.sourceTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${intSafe(startSec)}s_to_${intSafe(endSec)}s.srt`;

      addLog(`[Step 5/5] FFmpeg render complete: Outputs/${outVideo}`);
      addLog(`[Step 5/5] Subtitle file generated: Outputs/${outSrt}`);
      addLog(`PROCESS COMPLETED SUCCESSFULLY in 7.4 seconds!`);
      addLog(`============================================================`);

      setCompletedOutput({
        videoName: outVideo,
        srtName: outSrt,
        duration: duration,
        startMmSs: currentPreset.aiHighlight.startMmSs,
        endMmSs: currentPreset.aiHighlight.endMmSs,
        srtText: srtText,
        hookText: currentPreset.aiHighlight.hookText
      });

      setStatusMessage("Finished! 9:16 Clip and .SRT generated.");
      setProgressValue(1.0);
      setIsProcessing(false);
      setPlaybackTime(0);
      setIsPlayingClip(true);
    }, 7400);
  };

  function intSafe(n: number) {
    return Math.floor(n);
  }

  // Active word in preview
  const currentSubtitleWord = (() => {
    if (!completedOutput) return "";
    const currentPreset = DEMO_PRESETS[selectedPresetIndex] || DEMO_PRESETS[0];
    const startSec = mmSsToSeconds(completedOutput.startMmSs);
    const absCurrentTime = startSec + playbackTime;
    const match = currentPreset.sampleWords.find(
      (w) => absCurrentTime >= w.start && absCurrentTime <= w.end
    );
    if (match) return match.word;
    return completedOutput.hookText.slice(0, 35) + "...";
  })();

  const currentFile = CODEBASE_FILES[selectedFileIndex] || CODEBASE_FILES[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-black text-xl">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">ClipForge AI</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100% Free &amp; Offline
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Desktop .exe
                </span>
              </div>
              <p className="text-xs text-slate-400">
                CustomTkinter GUI • faster-whisper • Ollama (llama3.2:1b) • FFmpeg 9:16 Cropper
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZipBundle}
              disabled={isZipping}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
              title="Download all Python files, requirements.txt, .spec, and batch scripts as a zip"
            >
              {isZipping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Download Project .ZIP</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Desktop App Live Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('codebase')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'codebase'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Codebase Explorer ({CODEBASE_FILES.length} Files)</span>
          </button>

          <button
            onClick={() => setActiveTab('pyinstaller')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'pyinstaller'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>PyInstaller .EXE &amp; Setup Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Pipeline Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'tester'
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Regex &amp; Crop Math Bench</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ========================================================================= */}
        {/* TAB 1: DESKTOP APP LIVE SIMULATOR */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Simulated CustomTkinter Window */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Window Title Bar */}
              <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    ClipForge AI - Local Video Clipper (100% Offline)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-sky-400 font-mono">
                    CustomTkinter Dark
                  </span>
                  <span>_</span>
                  <span>□</span>
                  <span>✕</span>
                </div>
              </div>

              {/* Window Body (Replicating main.py layout) */}
              <div className="p-5 space-y-4">
                {/* Header Frame */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                        <span>🎬 ClipForge AI Studio</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Local Whisper Transcription + Ollama (llama3.2:1b) + 9:16 FFmpeg Auto-Clipper
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-500 font-mono">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        No Cloud / Offline
                      </span>
                      <span>Thread: daemon=True</span>
                    </div>
                  </div>
                </div>

                {/* Preset Picker (Quick test helpers) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Quick Test Preset Examples:</span>
                    <span className="text-[11px] text-slate-500 font-normal">Click to load into input</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DEMO_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedPresetIndex(idx);
                          setInputUrlOrPath(preset.urlOrPath);
                        }}
                        className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                          selectedPresetIndex === idx
                            ? 'bg-sky-950/60 border-sky-500/50 text-sky-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-medium text-slate-200 truncate">{preset.title.split(':')[0]}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{preset.sourceTitle}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source Input & Browse Button */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    Source Video (YouTube URL or Local File):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputUrlOrPath}
                      onChange={(e) => setInputUrlOrPath(e.target.value)}
                      placeholder="Paste YouTube URL (https://...) or choose a local .mp4 / .mkv / .mp3"
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const localPath = "C:\\Videos\\Offline_Podcast_Recording_2026.mp4";
                        setInputUrlOrPath(localPath);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Browse...</span>
                    </button>
                  </div>
                </div>

                {/* Action Button & Status Bar */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <button
                    type="button"
                    onClick={runSimulatedPipeline}
                    disabled={isProcessing}
                    className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                      isProcessing
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 active:scale-[0.99]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                        <span>Processing in Background Thread (UI remains responsive)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-sky-200" />
                        <span>⚡ Generate Viral 9:16 Clips</span>
                      </>
                    )}
                  </button>

                  {/* Status & Dynamic Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Status: {statusMessage}</span>
                      <span className="text-sky-400 font-mono font-bold">{Math.round(progressValue * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-sky-600 to-cyan-400 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.max(5, progressValue * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Execution Log Terminal Box */}
                <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <Terminal className="w-3.5 h-3.5 text-sky-400" />
                      <span>Execution Log &amp; Pipeline Details</span>
                    </div>
                    {completedOutput && (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Export Finished
                      </span>
                    )}
                  </div>
                  <div
                    ref={logContainerRef}
                    className="p-3 font-mono text-xs text-slate-300 h-44 overflow-y-auto space-y-1 bg-black/60 scrollbar-thin scrollbar-thumb-slate-800"
                  >
                    {terminalLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`leading-relaxed ${
                          log.includes("[ERROR]")
                            ? "text-rose-400 font-semibold"
                            : log.includes("SUCCESSFULLY")
                            ? "text-emerald-400 font-bold"
                            : log.includes("Step")
                            ? "text-sky-300"
                            : "text-slate-400"
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Output Preview & Synchronized SRT inspector */}
            <div className="lg:col-span-5 space-y-5">
              {completedOutput ? (
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">Clip Generated Successfully!</h3>
                        <p className="text-[11px] text-slate-400">
                          {completedOutput.startMmSs} → {completedOutput.endMmSs} ({completedOutput.duration}s duration)
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                      9:16 Vertical
                    </span>
                  </div>

                  {/* 9:16 Vertical Phone Preview Frame */}
                  <div className="flex justify-center">
                    <div className="relative w-48 sm:w-56 aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border-4 border-slate-800 shadow-2xl flex flex-col justify-between p-3 select-none">
                      {/* Video Simulated Backdrop */}
                      <div className="absolute inset-0 bg-gradient-to-b from-sky-950 via-slate-900 to-indigo-950 opacity-90 flex items-center justify-center">
                        <div className="text-center p-3 opacity-60">
                          <Scissors className="w-8 h-8 text-sky-400 mx-auto mb-2 animate-bounce" />
                          <p className="text-[10px] text-slate-400 font-mono">FFmpeg crop=ih*9/16:ih</p>
                          <p className="text-[9px] text-slate-500">1080x1920 center-lock</p>
                        </div>
                      </div>

                      {/* Top Overlay Badge */}
                      <div className="relative z-10 flex justify-between items-center text-[10px] text-white">
                        <span className="bg-black/60 px-2 py-0.5 rounded-full backdrop-blur font-mono">
                          00:{Math.floor(playbackTime).toString().padStart(2, '0')} / 00:{completedOutput.duration}
                        </span>
                        <span className="bg-rose-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                          Hook
                        </span>
                      </div>

                      {/* Center Play/Pause button */}
                      <div className="relative z-10 flex justify-center">
                        <button
                          onClick={() => setIsPlayingClip(!isPlayingClip)}
                          className="w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur border border-white/20 flex items-center justify-center text-white transition cursor-pointer"
                        >
                          {isPlayingClip ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                      </div>

                      {/* Floating TikTok/CapCut Style Dynamic Subtitles */}
                      <div className="relative z-10 text-center space-y-1">
                        <div className="inline-block bg-black/80 backdrop-blur px-2.5 py-1 rounded-lg border border-yellow-400/40 shadow-xl">
                          <span className="text-xs font-black text-yellow-300 uppercase tracking-wide">
                            {currentSubtitleWord}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-300 font-mono">
                          CapCut / Premiere Pro Synced .SRT
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Generated Files & Output Info */}
                  <div className="space-y-2 pt-2">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <Video className="w-3.5 h-3.5 text-sky-400" />
                          <span>Video (.mp4):</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                          {completedOutput.videoName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>Subtitles (.srt):</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                          {completedOutput.srtName}
                        </span>
                      </div>
                    </div>

                    {/* SRT Text Preview box */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Synchronized .SRT Preview:</span>
                        <button
                          onClick={() => handleCopy(completedOutput.srtText, 'srt-preview')}
                          className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                        >
                          {copiedKey === 'srt-preview' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'srt-preview' ? 'Copied!' : 'Copy .SRT'}</span>
                        </button>
                      </div>
                      <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 max-h-32 overflow-y-auto whitespace-pre-wrap select-all">
                        {completedOutput.srtText}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state guide */
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
                    <Video className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-200">Ready to Clip Videos</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Select one of the 3 presets on the left or paste your own YouTube link/local file, then press
                      <strong className="text-sky-400 font-semibold"> Generate Viral 9:16 Clips</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-left space-y-2 text-xs">
                    <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>What makes this 100% offline &amp; unique:</span>
                    </div>
                    <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                      <li>No cloud APIs, no telemetry, no subscription fees</li>
                      <li>Whisper runs locally via fast CTranslate2 int8 engine</li>
                      <li>Highlight hunter queries local Ollama llama3.2:1b daemon</li>
                      <li>Automated center-crop to 9:16 vertical using FFmpeg</li>
                      <li>Compiles to a single standalone Windows .exe</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CODEBASE EXPLORER */}
        {/* ========================================================================= */}
        {activeTab === 'codebase' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div>
                <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <Code className="w-4 h-4 text-sky-400" />
                  <span>Production Codebase Modules</span>
                </h2>
                <p className="text-xs text-slate-400">
                  All files are saved in the project directory ready to run with <code className="text-sky-300 font-mono">python main.py</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(currentFile.content, `file-${currentFile.name}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                >
                  {copiedKey === `file-${currentFile.name}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === `file-${currentFile.name}` ? 'Copied!' : 'Copy File'}</span>
                </button>
                <button
                  onClick={() => handleDownloadSingleFile(currentFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {currentFile.name}</span>
                </button>
                <button
                  onClick={handleDownloadZipBundle}
                  disabled={isZipping}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All as .ZIP</span>
                </button>
              </div>
            </div>

            {/* File Switcher Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {CODEBASE_FILES.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium border transition whitespace-nowrap cursor-pointer ${
                    selectedFileIndex === idx
                      ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>{file.name}</span>
                </button>
              ))}
            </div>

            {/* Active File Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sky-400 font-semibold">{currentFile.path}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{currentFile.description}</span>
                </div>
                <span className="text-slate-500 font-mono">
                  {currentFile.content.split('\n').length} lines
                </span>
              </div>

              {/* Code Pre Viewer */}
              <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed">
                <table className="w-full border-collapse">
                  <tbody>
                    {currentFile.content.split('\n').map((line, lineIdx) => (
                      <tr key={lineIdx} className="hover:bg-slate-900/60 transition">
                        <td className="text-slate-600 text-right pr-4 select-none w-10 text-[11px] align-top">
                          {lineIdx + 1}
                        </td>
                        <td className="whitespace-pre text-slate-200 font-mono">
                          {line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PYINSTALLER & COMPILATION GUIDE */}
        {/* ========================================================================= */}
        {activeTab === 'pyinstaller' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    PyInstaller Compilation Instructions (Single Standalone .EXE)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Build a 100% self-contained Windows executable without a black console window.
                  </p>
                </div>
              </div>

              {/* Terminal Command Box 1 (Recommended spec) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-400">Option 1 (Recommended): Compile with `clipforge.spec`</span>
                  <button
                    onClick={() => handleCopy("pyinstaller clipforge.spec --clean --noconfirm", 'cmd-opt1')}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {copiedKey === 'cmd-opt1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Command</span>
                  </button>
                </div>
                <div className="p-3 bg-black/80 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400">
                  pyinstaller clipforge.spec --clean --noconfirm
                </div>
                <p className="text-[11px] text-slate-400">
                  The provided <code className="text-slate-300">clipforge.spec</code> automatically harvests CustomTkinter fonts/themes, CTranslate2 binaries, and configures <code className="text-slate-300">console=False</code> so no prompt window appears.
                </p>
              </div>

              {/* Terminal Command Box 2 (Direct single CLI) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-400">Option 2: Single-line Direct PyInstaller CLI</span>
                  <button
                    onClick={() => handleCopy("pyinstaller --noconsole --onefile --name \"ClipForgeAI\" --collect-all customtkinter --hidden-import faster_whisper --hidden-import ctranslate2 --hidden-import ollama --hidden-import yt_dlp --hidden-import ffmpeg --hidden-import pydub main.py", 'cmd-opt2')}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {copiedKey === 'cmd-opt2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Command</span>
                  </button>
                </div>
                <div className="p-3 bg-black/80 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400 break-all select-all">
                  pyinstaller --noconsole --onefile --name "ClipForgeAI" --collect-all customtkinter --hidden-import faster_whisper --hidden-import ctranslate2 --hidden-import ollama --hidden-import yt_dlp --hidden-import ffmpeg --hidden-import pydub main.py
                </div>
              </div>

              {/* Output Location */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-300">Final Executable Destination:</span>
                <code className="text-sky-300 font-mono font-bold bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                  dist\ClipForgeAI.exe
                </code>
              </div>
            </div>

            {/* Prerequisites Checklist */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-400" />
                <span>Local Dependencies &amp; Setup Checklist</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Ollama */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-200">1. Local Ollama</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Local LLM</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-sky-400 underline">ollama.com</a> and run:
                  </p>
                  <div className="p-2 bg-black rounded font-mono text-[11px] text-sky-300 select-all">
                    ollama run llama3.2:1b
                  </div>
                </div>

                {/* Card 2: FFmpeg */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-200">2. FFmpeg</span>
                    <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded">PATH</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Install FFmpeg and ensure it is available in terminal PATH:
                  </p>
                  <div className="p-2 bg-black rounded font-mono text-[11px] text-sky-300 select-all">
                    winget install Gyan.FFmpeg
                  </div>
                </div>

                {/* Card 3: Requirements */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-200">3. Python Packages</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">pip</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Install project dependencies into your virtual environment:
                  </p>
                  <div className="p-2 bg-black rounded font-mono text-[11px] text-sky-300 select-all">
                    pip install -r requirements.txt
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Important Windows Compilation Notes:</span>
                </div>
                <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                  <li>
                    <strong>CustomTkinter Assets:</strong> CustomTkinter requires its JSON theme files bundled. PyInstaller's <code className="text-slate-300">--collect-all customtkinter</code> or <code className="text-slate-300">clipforge.spec</code> automatically resolves this.
                  </li>
                  <li>
                    <strong>Whisper Model Cache:</strong> On first run, <code className="text-slate-300">faster-whisper</code> downloads the small 'base' model (~140MB) once to the user's local HuggingFace cache folder and reuses it offline indefinitely.
                  </li>
                  <li>
                    <strong>No UI Freezing:</strong> The application spawns worker logic using Python's standard <code className="text-slate-300">threading.Thread(..., daemon=True)</code> and passes UI updates via <code className="text-slate-300">self.after(0, ...)</code> to avoid blocking the Tkinter event loop.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ARCHITECTURE VISUALIZER */}
        {/* ========================================================================= */}
        {activeTab === 'architecture' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-400" />
                <span>100% Local Pipeline Architecture</span>
              </h2>
              <p className="text-xs text-slate-400">
                How video data, speech transcripts, audio volume spikes, and AI selections flow locally without external network calls.
              </p>

              {/* Flowchart Diagram */}
              <div className="space-y-3 pt-2">
                {/* Stage 1 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Video Ingestion (yt-dlp or Local File)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Extracts highest quality mp4 video and audio streams. If local path is provided, streams are validated directly without copying.
                    </p>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Audio Volume Spike Detection (pydub)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Samples the audio channel in 1000ms windows to calculate dBFS loudness. Locates excitement/screaming/action moments to provide hints to the highlight selector.
                    </p>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Local Whisper Transcription (faster-whisper)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Executes quantized CTranslate2 int8 model on CPU/APU. Employs Voice Activity Detection (VAD) and generates word-level timestamps with start/end millisecond precision.
                    </p>
                  </div>
                </div>

                {/* Stage 4 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Ollama Local LLM (llama3.2:1b) &amp; Regex</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Evaluates the time-coded transcript using strict instructions to find the most viral 45-60s window. System prompt enforces strictly returning <code className="text-slate-300 font-mono">[START: MM:SS, END: MM:SS]</code>, which is parsed with Python Regex.
                    </p>
                  </div>
                </div>

                {/* Stage 5 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    5
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">FFmpeg 9:16 Vertical Cropping &amp; Synced .SRT</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Applies <code className="text-slate-300 font-mono">-vf "crop=ih*9/16:ih"</code> keeping the center in frame. Writes the final .mp4 and shifts subtitle timecodes so the .srt starts at 00:00:00,000 for CapCut Pro or Premiere Pro.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: REGEX & CROP MATH BENCH */}
        {/* ========================================================================= */}
        {activeTab === 'tester' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <span>Interactive Regex &amp; FFmpeg Crop Math Playground</span>
              </h2>
              <p className="text-xs text-slate-400">
                Test how the AI system extracts timestamps and verifies the exact 9:16 vertical crop coordinates.
              </p>

              {/* Regex Tester */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-200 block">
                  Test Ollama llama3.2:1b Response String:
                </label>
                <input
                  type="text"
                  value={testLlmPromptOutput}
                  onChange={(e) => setTestLlmPromptOutput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />

                {(() => {
                  const parsed = extractTimestampsFromLlm(testLlmPromptOutput);
                  return (
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                      {parsed ? (
                        <div className="space-y-1">
                          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4" />
                            <span>Valid Regex Match Detected!</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-slate-300">
                            <div>Start String: <span className="text-sky-400">{parsed.startStr}</span></div>
                            <div>End String: <span className="text-sky-400">{parsed.endStr}</span></div>
                            <div>Start Seconds: <span className="text-sky-400">{parsed.startSec}s</span></div>
                            <div>End Seconds: <span className="text-sky-400">{parsed.endSec}s</span></div>
                          </div>
                          <div className="text-slate-400 text-[11px] pt-1">
                            Calculated Duration: <strong className="text-white">{parsed.duration}s</strong> (Target: 45-60s)
                          </div>
                        </div>
                      ) : (
                        <div className="text-rose-400 font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          <span>No timestamp match found in this string. Fallback logic will activate.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Crop Calculation Tester */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-200 block">
                  FFmpeg 9:16 Vertical Crop Geometry Calculator:
                </label>
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Source Width (px)</span>
                    <input
                      type="number"
                      value={testSourceWidth}
                      onChange={(e) => setTestSourceWidth(parseInt(e.target.value, 10) || 1920)}
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Source Height (px)</span>
                    <input
                      type="number"
                      value={testSourceHeight}
                      onChange={(e) => setTestSourceHeight(parseInt(e.target.value, 10) || 1080)}
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {(() => {
                  const crop = calculate9x16Crop(testSourceWidth, testSourceHeight);
                  return (
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                      <div>Crop Width: <span className="text-sky-400">{crop.cropWidth}px</span></div>
                      <div>Crop Height: <span className="text-sky-400">{crop.cropHeight}px</span></div>
                      <div>Center Offset X: <span className="text-sky-400">{crop.offsetX}px</span></div>
                      <div className="pt-1 text-[11px] text-emerald-400">
                        Exact FFmpeg Filter: <code className="bg-black px-1.5 py-0.5 rounded text-white">-vf "{crop.filterString}"</code>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <p>
          ClipForge AI • 100% Free &amp; Offline Local Video Clipper Desktop Codebase • CustomTkinter • faster-whisper • Ollama llama3.2:1b • FFmpeg
        </p>
      </footer>
    </div>
  );
}
