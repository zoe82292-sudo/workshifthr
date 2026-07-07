# Custom voiceover for demo walkthrough

For a **professional** LinkedIn demo, record or generate one audio file per scene and drop them here:

| File | Scene |
|------|--------|
| `intro.m4a` | Opening title |
| `upload.m4a` | Upload step |
| `dashboard.m4a` | Analysis dashboard |
| `issues.m4a` | Below-minimum table |
| `pdf.m4a` | PDF export preview |
| `cta.m4a` | Closing call to action |

Supported formats: `.m4a`, `.wav`, `.mp3`, `.aac`

When these files exist, `npm run record:demo-video` uses them instead of the built-in macOS voice.

## Regenerate the video

```bash
# Terminal 1 — start the app
./scripts/start-production.sh

# Terminal 2 — refresh demo data + record
cd frontend
npm run sync:demo
PLAYWRIGHT_BROWSERS_PATH=../.playwright-browsers PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run record:demo-video
```

Output: `marketing/demo-walkthrough.mp4`

## macOS voice fallback

If no custom files are present, the script uses macOS `say` with **Ava** (or Allison / Samantha). Tune with:

```bash
RECORD_VOICE=Ava RECORD_SPEECH_RATE=165 npm run record:demo-video
```

For truly natural audio, use ElevenLabs or record yourself in QuickTime, then export clips to this folder.
