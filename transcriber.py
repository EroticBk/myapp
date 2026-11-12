"""
transcriber.py - Local Whisper Transcription Engine
===================================================
Uses `faster-whisper` (CTranslate2 backend) to transcribe audio locally on CPU/APU/GPU.
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
    # Base model is lightweight (~140MB), runs quickly on any modern CPU without requiring a GPU
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    print(f"[Transcriber] Transcribing '{os.path.basename(file_path)}' with word-level timestamps...")
    # word_timestamps=True forces Whisper to generate per-word alignment for precise SRT subtitles
    segments_generator, info = model.transcribe(
        file_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,  # Voice Activity Detection removes silence
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

    Args:
        segments_or_words: List of word timestamp dicts or segments with 'words'
        clip_start_sec: Highlight start time in the original source video
        clip_end_sec: Highlight end time in the original source video
        words_per_subtitle: Group size for vertical video captions (default 4)

    Returns:
        str: Valid .srt subtitle file content
    """
    # Extract all words falling inside the highlight window
    words_in_window: List[Dict[str, Any]] = []

    for item in segments_or_words:
        if "word" in item and "start" in item and "end" in item:
            # It's a word dict
            if item["end"] >= clip_start_sec and item["start"] <= clip_end_sec:
                words_in_window.append(item)
        elif "words" in item and isinstance(item["words"], list):
            for w in item["words"]:
                if w["end"] >= clip_start_sec and w["start"] <= clip_end_sec:
                    words_in_window.append(w)

    if not words_in_window:
        # Fallback to single block if no word level timestamps were captured
        return (
            "1\n"
            f"00:00:00,000 --> {format_timestamp_srt(clip_end_sec - clip_start_sec)}\n"
            "Key Highlight Moment\n\n"
        )

    srt_blocks: List[str] = []
    block_index = 1

    # Chunk words into batches for punchy vertical captions
    for i in range(0, len(words_in_window), words_per_subtitle):
        chunk = words_in_window[i : i + words_per_subtitle]
        if not chunk:
            continue

        raw_start = chunk[0]["start"]
        raw_end = chunk[-1]["end"]

        # Offset relative to the start of the cut clip
        rel_start = max(0.0, raw_start - clip_start_sec)
        rel_end = max(rel_start + 0.3, raw_end - clip_start_sec)
        max_duration = clip_end_sec - clip_start_sec
        if rel_end > max_duration:
            rel_end = max_duration

        chunk_text = " ".join(w["word"].strip() for w in chunk)

        srt_block = (
            f"{block_index}\n"
            f"{format_timestamp_srt(rel_start)} --> {format_timestamp_srt(rel_end)}\n"
            f"{chunk_text}\n"
        )
        srt_blocks.append(srt_block)
        block_index += 1

    return "\n".join(srt_blocks)
