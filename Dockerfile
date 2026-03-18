# STAGE 1: The Rust Forge
FROM rust:1.76-slim-bookworm as builder

RUN apt-get update && apt-get install -y python3 python3-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app/engine
COPY src/engine/Cargo.toml .
COPY src/engine/src ./src
# Build the Rust logic using maturin/pyo3
RUN cargo build --release

# STAGE 2: The Sovereign Runtime
FROM python:3.12-slim
ENV APP_HOME=/app
WORKDIR $APP_HOME

# Copy compiled Rust engine from Stage 1
COPY --from=builder /app/engine/target/release/librust_engine.so ./src/agent/rust_engine.so

# Copy uv for Python dependency speed
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

COPY . .
EXPOSE 8501
CMD ["streamlit", "run", "src/cli/dashboard.py"]
