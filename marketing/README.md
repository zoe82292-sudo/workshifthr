# Marketing assets (local / LinkedIn — not on the homepage)

## LinkedIn demo video (MP4)

**File on your Mac:**
```
~/Desktop/WorkShiftHR/marketing/demo-walkthrough.mp4
```

Upload this to LinkedIn. It is **not** hosted on shiftworkshr.com.

### Regenerate (best quality — local app)

```bash
# Terminal 1
./scripts/start-production.sh

# Terminal 2
cd frontend
npm run sync:demo   # refresh demo data from compensation-sample.csv
PLAYWRIGHT_BROWSERS_PATH=../.playwright-browsers \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 \
npm run record:demo-video
```

### Professional voiceover (recommended)

The built-in macOS voice is a fallback only. For a natural sound:

1. Record yourself in QuickTime, **or** generate clips in ElevenLabs
2. Save one file per scene in `marketing/narration/`:
   - `intro.m4a`, `upload.m4a`, `dashboard.m4a`, `issues.m4a`, `pdf.m4a`, `cta.m4a`
3. Run `npm run record:demo-video` again — custom files are used automatically

See `marketing/narration/README.md` for the script text (in `frontend/demo-video.config.json`).

### Preview in browser

- https://shiftworkshr.com/demo-video
- https://shiftworkshr.com/demo-video?autoplay=1

Scenes: intro → upload → **full dashboard** (exec summary, budget, merit pool) → employee table → PDF → CTA.

## Interactive demos on the website

| What | URL |
|------|-----|
| Homepage sample | https://shiftworkshr.com → **Sample** tab |
| Full interactive analyzer | https://shiftworkshr.com/sample-preview |
| Try with your file | https://shiftworkshr.com/try |
