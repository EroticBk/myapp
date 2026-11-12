export interface CodeFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const CODEBASE_FILES: CodeFile[] = [
  {
    name: "main.py",
    path: "/main.py",
    language: "python",
    description: "CustomTkinter Dark GUI + Background Threading (no UI freezing)",
    content: `"""
main.py - ClipForge Local AI Video Clipper (Desktop Application)
================================================================
A 100% offline, local desktop application built with CustomTkinter.
Runs completely on device:
- Downloads YouTube videos with \`yt-dlp\` or loads local media
- Transcribes audio locally using \`faster-whisper\` on CPU/APU
- Detects high energy audio peaks with \`pydub\`
- Queries local \`llama3.2:1b\` via \`ollama\` for viral 45-60s hooks
- Crops to 9:16 vertical ratio and renders with \`ffmpeg-python\`
- Exports .mp4 clip and synced .srt subtitle file into the 'Outputs' folder
- Employs non-blocking threading so the UI remains fluid and responsive
"""

import os
import sys
import threading
import subprocess
import platform
import tkinter as tk
from tkinter import filedialog, messagebox
import customtkinter as ctk

# Import modular processing engines
from transcriber import transcribe_audio
from ai_logic import find_engaging_highlight
from video_editor import download_youtube_video, process_and_crop_clip, is_url
from audio_filter import detect_audio_peaks


class ClipForgeApp(ctk.CTk):
    """
    Main Desktop Application Window
    Configured with modern dark theme and responsive layout.
    """

    def __init__(self):
        super().__init__()

        # Window Appearance & Geometry
        ctk.set_appearance_mode("Dark")
        ctk.set_default_color_theme("blue")

        self.title("ClipForge AI - Local Video Clipper (100% Offline)")
        self.geometry("820x680")
        self.minsize(740, 600)

        # State Variables
        self.is_processing = False
        self.last_output_dir = os.path.abspath("Outputs")

        self._build_ui()

    def _build_ui(self):
        """Constructs all GUI widgets inside the window."""
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(3, weight=1)

        # Header Frame
        header_frame = ctk.CTkFrame(self, corner_radius=10, fg_color=("#1e293b", "#0f172a"))
        header_frame.grid(row=0, column=0, padx=20, pady=(15, 10), sticky="ew")

        title_label = ctk.CTkLabel(
            header_frame,
            text="🎬 ClipForge AI Studio",
            font=ctk.CTkFont(family="Segoe UI", size=22, weight="bold"),
            text_color="#38bdf8"
        )
        title_label.pack(anchor="w", padx=20, pady=(12, 2))

        subtitle_label = ctk.CTkLabel(
            header_frame,
            text="Local Whisper Transcription + Ollama (llama3.2:1b) + 9:16 FFmpeg Auto-Clipper",
            font=ctk.CTkFont(family="Segoe UI", size=13),
            text_color="#94a3b8"
        )
        subtitle_label.pack(anchor="w", padx=20, pady=(0, 12))

        # Input & File Selection Section
        input_frame = ctk.CTkFrame(self, corner_radius=10)
        input_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        input_frame.grid_columnconfigure(1, weight=1)

        input_title = ctk.CTkLabel(
            input_frame,
            text="Source Video (YouTube URL or Local File):",
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold")
        )
        input_title.grid(row=0, column=0, columnspan=3, padx=15, pady=(12, 6), sticky="w")

        # Entry Field
        self.url_or_path_entry = ctk.CTkEntry(
            input_frame,
            placeholder_text="Paste YouTube URL (https://...) or choose a local .mp4 / .mkv / .mp3",
            font=ctk.CTkFont(size=13),
            height=38
        )
        self.url_or_path_entry.grid(row=1, column=0, columnspan=2, padx=(15, 8), pady=(0, 15), sticky="ew")

        # Browse Button
        self.browse_btn = ctk.CTkButton(
            input_frame,
            text="📁 Browse...",
            width=100,
            height=38,
            command=self._on_browse_file
        )
        self.browse_btn.grid(row=1, column=2, padx=(0, 15), pady=(0, 15))

        # Control & Progress Section
        action_frame = ctk.CTkFrame(self, corner_radius=10)
        action_frame.grid(row=2, column=0, padx=20, pady=10, sticky="ew")
        action_frame.grid_columnconfigure(0, weight=1)

        # Primary Action Button
        self.generate_btn = ctk.CTkButton(
            action_frame,
            text="⚡ Generate Viral 9:16 Clips",
            font=ctk.CTkFont(family="Segoe UI", size=15, weight="bold"),
            height=44,
            fg_color="#0284c7",
            hover_color="#0369a1",
            command=self._start_generation_pipeline
        )
        self.generate_btn.grid(row=0, column=0, padx=20, pady=(15, 10), sticky="ew")

        # Dynamic Status Label
        self.status_label = ctk.CTkLabel(
            action_frame,
            text="Status: Ready. Enter a video and click 'Generate Clips'.",
            font=ctk.CTkFont(family="Segoe UI", size=13),
            text_color="#cbd5e1"
        )
        self.status_label.grid(row=1, column=0, padx=20, pady=(0, 6), sticky="w")

        # Dynamic Progress Bar
        self.progress_bar = ctk.CTkProgressBar(action_frame, height=14)
        self.progress_bar.grid(row=2, column=0, padx=20, pady=(0, 15), sticky="ew")
        self.progress_bar.set(0.0)

        # Live Console Log Section
        log_frame = ctk.CTkFrame(self, corner_radius=10)
        log_frame.grid(row=3, column=0, padx=20, pady=(10, 15), sticky="nsew")
        log_frame.grid_columnconfigure(0, weight=1)
        log_frame.grid_rowconfigure(1, weight=1)

        log_header_box = ctk.CTkFrame(log_frame, fg_color="transparent")
        log_header_box.grid(row=0, column=0, padx=15, pady=(10, 4), sticky="ew")

        log_title = ctk.CTkLabel(
            log_header_box,
            text="Execution Log & Pipeline Details:",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#94a3b8"
        )
        log_title.pack(side="left")

        self.open_output_btn = ctk.CTkButton(
            log_header_box,
            text="📂 Open Outputs Folder",
            height=28,
            width=160,
            command=self._open_output_folder
        )
        self.open_output_btn.pack(side="right")

        # Terminal Textbox
        self.log_textbox = ctk.CTkTextbox(
            log_frame,
            font=ctk.CTkFont(family="Consolas", size=12),
            wrap="word",
            fg_color="#090d16",
            text_color="#e2e8f0"
        )
        self.log_textbox.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        self._log("System initialized. Local Whisper, Ollama (llama3.2:1b), and FFmpeg ready.")

    def _log(self, message: str):
        """Thread-safe UI log appending."""
        self.after(0, lambda: self._insert_log_safe(message))

    def _insert_log_safe(self, message: str):
        self.log_textbox.insert("end", f"{message}\\n")
        self.log_textbox.see("end")

    def _update_status(self, text: str, progress: float):
        """Thread-safe status and progress bar update."""
        def apply():
            self.status_label.configure(text=f"Status: {text}")
            self.progress_bar.set(progress)
        self.after(0, apply)

    def _on_browse_file(self):
        """Opens native file picker for video or audio files."""
        selected_file = filedialog.askopenfilename(
            title="Select Video or Audio File",
            filetypes=[
                ("Video & Audio Files", "*.mp4 *.mkv *.avi *.mov *.webm *.mp3 *.wav *.m4a"),
                ("All Files", "*.*")
            ]
        )
        if selected_file:
            self.url_or_path_entry.delete(0, "end")
            self.url_or_path_entry.insert(0, selected_file)
            self._log(f"Selected local media: {selected_file}")

    def _open_output_folder(self):
        """Opens the output folder in native Windows Explorer / Mac Finder / Linux."""
        os.makedirs(self.last_output_dir, exist_ok=True)
        try:
            if platform.system() == "Windows":
                os.startfile(self.last_output_dir)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", self.last_output_dir])
            else:
                subprocess.Popen(["xdg-open", self.last_output_dir])
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open folder: {e}")

    def _start_generation_pipeline(self):
        """Validates inputs and starts the processing worker in a background thread."""
        if self.is_processing:
            return

        target_input = self.url_or_path_entry.get().strip()
        if not target_input:
            messagebox.showwarning("Input Required", "Please paste a YouTube URL or browse for a local video file.")
            return

        # Toggle UI state to busy
        self.is_processing = True
        self.generate_btn.configure(state="disabled", text="⏳ Processing in Background...")
        self.browse_btn.configure(state="disabled")

        # Launch background thread so UI never freezes or goes 'Not Responding'
        worker_thread = threading.Thread(
            target=self._run_pipeline_worker,
            args=(target_input,),
            daemon=True
        )
        worker_thread.start()

    def _run_pipeline_worker(self, input_target: str):
        """
        Background Worker Thread
        Orchestrates: Downloader -> Audio Filter -> Transcriber -> Ollama AI -> Video Cropper
        """
        try:
            self._log("=" * 60)
            self._log(f"Starting ClipForge Pipeline for: {input_target}")

            # STEP 1: Download video or verify local file
            if is_url(input_target):
                self._update_status("Downloading YouTube Video (yt-dlp)...", 0.05)
                self._log("[Step 1/5] Fetching video streams with yt-dlp...")
                local_video_path = download_youtube_video(
                    input_target,
                    output_dir="Downloads",
                    progress_callback=lambda msg, p: self._update_status(msg, p)
                )
                self._log(f"Downloaded video ready: {local_video_path}")
            else:
                if not os.path.exists(input_target):
                    raise FileNotFoundError(f"Selected file does not exist: {input_target}")
                local_video_path = os.path.abspath(input_target)
                self._log(f"[Step 1/5] Using local file: {local_video_path}")
                self._update_status("Local file loaded.", 0.2)

            # STEP 2: Audio Peak Volume Spike Detection
            self._update_status("Analyzing Audio Volume Peaks (pydub)...", 0.25)
            self._log("[Step 2/5] Scanning for volume spikes and reaction moments...")
            audio_peak_sec = detect_audio_peaks(local_video_path)
            if audio_peak_sec is not None:
                self._log(f"High audio energy detected at: {audio_peak_sec}s")
            else:
                self._log("Audio energy scan complete (no major spike variance).")

            # STEP 3: Local Whisper Transcription
            self._update_status("Transcribing Audio with faster-whisper...", 0.35)
            self._log("[Step 3/5] Loading faster-whisper (base model) locally on CPU/APU...")

            transcript_result = transcribe_audio(
                local_video_path,
                model_size="base",
                device="cpu",
                compute_type="int8"
            )
            total_duration = transcript_result.get("duration", 0.0)
            words_count = len(transcript_result.get("word_timestamps", []))
            self._log(f"Transcription finished! Total duration: {total_duration:.1f}s, Words: {words_count}")

            # STEP 4: Local AI Highlight Analysis with Ollama (llama3.2:1b)
            self._update_status("AI Analyzing Highlight (Ollama llama3.2:1b)...", 0.65)
            self._log("[Step 4/5] Sending transcript to local Ollama server...")

            highlight_data = find_engaging_highlight(
                transcript_result,
                model_name="llama3.2:1b",
                audio_peak_hint=audio_peak_sec
            )

            start_sec = highlight_data["start_seconds"]
            end_sec = highlight_data["end_seconds"]
            duration = highlight_data["duration"]
            self._log(f"Selected Clip Window: {highlight_data['start_time']} -> {highlight_data['end_time']} ({duration}s)")

            # STEP 5: FFmpeg Video Cropping (9:16 Vertical) & .SRT Export
            self._update_status("Rendering 9:16 Vertical Video (FFmpeg)...", 0.8)
            self._log("[Step 5/5] Cutting clip and applying crop filter: 'crop=ih*9/16:ih'...")

            outputs = process_and_crop_clip(
                input_video_path=local_video_path,
                start_sec=start_sec,
                end_sec=end_sec,
                transcript_data=transcript_result,
                output_dir="Outputs",
                clip_name_prefix="ViralClip",
                progress_callback=lambda msg, p: self._update_status(msg, p)
            )

            self.last_output_dir = os.path.dirname(outputs["video_path"])

            # Finished!
            self._update_status("Finished! 9:16 Clip and .SRT generated.", 1.0)
            self._log("=" * 60)
            self._log("PROCESS COMPLETED SUCCESSFULLY!")
            self._log(f"  Output Video: {outputs['video_path']}")
            self._log(f"  Subtitle (.srt): {outputs['srt_path']}")
            self._log("Ready to import directly into CapCut Pro or Premiere Pro!")

            self.after(0, lambda: messagebox.showinfo(
                "Success",
                f"Clip and Subtitles generated successfully!\\n\\n"
                f"Duration: {duration}s\\n"
                f"Video: {os.path.basename(outputs['video_path'])}\\n"
                f"Subtitles: {os.path.basename(outputs['srt_path'])}\\n\\n"
                f"Files saved in: {self.last_output_dir}"
            ))

        except Exception as e:
            error_msg = str(e)
            self._log(f"\\n[ERROR] Pipeline failed: {error_msg}")
            self._update_status("Error occurred during processing.", 0.0)
            self.after(0, lambda: messagebox.showerror("Processing Error", f"An error occurred:\\n\\n{error_msg}"))

        finally:
            def reset_ui():
                self.is_processing = False
                self.generate_btn.configure(state="normal", text="⚡ Generate Viral 9:16 Clips")
                self.browse_btn.configure(state="normal")
            self.after(0, reset_ui)


def main():
    """Main entrypoint for desktop application."""
    app = ClipForgeApp()
    app.mainloop()


if __name__ == "__main__":
    main()
`
  },
  {
    name: "transcriber.py",
    path: "/transcriber.py",
    language: "python",
    description: "faster-whisper local speech-to-text & word-level timestamp aligner",
    content: `"""
transcriber.py - Local Whisper Transcription Engine
===================================================
Uses \`faster-whisper\` (CTranslate2 backend) to transcribe audio locally on CPU/APU/GPU.
Extracts full text transcripts and precise word-level and segment-level timestamps.
Also provides utility functions to generate synchronized .srt subtitle files.
"""

import os
import sys
from typing import Dict, List, Any, Tuple
from faster_whisper import WhisperModel


def transcribe_audio(
    file_path: str,
    model_size: str = "base",
    device: str = "cpu",
    compute_type: str = "int8"
) -> Dict[str, Any]:
    """
    Transcribes a local video or audio file using faster-whisper.

    Args:
        file_path (str): Path to local .mp4, .mkv, .mp3, or .wav file.
        model_size (str): Whisper model size ('tiny', 'base', 'small', 'medium'). Default 'base'.
        device (str): Device to run on ('cpu', 'cuda', 'auto'). Default 'cpu'.
        compute_type (str): Quantization type ('int8', 'float16', 'float32'). Default 'int8' for fast CPU.

    Returns:
        dict: {
            "text": str,                      # Combined plain text transcript
            "segments": List[dict],           # Segment details with start, end, text
            "word_timestamps": List[dict],    # All individual words with start, end, word
            "language": str,                  # Detected language code
            "duration": float                 # Total audio duration in seconds
        }
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")

    print(f"[Transcriber] Initializing faster-whisper ({model_size}) on {device} ({compute_type})...")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    print(f"[Transcriber] Transcribing '{os.path.basename(file_path)}' with word-level timestamps...")
    segments_generator, info = model.transcribe(
        file_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    full_text_list: List[str] = []
    segments_list: List[Dict[str, Any]] = []
    word_timestamps_list: List[Dict[str, Any]] = []

    for seg in segments_generator:
        seg_text = seg.text.strip()
        full_text_list.append(seg_text)

        seg_data = {
            "id": seg.id,
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg_text,
            "words": []
        }

        if seg.words:
            for w in seg.words:
                word_info = {
                    "word": w.word.strip(),
                    "start": round(w.start, 2),
                    "end": round(w.end, 2),
                    "probability": round(w.probability, 2)
                }
                seg_data["words"].append(word_info)
                word_timestamps_list.append(word_info)

        segments_list.append(seg_data)

    full_transcript = " ".join(full_text_list)
    print(f"[Transcriber] Completed! Detected language: {info.language} ({info.language_probability:.2f}), "
          f"Duration: {info.duration:.1f}s, Words: {len(word_timestamps_list)}")

    return {
        "text": full_transcript,
        "segments": segments_list,
        "word_timestamps": word_timestamps_list,
        "language": info.language,
        "duration": info.duration
    }


def format_timestamp_srt(seconds: float) -> str:
    """Converts seconds into SRT timecode format: HH:MM:SS,mmm"""
    if seconds < 0:
        seconds = 0.0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt_for_clip(
    segments_or_words: List[Dict[str, Any]],
    clip_start_sec: float,
    clip_end_sec: float,
    words_per_subtitle: int = 4
) -> str:
    """
    Generates a synchronized .srt string for the extracted clip.
    Adjusts timecodes so they start from 00:00:00,000 (relative to clip_start_sec).
    Groups words into short, fast-reading TikTok/Reels/Shorts captions (3-5 words each).
    """
    words_in_window: List[Dict[str, Any]] = []

    for item in segments_or_words:
        if "word" in item and "start" in item and "end" in item:
            if item["end"] >= clip_start_sec and item["start"] <= clip_end_sec:
                words_in_window.append(item)
        elif "words" in item and isinstance(item["words"], list):
            for w in item["words"]:
                if w["end"] >= clip_start_sec and w["start"] <= clip_end_sec:
                    words_in_window.append(w)

    if not words_in_window:
        return (
            "1\\n"
            f"00:00:00,000 --> {format_timestamp_srt(clip_end_sec - clip_start_sec)}\\n"
            "Key Highlight Moment\\n\\n"
        )

    srt_blocks: List[str] = []
    block_index = 1

    for i in range(0, len(words_in_window), words_per_subtitle):
        chunk = words_in_window[i : i + words_per_subtitle]
        if not chunk:
            continue

        raw_start = chunk[0]["start"]
        raw_end = chunk[-1]["end"]

        rel_start = max(0.0, raw_start - clip_start_sec)
        rel_end = max(rel_start + 0.3, raw_end - clip_start_sec)
        max_duration = clip_end_sec - clip_start_sec
        if rel_end > max_duration:
            rel_end = max_duration

        chunk_text = " ".join(w["word"].strip() for w in chunk)

        srt_block = (
            f"{block_index}\\n"
            f"{format_timestamp_srt(rel_start)} --> {format_timestamp_srt(rel_end)}\\n"
            f"{chunk_text}\\n"
        )
        srt_blocks.append(srt_block)
        block_index += 1

    return "\\n".join(srt_blocks)
`
  },
  {
    name: "ai_logic.py",
    path: "/ai_logic.py",
    language: "python",
    description: "Ollama llama3.2:1b Local AI bridge + strict regex timestamp parser",
    content: `"""
ai_logic.py - Local AI Bridge (Ollama & Llama 3.2 1B)
=====================================================
Communicates with the local Ollama daemon using \`ollama-python\`.
Directs \`llama3.2:1b\` to pinpoint high-hook, engaging 45-60 second segments.
Extracts timestamps strictly via regular expressions and converts them to seconds.
"""

import re
from typing import Dict, Any, Tuple, Optional, List
import ollama

TIMESTAMP_REGEX = re.compile(
    r"\\[\\s*START:\\s*(\\d{1,2}:\\d{2})\\s*,\\s*END:\\s*(\\d{1,2}:\\d{2})\\s*\\]",
    re.IGNORECASE
)

BACKUP_REGEX = re.compile(
    r"(?:start|from)?\\s*[:=\\-]?\\s*(\\d{1,2}:\\d{2})\\s*(?:to|and|-|,|\\s)+\\s*(?:end|until)?\\s*[:=\\-]?\\s*(\\d{1,2}:\\d{2})",
    re.IGNORECASE
)


def mm_ss_to_seconds(time_str: str) -> float:
    parts = time_str.strip().split(":")
    if len(parts) == 2:
        minutes, seconds = parts
        return int(minutes) * 60 + float(seconds)
    elif len(parts) == 3:
        hours, minutes, seconds = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    raise ValueError(f"Invalid timestamp format: {time_str}")


def seconds_to_mm_ss(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def parse_llm_timestamps(response_text: str) -> Optional[Tuple[str, str, float, float]]:
    match = TIMESTAMP_REGEX.search(response_text)
    if match:
        start_str = match.group(1)
        end_str = match.group(2)
        try:
            start_sec = mm_ss_to_seconds(start_str)
            end_sec = mm_ss_to_seconds(end_str)
            return (start_str, end_str, start_sec, end_sec)
        except Exception:
            pass

    backup_match = BACKUP_REGEX.search(response_text)
    if backup_match:
        start_str = backup_match.group(1)
        end_str = backup_match.group(2)
        try:
            start_sec = mm_ss_to_seconds(start_str)
            end_sec = mm_ss_to_seconds(end_str)
            return (start_str, end_str, start_sec, end_sec)
        except Exception:
            pass

    return None


def prepare_transcript_with_timecodes(segments: List[Dict[str, Any]], max_chars: int = 12000) -> str:
    lines = []
    total_len = 0
    for seg in segments:
        start_str = seconds_to_mm_ss(seg["start"])
        end_str = seconds_to_mm_ss(seg["end"])
        line = f"[{start_str} - {end_str}] {seg['text']}"
        total_len += len(line) + 1
        lines.append(line)
        if total_len > max_chars:
            lines.append("... [transcript truncated for context window] ...")
            break
    return "\\n".join(lines)


def find_engaging_highlight(
    transcript_data: Dict[str, Any],
    model_name: str = "llama3.2:1b",
    audio_peak_hint: Optional[float] = None
) -> Dict[str, Any]:
    total_duration = transcript_data.get("duration", 0.0)
    segments = transcript_data.get("segments", [])

    if not segments:
        safe_end = min(total_duration, 55.0) if total_duration > 0 else 55.0
        return {
            "start_time": "00:00",
            "end_time": seconds_to_mm_ss(safe_end),
            "start_seconds": 0.0,
            "end_seconds": safe_end,
            "duration": safe_end,
            "raw_response": "Fallback: Empty segments provided"
        }

    formatted_transcript = prepare_transcript_with_timecodes(segments)

    peak_instruction = ""
    if audio_peak_hint is not None:
        peak_str = seconds_to_mm_ss(audio_peak_hint)
        peak_instruction = (
            f"\\nNOTE: An intense audio volume spike was detected around {peak_str}. "
            f"Prioritize moments near or including this timestamp if relevant."
        )

    system_prompt = (
        "You are an expert video editor specialized in creating viral short-form clips "
        "for TikTok, YouTube Shorts, and Instagram Reels.\\n"
        "Your task is to analyze the provided time-coded transcript and identify the SINGLE "
        "most engaging 45-60 second moment (high energy, action, revelation, controversial point, or strong hook).\\n\\n"
        "STRICT OUTPUT RULE:\\n"
        "You must return ONLY the timestamps in this exact format:\\n"
        "[START: MM:SS, END: MM:SS]\\n"
        "DO NOT write any explanation, greeting, commentary, markdown headers, or conversational text. "
        "Output ONLY the bracketed timestamp."
    )

    user_prompt = (
        f"Total video duration: {seconds_to_mm_ss(total_duration)} ({total_duration:.1f}s).\\n"
        f"{peak_instruction}\\n\\n"
        f"Here is the time-coded transcript:\\n"
        f"{formatted_transcript}\\n\\n"
        f"Identify the best 45-60 second viral moment and output ONLY:\\n"
        f"[START: MM:SS, END: MM:SS]"
    )

    print(f"[AI Logic] Querying local Ollama model '{model_name}'...")
    try:
        response = ollama.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            options={"temperature": 0.2, "num_predict": 100}
        )
        raw_output = response["message"]["content"].strip()
        print(f"[AI Logic] Ollama response: {raw_output}")
    except Exception as e:
        print(f"[AI Logic] Warning: Ollama connection failed ({e}). Using intelligent fallback.")
        raw_output = ""

    parsed = parse_llm_timestamps(raw_output)

    if parsed:
        start_str, end_str, start_sec, end_sec = parsed
        duration = end_sec - start_sec
        if duration < 30.0 or duration > 75.0 or start_sec >= total_duration:
            start_sec = max(0.0, min(start_sec, max(0.0, total_duration - 55.0)))
            end_sec = min(start_sec + 55.0, total_duration if total_duration > 0 else start_sec + 55.0)
            start_str = seconds_to_mm_ss(start_sec)
            end_str = seconds_to_mm_ss(end_sec)
    else:
        if audio_peak_hint and audio_peak_hint < total_duration:
            start_sec = max(0.0, audio_peak_hint - 15.0)
            end_sec = min(start_sec + 55.0, total_duration)
        else:
            start_sec = max(0.0, min(10.0, total_duration * 0.1))
            end_sec = min(start_sec + 55.0, total_duration if total_duration > 55 else 55.0)

        start_str = seconds_to_mm_ss(start_sec)
        end_str = seconds_to_mm_ss(end_sec)

    clip_duration = round(end_sec - start_sec, 2)
    return {
        "start_time": start_str,
        "end_time": end_str,
        "start_seconds": round(start_sec, 2),
        "end_seconds": round(end_sec, 2),
        "duration": clip_duration,
        "raw_response": raw_output
    }
`
  },
  {
    name: "video_editor.py",
    path: "/video_editor.py",
    language: "python",
    description: "yt-dlp video downloader + FFmpeg crop=ih*9/16:ih & synced SRT generator",
    content: `"""
video_editor.py - The Video Cutter & Vertical Cropper
=====================================================
1. Downloads video from YouTube using \`yt-dlp\` (if a URL is provided) or uses local file.
2. Cuts the video precisely based on AI-determined start and end timestamps.
3. Applies the FFmpeg crop filter: \`crop=ih*9/16:ih\` to convert 16:9 landscape to 9:16 vertical.
4. Generates and outputs both the final .mp4 clip and synchronized .srt subtitle file into 'Outputs'.
"""

import os
import re
import sys
import shutil
import subprocess
from typing import Dict, Any, Optional, Callable
import ffmpeg
import yt_dlp
from transcriber import generate_srt_for_clip


def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[/\\\\?%*:|"<>.]', "", name)
    clean = clean.replace(" ", "_")
    return clean[:50]


def is_url(path_or_url: str) -> bool:
    return path_or_url.startswith("http://") or path_or_url.startswith("https://")


def download_youtube_video(
    url: str,
    output_dir: str = "Downloads",
    progress_callback: Optional[Callable[[str, float], None]] = None
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    if progress_callback:
        progress_callback("Connecting to YouTube via yt-dlp...", 0.1)

    output_template = os.path.join(output_dir, "%(title).50s-%(id)s.%(ext)s")

    def yt_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 1
            downloaded = d.get('downloaded_bytes', 0)
            percent = downloaded / total
            if progress_callback:
                progress_callback(f"Downloading: {percent*100:.1f}%", 0.1 + (percent * 0.2))
        elif d['status'] == 'finished':
            if progress_callback:
                progress_callback("Download complete. Merging streams...", 0.3)

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': output_template,
        'merge_output_format': 'mp4',
        'noplaylist': True,
        'quiet': False,
        'no_warnings': True,
        'progress_hooks': [yt_hook]
    }

    print(f"[Downloader] Initiating yt-dlp download for: {url}")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info_dict)
        if not filename.endswith(".mp4"):
            base, _ = os.path.splitext(filename)
            filename = f"{base}.mp4"

    return os.path.abspath(filename)


def process_and_crop_clip(
    input_video_path: str,
    start_sec: float,
    end_sec: float,
    transcript_data: Optional[Dict[str, Any]] = None,
    output_dir: str = "Outputs",
    clip_name_prefix: str = "Clip",
    progress_callback: Optional[Callable[[str, float], None]] = None
) -> Dict[str, str]:
    if not os.path.exists(input_video_path):
        raise FileNotFoundError(f"Source video not found: {input_video_path}")

    os.makedirs(output_dir, exist_ok=True)
    duration = max(1.0, end_sec - start_sec)

    base_name = os.path.splitext(os.path.basename(input_video_path))[0]
    safe_base = sanitize_filename(base_name)
    timestamp_tag = f"{int(start_sec)}s_to_{int(end_sec)}s"
    final_video_name = f"{clip_name_prefix}_{safe_base}_{timestamp_tag}_9x16.mp4"
    final_srt_name = f"{clip_name_prefix}_{safe_base}_{timestamp_tag}.srt"

    output_video_path = os.path.abspath(os.path.join(output_dir, final_video_name))
    output_srt_path = os.path.abspath(os.path.join(output_dir, final_srt_name))

    if progress_callback:
        progress_callback("Rendering 9:16 Vertical Clip with FFmpeg...", 0.8)

    crop_filter_expr = "crop=ih*9/16:ih"

    try:
        in_stream = ffmpeg.input(input_video_path, ss=start_sec, t=duration)
        v_stream = in_stream.video.filter("crop", "ih*9/16", "ih")
        a_stream = in_stream.audio

        out = ffmpeg.output(
            v_stream,
            a_stream,
            output_video_path,
            vcodec="libx264",
            acodec="aac",
            preset="fast",
            crf=20,
            audio_bitrate="192k",
            movflags="faststart"
        )
        ffmpeg.run(out, overwrite_output=True, quiet=False)

    except ffmpeg.Error:
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_sec),
            "-i", input_video_path,
            "-t", str(duration),
            "-vf", crop_filter_expr,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output_video_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg failed to render video: {res.stderr}")

    if progress_callback:
        progress_callback("Generating synced .SRT Subtitles...", 0.95)

    if transcript_data and ("word_timestamps" in transcript_data or "segments" in transcript_data):
        items = transcript_data.get("word_timestamps") or transcript_data.get("segments", [])
        srt_content = generate_srt_for_clip(items, start_sec, end_sec, words_per_subtitle=4)
    else:
        srt_content = (
            "1\\n"
            f"00:00:00,000 --> 00:00:{int(duration):02d},000\\n"
            "AI Highlight Clip\\n\\n"
        )

    with open(output_srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    return {
        "video_path": output_video_path,
        "srt_path": output_srt_path
    }
`
  },
  {
    name: "audio_filter.py",
    path: "/audio_filter.py",
    language: "python",
    description: "pydub audio volume spike & high action peak detector",
    content: `"""
audio_filter.py - Audio Peak & Volume Spike Detector
=====================================================
Uses \`pydub\` to analyze the audio track of a video, detecting volume spikes (dBFS)
and sudden energy shifts to locate high-action or loud reaction moments.
"""

import os
from typing import Optional, List, Tuple
from pydub import AudioSegment


def detect_audio_peaks(
    audio_or_video_path: str,
    chunk_ms: int = 1000,
    threshold_percentile: float = 0.90
) -> Optional[float]:
    if not os.path.exists(audio_or_video_path):
        return None

    try:
        print(f"[Audio Filter] Analyzing volume spikes with pydub: '{os.path.basename(audio_or_video_path)}'...")
        audio = AudioSegment.from_file(audio_or_video_path)
        total_len = len(audio)

        if total_len < 1000:
            return None

        dbfs_records: List[Tuple[float, float]] = []

        for i in range(0, total_len, chunk_ms):
            chunk = audio[i : i + chunk_ms]
            val = chunk.dBFS
            if val != float("-inf"):
                time_sec = i / 1000.0
                dbfs_records.append((time_sec, val))

        if not dbfs_records:
            return None

        dbfs_records.sort(key=lambda x: x[1], reverse=True)
        loudest_peak_sec, loudest_val = dbfs_records[0]

        print(f"[Audio Filter] Loudest volume spike detected at {loudest_peak_sec:.1f}s ({loudest_val:.1f} dBFS)")
        return round(loudest_peak_sec, 2)

    except Exception as e:
        print(f"[Audio Filter] Note: Audio peak detection skipped or failed: {e}")
        return None
`
  },
  {
    name: "requirements.txt",
    path: "/requirements.txt",
    language: "plaintext",
    description: "Production dependencies for CustomTkinter, Whisper, Ollama, yt-dlp, FFmpeg",
    content: `# ClipForge AI - Requirements for 100% Local Video Clipper Desktop App
# Python 3.10+ recommended

# GUI Framework (Dark mode, modern, native controls)
customtkinter>=5.2.2

# Local Fast Speech-to-Text with word-level timestamps (runs on CPU/APU)
faster-whisper>=1.1.0

# Local LLM bridge (communicates with local Ollama daemon for llama3.2:1b)
ollama>=0.4.7

# YouTube & online video stream extractor
yt-dlp>=2025.1.26

# Video processing & FFmpeg pipeline
ffmpeg-python>=0.2.0

# Audio peak and volume spike analysis
pydub>=0.25.1

# Desktop Standalone Executable compiler
pyinstaller>=6.11.1
`
  },
  {
    name: "clipforge.spec",
    path: "/clipforge.spec",
    language: "python",
    description: "PyInstaller single-file standalone .exe build specification",
    content: `# -*- mode: python ; coding: utf-8 -*-
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
`
  },
  {
    name: "build_exe.bat",
    path: "/build_exe.bat",
    language: "bat",
    description: "Windows 1-click batch script to install dependencies & compile ClipForgeAI.exe",
    content: `@echo off
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
echo Location: dist\\ClipForgeAI.exe
echo =====================================================================
pause
`
  },
  {
    name: "README.md",
    path: "/README.md",
    language: "markdown",
    description: "Full user manual, CLI commands, and deployment guide",
    content: `# ClipForge AI - 100% Free, Offline, Local Video Clipper Desktop App

A completely local, privacy-respecting desktop application that takes any long-form video (YouTube link or local media file), transcribes speech locally using Whisper on CPU, extracts peak-hook 45-60 second highlights using a local Ollama LLM (\`llama3.2:1b\`), and automatically crops to **9:16 vertical video** with a synchronized **.srt subtitle file** ready for CapCut Pro or Premiere Pro.

---

## 🚀 Key Features

* **100% Offline & Free:** No OpenAI, no Gemini, no cloud subscriptions, no API keys, no monthly fees.
* **Modern Dark GUI (\`customtkinter\`):** Sleek interface with fluid progress bars, real-time logging, and file browsing.
* **Non-Blocking Background Threads:** Processing runs entirely in a dedicated background daemon thread—the UI never freezes or shows "Not Responding".
* **Local Whisper Engine (\`faster-whisper\`):** Fast quantized CPU speech-to-text with word-level timestamps.
* **Local AI Hook Hunter (\`ollama\` + \`llama3.2:1b\`):** Evaluates speech content with strict system prompting and regex MM:SS extraction to find the most viral 45-60 second hook.
* **Audio Peak Detector (\`pydub\`):** Scans for volume spikes and reaction moments to prioritize intense sections.
* **FFmpeg Vertical Cropper (\`ffmpeg-python\`):** Cuts and applies \`-vf "crop=ih*9/16:ih"\` to center 16:9 video into 9:16 format.
* **Synced Subtitle (.srt) Generator:** Outputs ready-to-use subtitles offset to match the new clip timestamp starting from \`00:00:00,000\`.

---

## 🛠️ Prerequisites

1. **Python 3.10+**: [python.org](https://www.python.org/downloads/)
2. **FFmpeg**: Must be installed and added to system PATH.
   - *Windows:* \`winget install Gyan.FFmpeg\` or download from [ffmpeg.org](https://ffmpeg.org).
   - *Mac:* \`brew install ffmpeg\`
   - *Linux:* \`sudo apt install ffmpeg\`
3. **Ollama**: [ollama.com](https://ollama.com)
   - After installing Ollama, pull the required local model:
     \`\`\`bash
     ollama run llama3.2:1b
     \`\`\`

---

## 📦 Quick Start (Running from Python)

1. Clone or extract this repository into a folder.
2. Install Python dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`
3. Run the desktop application:
   \`\`\`bash
   python main.py
   \`\`\`

---

## 🔨 Compiling to Standalone \`.exe\` (PyInstaller)

To compile the application into a single standalone \`.exe\` without a console window, run:

### Option A: Using the provided spec file (Recommended)
\`\`\`bash
pyinstaller clipforge.spec --clean --noconfirm
\`\`\`

### Option B: Single terminal command (Direct PyInstaller CLI)

**On Windows:**
\`\`\`bash
pyinstaller --noconsole --onefile --name "ClipForgeAI" --collect-all customtkinter --hidden-import faster_whisper --hidden-import ctranslate2 --hidden-import ollama --hidden-import yt_dlp --hidden-import ffmpeg --hidden-import pydub main.py
\`\`\`
`
  }
];
