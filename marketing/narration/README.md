# Custom voiceover for demo walkthrough

Record **your own voice** (or export from ElevenLabs) — one file per scene — and drop them here.

When these files exist, `npm run record:demo-video` uses them **instead of TTS**.

## Files to record (exact names)

| File | Script (from `frontend/demo-video.config.json`) |
|------|--------------------------------------------------|
| `intro.m4a` | Merit week is when everything lands at once. Who's below range, which managers earn less than their reports, what it's going to cost to fix. Upload your roster to ShiftWorks HR and you'll have a review queue and a leadership PDF in under thirty seconds. |
| `upload.m4a` | You already have the file, whether that's Workday, ADP, or a spreadsheet. Drop it in. No new HRIS needed, nothing to configure. Your columns map automatically. |
| `dashboard.m4a` | Right away you see a review queue ranked by severity. Critical items up top, so you know what to tackle before merit letters go out. |
| `budget.m4a` | You also get the dollars. What it costs to bring people up to minimum, your merit pool, total exposure. So when finance asks, you're ready. |
| `issues.m4a` | Every flag comes with a name, a department, and the exact dollar gap. Not just a row count buried in Excel. |
| `managers.m4a` | It catches the awkward stuff too. When a manager earns less than someone on their team, you see both names side by side. |
| `equity.m4a` | When leadership asks about pay fairness, you see median pay by gender and race, and the dollar gap between groups, pulled straight from your roster. |
| `location.m4a` | If your file includes location, you'll see median pay by city and how your team is spread across geographies. No extra spreadsheet required. |
| `pdf.m4a` | Need something for the exec briefing? One click gives you risk level, total exposure, and the talking points they'll actually ask about. |
| `cta.m4a` | Try ShiftWorks HR free with your own roster. No credit card required. |

Supported formats: `.m4a`, `.wav`, `.mp3`, `.aac`  
Filename must match the scene id (e.g. `intro.wav` works too).

## How to record on a Mac (easiest)

### Option A — Voice Memos (simplest)
1. Open **Voice Memos**
2. Record each line above as a separate clip (quiet room, phone ~6–8" away)
3. Share/export each clip → rename to `intro.m4a`, `upload.m4a`, etc.
4. Move all 10 files into this folder: `marketing/narration/`

### Option B — QuickTime
1. QuickTime Player → **File → New Audio Recording**
2. Record one scene → **File → Save** as `intro.m4a` (etc.) into this folder

### Tips
- Speak a little slower than normal; smile slightly (it shows in the audio)
- Leave a tiny pause at the start/end — the recorder pads scenes to match your clip length
- Say **“ShiftWorks HR”** (two words), not “shiftworkshr”
- Re-record any take that has a mouth click or “um”

## Rebuild the video with your voice

```bash
# Terminal 1 — start the app
./scripts/start-production.sh

# Terminal 2
cd frontend
npm run build
PLAYWRIGHT_BROWSERS_PATH=../.playwright-browsers \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 \
npm run record:demo-video
```

In the logs you should see `voice: custom file (intro.m4a)` (etc.) for each scene.

Output: `marketing/demo-walkthrough.mp4`  
Also copy to Desktop if you want:  
`cp marketing/demo-walkthrough.mp4 ~/Desktop/shiftworks-demo.mp4`

## Partial recordings

If only some files exist (e.g. you recorded `intro` + `cta` but not the rest), those scenes use your voice; the others fall back to TTS. Record all 10 for a consistent video.

## Fallback order (if no custom file)

1. Custom clip in this folder  
2. ElevenLabs (`ELEVENLABS_API_KEY`)  
3. Edge neural TTS  
4. macOS `say`
