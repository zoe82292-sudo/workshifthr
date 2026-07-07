# Marketing assets (local / LinkedIn — not served on the site)

## LinkedIn demo video

Generate after the app is running (`./start.sh` or production URL):

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run record:demo-video
```

Output:

- `marketing/demo-walkthrough.mp4` — upload this to LinkedIn
- `marketing/demo-walkthrough.webm` — intermediate file

Preview the source slideshow (not linked from the homepage):

- http://localhost:8080/demo-video
- http://localhost:8080/demo-video?autoplay=1
