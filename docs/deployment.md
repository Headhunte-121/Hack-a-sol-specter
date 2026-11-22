# Deployment

Three pieces. Only the web app is required for the offline modules; the two services are optional and the app degrades gracefully without them.

## 1. Web app (static)

```bash
cd apps/web
VITE_API_BASE=https://<reports-api-host> VITE_ASR_BASE=https://<asr-host> npm run build
```

Deploy the `dist` folder to Vercel or Netlify. The security headers are in `vercel.json` and `public/_headers`. HTTPS is required for installing the app, the camera and the microphone. Leave a variable empty to run without that service (the trends screen and the audio tab say the service is not connected).

The `connect-src` directive in the headers allows `'self'` and any `https:` host. Narrow it to your two service hosts once they are known.

## 2. Reports API

```bash
cd services/api
docker build -t specter-api .
docker run -p 7860:7860 -v api-data:/data -e API_SECRET=<random> -e API_ADMIN_KEY=<random> -e API_CORS=https://<web-host> specter-api
python -m app.seed        # optional labelled demo data, run once against the same database
```

On Render or a Hugging Face Space (Docker) set the same variables in the host settings. Never commit them. Schedule `python -m app.seed --purge` daily to apply the retention rule.

## 3. Transcription service

**Hosted (free Hugging Face Space).** `deploy/hf-asr` holds everything the Space needs (a Dockerfile and the Space README); the Space builds the service from this repository's `main` branch and downloads Whisper "small" while it builds.

1. Sign in at https://huggingface.co and open https://huggingface.co/new-space.
2. Name it (for example `suraksha-asr`), choose **Docker** with the **Blank** template, hardware **CPU basic (free)**, visibility **Public**, then **Create Space**.
3. In the Space, open **Files**, choose **Add file → Upload files**, upload `deploy/hf-asr/Dockerfile` and `deploy/hf-asr/README.md` (replacing the README the Space created), and commit.
4. Wait until the Space shows **Running** (about 5 to 10 minutes for the first build). Its address is `https://<user>-<space-name>.hf.space`; opening `<address>/health` returns `{"status":"ok",...}`.
5. In Vercel, add the environment variable `VITE_ASR_BASE` = that address (Production), then redeploy.

The Space allows requests from the live site and from localhost only; change `ASR_CORS` in the Dockerfile if the site moves. Free Spaces sleep after about two days without use: open `/health` before a demo. After changing `services/asr`, use **Settings → Factory rebuild** in the Space.

**Local (Docker).** `docker compose --profile asr up -d asr` runs it on port 8001.

To use the Hindi fine-tuned model, run `python convert_model.py` once and point `ASR_MODEL` at the converted folder (see the service README). Free hosts sleep when idle, so the first request after a pause is slow; the app shows a "waking up" message and always offers the paste-text option.

## After deploying

1. `GET <api>/health` and `GET <asr>/health` return `ok`.
2. Open the web app from the live link on a phone, wait for "Ready to use offline", then switch to airplane mode and run a message check, a quiz and the reporting guide.
3. Send one anonymous report with consent on; confirm the row in the database has only the fixed fields.
4. Check the response headers of the web app for the CSP and `X-Frame-Options`.
5. Open the live link from a signed-out browser and from a second device; keep one phone fully cached as the demo device.
