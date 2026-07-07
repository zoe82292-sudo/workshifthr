#!/usr/bin/env python3
"""Synthesize narration with Microsoft Edge neural TTS (natural, free)."""
from __future__ import annotations

import argparse
import asyncio
import subprocess
import sys


async def synthesize(text: str, output_path: str, voice: str) -> None:
    try:
        import edge_tts
    except ImportError:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "edge-tts", "-q"],
            stdout=subprocess.DEVNULL,
        )
        import edge_tts

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate neural voiceover clip")
    parser.add_argument("text", help="Narration script")
    parser.add_argument("output", help="Output audio path (.mp3)")
    parser.add_argument("--voice", default="en-US-JennyNeural", help="Edge TTS voice id")
    args = parser.parse_args()
    asyncio.run(synthesize(args.text, args.output, args.voice))


if __name__ == "__main__":
    main()
