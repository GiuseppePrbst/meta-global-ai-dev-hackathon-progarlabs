FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.12.3 /uv /bin/uv
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ENV PATH="/app/services/api/.venv/bin:$PATH"
COPY services/botanical-ai services/botanical-ai
COPY services/geospatial services/geospatial
COPY services/api services/api
RUN uv sync --project services/api --frozen --no-dev --no-editable \
    && useradd --create-home bosque
USER bosque
EXPOSE 8000
# Cloud Run injects PORT; Compose and local runs keep 8000. exec makes uvicorn PID 1 so
# SIGTERM from Cloud Run triggers a graceful shutdown instead of a hard kill.
CMD ["sh", "-c", "exec python -m uvicorn bosque_api.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log --timeout-graceful-shutdown 10"]
