import time

import pytest
from bosque_geo.worker import run_isolated


def stalled(connection):
    time.sleep(60)


def healthy(connection):
    connection.send(("ok", {"ready": True}))


def test_effective_deadline_terminates_process_and_recovers_slot():
    started = time.monotonic()
    with pytest.raises(TimeoutError):
        run_isolated(stalled, (), 0.3)
    assert time.monotonic() - started < 5
    assert run_isolated(healthy, (), 5) == {"ready": True}
