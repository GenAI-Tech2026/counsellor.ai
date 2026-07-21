# Standalone embedding service — see services/embed/server.mjs.
#
# BUILD CONTEXT MUST BE THE REPO ROOT so the model weights (./models) and the
# shared lib/ are available:
#
#   docker build -f services/embed/Dockerfile -t counsellor-embed .
#   docker run -p 8080:8080 counsellor-embed
#
# It installs the SAME dependency tree the app uses (@xenova/transformers +
# its transitive onnxruntime-node + sharp), so the model and runtime are
# byte-identical to the in-process path — the vectors it returns match exactly.
FROM node:20-bookworm-slim

WORKDIR /app

# libgomp1: OpenMP runtime that onnxruntime-node's native binding dlopen()s.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libgomp1 \
  && rm -rf /var/lib/apt/lists/*

# Install deps from the exact lockfile. --omit=dev keeps prod + optional deps
# (onnxruntime-node is optional; @xenova/transformers + sharp are prod), which is
# everything lib/embeddings.mjs needs, and drops the Next.js/build toolchain.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# The committed model weights (lib/embeddings.mjs reads them from ./models at
# runtime by path) plus the code the service reuses.
COPY models ./models
COPY lib ./lib
COPY services ./services

ENV PORT=8080
EXPOSE 8080

# WORKDIR stays /app so process.cwd() === /app and ./models resolves.
CMD ["node", "services/embed/server.mjs"]
