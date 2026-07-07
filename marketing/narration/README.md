# Custom voiceover for demo walkthrough

For studio-quality audio, record or generate one file per scene and drop them here:

| File | Scene |
|------|--------|
| `intro.m4a` | Opening title |
| `upload.m4a` | Upload step |
| `dashboard.m4a` | Analysis dashboard |
| `issues.m4a` | Below-minimum table |
| `pdf.m4a` | PDF export preview |
| `cta.m4a` | Closing call to action |

Supported formats: `.m4a`, `.wav`, `.mp3`, `.aac`

When these files exist, `npm run record:demo-video` uses them instead of built-in TTS.

## Regenerate the video

```bash
# Terminal 1 — start the app
./scripts/start-production.sh

# Terminal 2 — refresh demo data, build, and record
cd frontend
../backend/.venv/bin/python ../scripts/sync_demo_snapshot.py
npm run build
PLAYWRIGHT_BROWSERS_PATH=../.playwright-browsers PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run record:demo-video
```

Output: `marketing/demo-walkthrough.mp4` (1920×1080, retina screenshots + neural voice)

## Voice quality (best to worst)

1. **Custom clips** in this folder (record yourself or export from ElevenLabs)
2. **ElevenLabs API** — most natural automated voice:

```bash
export ELEVENLABS_API_KEY=your_key
# optional: ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
npm run record:demo-video
```

3. **Edge neural TTS** (default) — Andrew voice, sentence-chunked with pauses:

```bash
RECORD_EDGE_VOICE=en-US-AndrewMultilingualNeural npm run record:demo-video
RECORD_EDGE_RATE=-12% RECORD_EDGE_PAUSE_MS=320 npm run record:demo-video
```

4. **macOS say** fallback: `RECORD_USE_EDGE_TTS=0 RECORD_VOICE=Daniel npm run record:demo-video`
