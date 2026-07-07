# Marketing assets (local / LinkedIn — not on the homepage)

## LinkedIn demo video (MP4)

**File on your Mac:**
```
/Users/zoevidal/Desktop/WorkShiftHR/marketing/demo-walkthrough.mp4
```

Upload this to LinkedIn. It is **not** hosted on shiftworkshr.com.

**Regenerate** (uses real product UI + PDF scene + voiceover on macOS):

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://shiftworkshr.com npm run record:demo-video
```

Output:
- `marketing/demo-walkthrough.mp4` — upload to LinkedIn
- `marketing/demo-walkthrough.webm` — intermediate file

**Preview the recording source** (slideshow, not linked from homepage):

- https://shiftworkshr.com/demo-video
- https://shiftworkshr.com/demo-video?autoplay=1

Scenes: intro → upload → real analyzer dashboard → issue tabs → PDF executive summary → CTA.

## Interactive demos on the website

| What | URL |
|------|-----|
| Homepage sample (marketing preview) | https://shiftworkshr.com → **Sample** tab |
| Full interactive analyzer | https://shiftworkshr.com/sample-preview |
| Try with your file | https://shiftworkshr.com/try |

The **Sample** tab shows a clean preview. Scroll **up** if you see “Merit season resources” — that section is below the tab card, not inside Sample.
