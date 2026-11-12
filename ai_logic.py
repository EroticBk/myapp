"""
ai_logic.py - Local AI Bridge (Ollama & Llama 3.2 1B)
=====================================================
Communicates with the local Ollama daemon using `ollama-python`.
Directs `llama3.2:1b` to pinpoint high-hook, engaging 45-60 second segments.
Extracts timestamps strictly via regular expressions and converts them to seconds.
"""

import re
from typing import Dict, Any, Tuple, Optional, List
import ollama


# Regex pattern to match exact timestamp format: [START: MM:SS, END: MM:SS]
TIMESTAMP_REGEX = re.compile(
    r"\[\s*START:\s*(\d{1,2}:\d{2})\s*,\s*END:\s*(\d{1,2}:\d{2})\s*\]",
    re.IGNORECASE
)

# Lenient fallback regex for other common time formats if LLM slightly deviates
BACKUP_REGEX = re.compile(
    r"(?:start|from)?\s*[:=\-]?\s*(\d{1,2}:\d{2})\s*(?:to|and|-|,|\s)+s*(?:end|until)?\s*[:=\-]?\s*(\d{1,2}:\d{2})",
    re.IGNORECASE
)


def mm_ss_to_seconds(time_str: str) -> float:
    """
    Converts MM:SS or HH:MM:SS string into total seconds as float.

    Examples:
        '01:15' -> 75.0
        '00:45' -> 45.0
        '1:02:30' -> 3750.0
    """
    parts = time_str.strip().split(":")
    if len(parts) == 2:
        minutes, seconds = parts
        return int(minutes) * 60 + float(seconds)
    elif len(parts) == 3:
        hours, minutes, seconds = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    raise ValueError(f"Invalid timestamp format: {time_str}")


def seconds_to_mm_ss(seconds: float) -> str:
    """Converts seconds into MM:SS format string."""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def parse_llm_timestamps(response_text: str) -> Optional[Tuple[str, str, float, float]]:
    """
    Extracts START and END timestamps from LLM output using Regex.

    Returns:
        tuple (start_str, end_str, start_sec, end_sec) or None if no match.
    """
    # 1. Try strict primary format: [START: MM:SS, END: MM:SS]
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

    # 2. Try secondary backup regex
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
    """
    Formats transcription segments into time-coded blocks so the LLM
    can easily spot the exact timecodes corresponding to key topics.
    """
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
    return "\n".join(lines)


def find_engaging_highlight(
    transcript_data: Dict[str, Any],
    model_name: str = "llama3.2:1b",
    audio_peak_hint: Optional[float] = None
) -> Dict[str, Any]:
    """
    Sends the time-coded transcript to the local Ollama llama3.2:1b model.
    Instructs the LLM to identify the most engaging 45-60 second moment.

    Args:
        transcript_data: Dict output from transcriber.py containing segments & duration.
        model_name: Local Ollama model tag (default: 'llama3.2:1b').
        audio_peak_hint: Optional timestamp (in seconds) of detected audio energy spike.

    Returns:
        dict: {
            "start_time": str,       # 'MM:SS'
            "end_time": str,         # 'MM:SS'
            "start_seconds": float,  # seconds
            "end_seconds": float,    # seconds
            "duration": float,       # clip length in seconds
            "raw_response": str      # raw LLM output
        }
    """
    total_duration = transcript_data.get("duration", 0.0)
    segments = transcript_data.get("segments", [])

    if not segments:
        # Fallback if transcript empty
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

    # Audio peak hint incorporation (if audio spikes were detected)
    peak_instruction = ""
    if audio_peak_hint is not None:
        peak_str = seconds_to_mm_ss(audio_peak_hint)
        peak_instruction = (
            f"\nNOTE: An intense audio volume spike was detected around {peak_str}. "
            f"Prioritize moments near or including this timestamp if relevant."
        )

    # STRICT System Prompt as specified in architectural requirements:
    system_prompt = (
        "You are an expert video editor specialized in creating viral short-form clips "
        "for TikTok, YouTube Shorts, and Instagram Reels.\n"
        "Your task is to analyze the provided time-coded transcript and identify the SINGLE "
        "most engaging 45-60 second moment (high energy, action, revelation, controversial point, or strong hook).\n\n"
        "STRICT OUTPUT RULE:\n"
        "You must return ONLY the timestamps in this exact format:\n"
        "[START: MM:SS, END: MM:SS]\n"
        "DO NOT write any explanation, greeting, commentary, markdown headers, or conversational text. "
        "Output ONLY the bracketed timestamp."
    )

    user_prompt = (
        f"Total video duration: {seconds_to_mm_ss(total_duration)} ({total_duration:.1f}s).\n"
        f"{peak_instruction}\n\n"
        f"Here is the time-coded transcript:\n"
        f"{formatted_transcript}\n\n"
        f"Identify the best 45-60 second viral moment and output ONLY:\n"
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
            options={
                "temperature": 0.2,  # Low temperature for strict adherence
                "num_predict": 100    # Short output since format is minimal
            }
        )
        raw_output = response["message"]["content"].strip()
        print(f"[AI Logic] Ollama response: {raw_output}")
    except Exception as e:
        print(f"[AI Logic] Warning: Ollama connection failed ({e}). Using intelligent fallback.")
        raw_output = ""

    parsed = parse_llm_timestamps(raw_output)

    if parsed:
        start_str, end_str, start_sec, end_sec = parsed

        # Enforce clip duration between 30 and 70 seconds
        duration = end_sec - start_sec
        if duration < 30.0 or duration > 75.0 or start_sec >= total_duration:
            print(f"[AI Logic] Warning: LLM duration ({duration:.1f}s) out of target range. Normalizing...")
            start_sec = max(0.0, min(start_sec, max(0.0, total_duration - 55.0)))
            end_sec = min(start_sec + 55.0, total_duration if total_duration > 0 else start_sec + 55.0)
            start_str = seconds_to_mm_ss(start_sec)
            end_str = seconds_to_mm_ss(end_sec)
    else:
        # Fallback to audio peak or first strong segment if LLM didn't match regex
        print("[AI Logic] Regex could not match timestamp format. Using fallback highlight...")
        if audio_peak_hint and audio_peak_hint < total_duration:
            start_sec = max(0.0, audio_peak_hint - 15.0)
            end_sec = min(start_sec + 55.0, total_duration)
        else:
            # Pick a dynamic point around 15% into the video
            start_sec = max(0.0, min(10.0, total_duration * 0.1))
            end_sec = min(start_sec + 55.0, total_duration if total_duration > 55 else 55.0)

        start_str = seconds_to_mm_ss(start_sec)
        end_str = seconds_to_mm_ss(end_sec)

    clip_duration = round(end_sec - start_sec, 2)
    print(f"[AI Logic] Selected highlight window: {start_str} to {end_str} ({clip_duration}s)")

    return {
        "start_time": start_str,
        "end_time": end_str,
        "start_seconds": round(start_sec, 2),
        "end_seconds": round(end_sec, 2),
        "duration": clip_duration,
        "raw_response": raw_output
    }
