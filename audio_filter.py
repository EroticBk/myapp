"""
audio_filter.py - Audio Peak & Volume Spike Detector
=====================================================
Uses `pydub` to analyze the audio track of a video, detecting volume spikes (dBFS)
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
    """
    Analyzes audio volume in chunks and returns the timestamp (in seconds)
    of the highest sustained energy/volume spike.

    Args:
        audio_or_video_path (str): Local media file path.
        chunk_ms (int): Chunk size in milliseconds for sampling (default 1000ms).
        threshold_percentile (float): Top percentile threshold.

    Returns:
        float or None: Timestamp in seconds of the primary volume spike peak.
    """
    if not os.path.exists(audio_or_video_path):
        return None

    try:
        print(f"[Audio Filter] Analyzing volume spikes with pydub: '{os.path.basename(audio_or_video_path)}'...")
        audio = AudioSegment.from_file(audio_or_video_path)
        total_len = len(audio)

        if total_len < 1000:
            return None

        # Sample volume (dBFS) across chunks
        dbfs_records: List[Tuple[float, float]] = []  # (timestamp_sec, dbfs)

        for i in range(0, total_len, chunk_ms):
            chunk = audio[i : i + chunk_ms]
            # pydub returns negative dBFS; -0 dBFS is peak loudness, -60 is silence
            val = chunk.dBFS
            if val != float("-inf"):
                time_sec = i / 1000.0
                dbfs_records.append((time_sec, val))

        if not dbfs_records:
            return None

        # Sort to find loudest moment
        dbfs_records.sort(key=lambda x: x[1], reverse=True)
        loudest_peak_sec, loudest_val = dbfs_records[0]

        print(f"[Audio Filter] Loudest volume spike detected at {loudest_peak_sec:.1f}s ({loudest_val:.1f} dBFS)")
        return round(loudest_peak_sec, 2)

    except Exception as e:
        print(f"[Audio Filter] Note: Audio peak detection skipped or failed: {e}")
        return None
