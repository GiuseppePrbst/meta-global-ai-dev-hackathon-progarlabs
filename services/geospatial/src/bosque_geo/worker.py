"""Terminate an isolated native raster reader when its wall-clock deadline expires."""

import multiprocessing
from threading import BoundedSemaphore

SLOTS = BoundedSemaphore(1)


def _analyze(connection, spec, request, weighted):
    try:
        from bosque_geo.raster import LocalCanopyProvider, RasterSpec

        provider = LocalCanopyProvider(RasterSpec.model_validate(spec))
        if weighted:
            from bosque_geo.context import WeightedForestRequest
            from bosque_geo.weighted import weighted_statistics

            result = weighted_statistics(
                provider, WeightedForestRequest.model_validate(request)
            )
        else:
            from bosque_geo.contracts import Polygon

            result = provider.analyze(Polygon.model_validate(request))
        connection.send(("ok", result.model_dump(mode="json")))
    except ValueError as exc:
        connection.send(("invalid", str(exc)))
    except (OSError, RuntimeError, ImportError):
        connection.send(("error", "Raster no disponible"))
    finally:
        connection.close()


def run_isolated(target, arguments: tuple, timeout: float):
    if not SLOTS.acquire(blocking=False):
        raise RuntimeError("Análisis raster ocupado")
    context = multiprocessing.get_context("spawn")
    receive, send = context.Pipe(duplex=False)
    process = context.Process(target=target, args=(send, *arguments), daemon=True)
    try:
        process.start()
        send.close()
        if not receive.poll(timeout):
            raise TimeoutError("Tiempo raster agotado; proceso interrumpido")
        try:
            status, payload = receive.recv()
        except EOFError:
            raise RuntimeError("Worker raster terminó sin resultado") from None
        if status == "invalid":
            raise ValueError(payload)
        if status != "ok":
            raise RuntimeError("Raster no disponible")
        return payload
    finally:
        if process.pid is not None:
            if process.is_alive():
                process.terminate()
            process.join(1)
            if process.is_alive():
                process.kill()
                process.join(1)
            process.close()
        receive.close()
        send.close()
        SLOTS.release()


def analyze_isolated(spec, request, *, weighted: bool, timeout: float):
    return run_isolated(
        _analyze,
        (spec.model_dump(mode="json"), request.model_dump(mode="json"), weighted),
        timeout,
    )
