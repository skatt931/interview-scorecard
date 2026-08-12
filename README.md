# Interview Scorecard

Dictate an interview debrief, get a filled scorecard, download it as a PDF.

Record (or upload) audio → Groq Whisper transcribes it → you check the transcript → **Apply** structures it into the scorecard fields → edit anything by hand → **Download PDF**.

## Setup

Encrypt your Groq API key with the password the team will share:

```bash
npm run encrypt-key
```

This writes `src/auth/keyblob.json`. Commit it — the key is AES-256-GCM encrypted and cannot be read without the password. Anyone opening the site must type that password before the app loads; the decrypted key lives in `sessionStorage` and is gone when the tab closes.

To change the password or rotate the key, re-run the command and redeploy.

## Develop

```bash
npm install && npm run dev
```

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes to GitHub Pages — enable Pages with source *GitHub Actions* in the repository settings first.

## Notes

- Free-tier Groq caps audio uploads at 25 MB, roughly two hours of Opus.
- Everyone shares one Groq rate limit, since one key is embedded in the build.
