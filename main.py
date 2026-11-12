"""
main.py - ClipForge Local AI Video Clipper (Desktop Application)
================================================================
A 100% offline, local desktop application built with CustomTkinter.
Runs completely on device:
- Downloads YouTube videos with `yt-dlp` or loads local media
- Transcribes audio locally using `faster-whisper` on CPU/APU
- Detects high energy audio peaks with `pydub`
- Queries local `llama3.2:1b` via `ollama` for viral 45-60s hooks
- Crops to 9:16 vertical ratio and renders with `ffmpeg-python`
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
        self.log_textbox.insert("end", f"{message}\n")
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

            # -------------------------------------------------------------
            # STEP 1: Download video or verify local file
            # -------------------------------------------------------------
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

            # -------------------------------------------------------------
            # STEP 2: Optional Audio Peak Energy Spike Detection
            # -------------------------------------------------------------
            self._update_status("Analyzing Audio Volume Peaks (pydub)...", 0.25)
            self._log("[Step 2/5] Scanning for volume spikes and reaction moments...")
            audio_peak_sec = detect_audio_peaks(local_video_path)
            if audio_peak_sec is not None:
                self._log(f"High audio energy detected at: {audio_peak_sec}s")
            else:
                self._log("Audio energy scan complete (no major spike variance).")

            # -------------------------------------------------------------
            # STEP 3: Local Whisper Transcription
            # -------------------------------------------------------------
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

            # -------------------------------------------------------------
            # STEP 4: Local AI Highlight Analysis with Ollama (llama3.2:1b)
            # -------------------------------------------------------------
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

            # -------------------------------------------------------------
            # STEP 5: FFmpeg Video Cropping (9:16 Vertical) & .SRT Export
            # -------------------------------------------------------------
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

            # -------------------------------------------------------------
            # Finished!
            # -------------------------------------------------------------
            self._update_status("Finished! 9:16 Clip and .SRT generated.", 1.0)
            self._log("=" * 60)
            self._log("PROCESS COMPLETED SUCCESSFULLY!")
            self._log(f"  Output Video: {outputs['video_path']}")
            self._log(f"  Subtitle (.srt): {outputs['srt_path']}")
            self._log("Ready to import directly into CapCut Pro or Premiere Pro!")

            self.after(0, lambda: messagebox.showinfo(
                "Success",
                f"Clip and Subtitles generated successfully!\n\n"
                f"Duration: {duration}s\n"
                f"Video: {os.path.basename(outputs['video_path'])}\n"
                f"Subtitles: {os.path.basename(outputs['srt_path'])}\n\n"
                f"Files saved in: {self.last_output_dir}"
            ))

        except Exception as e:
            error_msg = str(e)
            self._log(f"\n[ERROR] Pipeline failed: {error_msg}")
            self._update_status("Error occurred during processing.", 0.0)
            self.after(0, lambda: messagebox.showerror("Processing Error", f"An error occurred:\n\n{error_msg}"))

        finally:
            # Restore UI controls
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
