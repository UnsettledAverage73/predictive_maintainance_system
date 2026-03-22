# Build Stage for Rust and Dependencies
FROM python:3.12-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl build-essential gcc libssl-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything and build Rust engine
COPY . .
WORKDIR /app/src/engine
RUN cargo build --release
# Move the compiled library to the src folder so Python can find it
RUN cp target/release/librust_engine.so ../rust_engine.so

# Final Stage
FROM python:3.12-slim
WORKDIR /app

# Install Redis and runtime dependencies
RUN apt-get update && apt-get install -y redis-server libssl3 && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /app /app

# Ensure data directory exists for persistent disk mount
RUN mkdir -p /app/data

ENV PORT=8000
EXPOSE 8000

# Start script to run Redis and the API
CMD redis-server --daemonize yes && uvicorn src.api:app --host 0.0.0.0 --port $PORT
