# # Stage 1: build
FROM ghcr.io/astral-sh/uv:0.9.7 AS uv
FROM dhi.io/python:3.13-debian13-sfw-ent-dev AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
     gcc \
     g++ \
     libpq-dev \
     libffi-dev \
     libssl-dev \
     openssl \
     libcairo2 \
     && rm -rf /var/lib/apt/lists/*
COPY --from=uv /uv /usr/local/uv-bin/uv
ENV PATH="/usr/local/uv-bin:$PATH"
COPY requirements.txt .
RUN uv pip install --no-cache-dir -r requirements.txt --system --prerelease=allow
RUN uv pip install --no-cache-dir --upgrade --system \
    "transformers>=5.10.1" "cryptography>=50.0.1" "joserfc>=1.7.3" "nltk==3.10.3"
RUN python -m spacy download en_core_web_sm
RUN python -m spacy download zh_core_web_sm
COPY . .
RUN python -m nltk.downloader -d /usr/local/share/nltk_data \
    punkt_tab averaged_perceptron_tagger_eng punkt
RUN mkdir -p logs
# # =========================================================
# # Stage 2: runtime
FROM dhi.io/python:3.13-debian13 AS runtime
WORKDIR /app
COPY --from=builder --chown=65532:65532 /usr/lib/python3.13/site-packages /usr/lib/python3.13/site-packages
COPY --from=builder --chown=65532:65532 /usr/lib/x86_64-linux-gnu/ /usr/lib/x86_64-linux-gnu/
COPY --from=builder --chown=65532:65532 /usr/bin/uvicorn /usr/bin/uvicorn
COPY --from=builder --chown=65532:65532 /usr/local/share/nltk_data /usr/local/share/nltk_data
COPY --from=builder --chown=65532:65532 /app /app
EXPOSE 8000
USER 65532:65532
ENTRYPOINT ["python", "entrypoint.py"]








# FROM dhi.io/python:3.13-debian-sfw-ent-dev
# WORKDIR /app
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     curl \
#     gzip \
#     libcairo2 \
#     && rm -rf /var/lib/apt/lists/*
# COPY requirements.txt .
# COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
# RUN uv pip install --no-cache-dir -r requirements.txt --system --prerelease=allow
# COPY . .
# RUN python -m nltk.downloader -d /usr/local/share/nltk_data punkt_tab averaged_perceptron_tagger_eng punkt
# RUN mkdir -p logs
# EXPOSE 8000
# COPY entrypoint.sh /app/entrypoint.sh
# RUN chmod +x /app/entrypoint.sh
# ENTRYPOINT ["/app/entrypoint.sh"]
