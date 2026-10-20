# Produktionsimage für Web-App UND Worker (gleiches Image, unterschiedlicher Startbefehl)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
# OCR/PDF-Werkzeuge für den Worker
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
RUN useradd -r -u 1001 app
COPY --from=build /app ./
USER app
EXPOSE 3000
# Web:    docker run … image npm run start
# Worker: docker run … image npm run worker
# Migrationen (einmalig je Release): docker run … image npm run db:migrate
CMD ["npm", "run", "start"]
