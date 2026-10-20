# Ein Image für Web-App, Worker und Migrationen (unterschiedlicher Startbefehl)
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Platzhalter nur für den Build-Schritt – echte Werte kommen zur Laufzeit aus der .env
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only-secret-build-only-secret-0000 \
    FILE_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
    DOWNLOAD_SIGNING_SECRET=build-only-secret-build-only-secret-0000 \
    NEXT_TELEMETRY_DISABLED=1 npm run build

FROM node:22-bookworm-slim AS runtime
# PDF-Werkzeuge und Texterkennung (OCR) für den Worker
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN useradd -r -u 1001 app && mkdir -p /data/storage /data/tmp && chown -R app /data
COPY --from=build --chown=app /app ./
USER app
EXPOSE 3000
CMD ["npm", "run", "start"]
