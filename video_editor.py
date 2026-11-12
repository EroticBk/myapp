"""
video_editor.py - The Video Cutter & Vertical Cropper
=====================================================
1. Downloads video from YouTube using `yt-dlp` (if a URL is provided) or uses local file.
2. Cuts the video precisely based on AI-determined start and end timestamps.
3. Applies the FFmpeg crop filter: `crop=ih*9/16:ih` to convert 16:9 landscape to 9:16 vertical,
   ensuring the center of the action remains framed for TikTok/Reels/Shorts.
4. Generates and outputs both the final `.mp4` clip and synchronized `.srt` subtitle file into an 'Outputs' folder.
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
    """Removes non-alphanumeric characters for safe file naming."""
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = clean.replace(" ", "_")
    return clean[:50]


def is_url(path_or_url: str) -> bool:
    """Checks whether the input string is a web URL."""
    return path_or_url.startswith("http://") or path_or_url.startswith("https://")


def download_youtube_video(
    url: str,
    output_dir: str = "Downloads",
    progress_callback: Optional[Callable[[str, float], None]] = None
) -> str:
    """
    Downloads the highest quality video with audio using yt-dlp.

    Args:
        url (str): YouTube video link.
        output_dir (str): Folder to save the downloaded source video.
        progress_callback: Optional callback(status_msg, progress_float).

    Returns:
        str: Absolute path to the downloaded .mp4 file.
    """
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
        # Select best mp4 video + best m4a audio, or fallback to best
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
        # Ensure mp4 extension
        if not filename.endswith(".mp4"):
            base, _ = os.path.splitext(filename)
            filename = f"{base}.mp4"

    full_path = os.path.abspath(filename)
    print(f"[Downloader] Saved source video: {full_path}")
    return full_path


def process_and_crop_clip(
    input_video_path: str,
    start_sec: float,
    end_sec: float,
    transcript_data: Optional[Dict[str, Any]] = None,
    output_dir: str = "Outputs",
    clip_name_prefix: str = "Clip",
    progress_callback: Optional[Callable[[str, float], None]] = None
) -> Dict[str, str]:
    """
    Cuts the video between start_sec and end_sec, crops it to 9:16 vertical ratio
    using FFmpeg (`-vf "crop=ih*9/16:ih"`), and writes matching .srt file.

    Args:
        input_video_path (str): Path to input source video (.mp4).
        start_sec (float): Cut start time in seconds.
        end_sec (float): Cut end time in seconds.
        transcript_data: Transcription data containing word timestamps for .srt.
        output_dir (str): Folder where output files will be saved (default 'Outputs').
        clip_name_prefix (str): Prefix for the output filename.
        progress_callback: Callback for GUI progress reporting.

    Returns:
        dict: {
            "video_path": str,  # Path to generated 9:16 .mp4 clip
            "srt_path": str     # Path to synchronized .srt file
        }
    """
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

    print(f"[Video Editor] Cutting and cropping video:")
    print(f"  Source: {input_video_path}")
    print(f"  Range: {start_sec:.2f}s -> {end_sec:.2f}s (Duration: {duration:.2f}s)")
    print(f"  Target Video: {output_video_path}")
    print(f"  Target Subtitles: {output_srt_path}")

    if progress_callback:
        progress_callback("Rendering 9:16 Vertical Clip with FFmpeg...", 0.8)

    # 1. FFmpeg Video Cutting and Center Crop (ih*9/16 : ih)
    # Filter rule: crop=ih*9/16:ih extracts a 9:16 centered slice from landscape 16:9 video
    crop_filter_expr = "crop=ih*9/16:ih"

    try:
        # Use ffmpeg-python stream builder
        in_stream = ffmpeg.input(input_video_path, ss=start_sec, t=duration)
        v_stream = in_stream.video.filter("crop", "ih*9/16", "ih")
        a_stream = in_stream.audio

        # Build output command with fast h264 encoding and aac audio
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

    except ffmpeg.Error as e:
        # Fallback to direct subprocess invocation if ffmpeg-python encounters syntax variation
        print(f"[Video Editor] ffmpeg-python encountered error, trying direct ffmpeg command fallback...")
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

    print(f"[Video Editor] 9:16 Vertical Video rendered successfully at:\n  -> {output_video_path}")

    # 2. Generate Synchronized .SRT Subtitle File
    if progress_callback:
        progress_callback("Generating synced .SRT Subtitles...", 0.95)

    if transcript_data and ("word_timestamps" in transcript_data or "segments" in transcript_data):
        items = transcript_data.get("word_timestamps") or transcript_data.get("segments", [])
        srt_content = generate_srt_for_clip(items, start_sec, end_sec, words_per_subtitle=4)
    else:
        # Generic placeholder subtitle if transcript wasn't supplied
        srt_content = (
            "1\n"
            f"00:00:00,000 --> 00:00:{int(duration):02d},000\n"
            "AI Highlight Clip\n\n"
        )

    with open(output_srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    print(f"[Video Editor] Synchronized .SRT generated at:\n  -> {output_srt_path}")

    return {
        "video_path": output_video_path,
        "srt_path": output_srt_path
    }
