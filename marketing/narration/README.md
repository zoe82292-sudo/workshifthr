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
npm run sync:demo
npm run build
PLAYWRIGHT_BROWSERS_PATH=../.playwright-browsers PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run record:demo-video
```

Output: `marketing/demo-walkthrough.mp4` (1920×1080, scene screenshots + neural voice)

## Default voice (Microsoft Edge neural TTS)

By default the recorder uses **Jenny** (`en-US-JennyNeural`) — much more natural than macOS `say`.

```bash
RECORD_EDGE_VOICE=en-US-AriaNeural npm run record:demo-video   # alternate voice
RECORD_USE_EDGE_TTS=0 RECORD_VOICE=Daniel npm run record:demo-video  # macOS fallback
```

For the most natural result, use ElevenLabs or record yourself in QuickTime, then export clips to this folder.
