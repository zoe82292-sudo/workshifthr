#!/usr/bin/env python3
"""Natural voiceover via Microsoft Edge neural TTS with chunked pacing."""
from __future__ import annotations

import argparse
import asyncio
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def resolve_ffmpeg(explicit: str | None) -> str:
    if explicit and Path(explicit).exists():
        return explicit
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    repo_root = Path(__file__).resolve().parents[1]
    candidates = [
        repo_root / "frontend/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg",
        repo_root / "frontend/node_modules/@ffmpeg-installer/darwin-x64/ffmpeg",
        repo_root / "frontend/node_modules/@ffmpeg-installer/ffmpeg/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError("ffmpeg not found for narration chunk assembly")


def ensure_edge_tts():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "edge-tts", "-q"],
            stdout=subprocess.DEVNULL,
        )


def normalize_speech(text: str) -> str:
    """Minimal rewrites — scripts are written for TTS-friendly phrasing."""
    normalized = text
    normalized = re.sub(r"ShiftWorksHR", "ShiftWorks HR", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\bI\.T\.\b", "I T", normalized)
    return normalized


def split_chunks(text: str) -> list[str]:
    """Split into short phrases for more natural cadence."""
    normalized = re.sub(r"\s+", " ", normalize_speech(text).strip())
    if not normalized:
        return []

    parts = re.split(r"(?<=[.!?])\s+", normalized)
    chunks: list[str] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if len(part) > 110:
            subs = re.split(r"(?<=[,;])\s+", part)
            chunks.extend(s.strip() for s in subs if s.strip())
        else:
            chunks.append(part)
    return chunks


async def synthesize_chunk(
    text: str,
    output_path: str,
    voice: str,
    rate: str,
    pitch: str,
) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(output_path)


async def synthesize_natural(
    text: str,
    output_path: str,
    voice: str,
    rate: str,
    pitch: str,
    chunk_pause_ms: int,
    ffmpeg_bin: str,
    *,
    single_pass: bool = True,
) -> None:
    ensure_edge_tts()
    normalized = re.sub(r"\s+", " ", normalize_speech(text).strip())
    if not normalized:
        raise ValueError("Narration text is empty.")

    if single_pass:
        await synthesize_chunk(normalized, output_path, voice, rate, pitch)
        return

    chunks = split_chunks(text)
    if len(chunks) == 1:
        await synthesize_chunk(chunks[0], output_path, voice, rate, pitch)
        return

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        part_paths: list[Path] = []
        for index, chunk in enumerate(chunks):
            part = tmp_dir / f"part-{index:02d}.mp3"
            await synthesize_chunk(chunk, str(part), voice, rate, pitch)
            part_paths.append(part)

        list_file = tmp_dir / "concat.txt"
        silence_ms = max(0, chunk_pause_ms)
        lines: list[str] = []
        for index, part in enumerate(part_paths):
            lines.append(f"file '{part.as_posix()}'")
            if index < len(part_paths) - 1 and silence_ms > 0:
                silence = tmp_dir / f"gap-{index:02d}.mp3"
                subprocess.check_call(
                    [
                        ffmpeg_bin,
                        "-y",
                        "-f",
                        "lavfi",
                        "-i",
                        "anullsrc=r=24000:cl=mono",
                        "-t",
                        f"{silence_ms / 1000:.3f}",
                        "-q:a",
                        "9",
                        str(silence),
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                lines.append(f"file '{silence.as_posix()}'")
        list_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

        subprocess.check_call(
            [
                ffmpeg_bin,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-c",
                "copy",
                output_path,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate natural neural voiceover clip")
    parser.add_argument("text", help="Narration script")
    parser.add_argument("output", help="Output audio path (.mp3)")
    parser.add_argument("--voice", default="en-US-BrianNeural")
    parser.add_argument("--rate", default="+5%")
    parser.add_argument("--pitch", default="-2Hz")
    parser.add_argument("--chunk-pause-ms", type=int, default=80)
    parser.add_argument("--single-pass", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--ffmpeg", default=None)
    args = parser.parse_args()

    ffmpeg_bin = resolve_ffmpeg(args.ffmpeg)

    asyncio.run(
        synthesize_natural(
            args.text,
            args.output,
            args.voice,
            args.rate,
            args.pitch,
            args.chunk_pause_ms,
            ffmpeg_bin,
            single_pass=args.single_pass,
        )
    )


if __name__ == "__main__":
    main()
