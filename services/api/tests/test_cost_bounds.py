"""Worst-case Meta cost per operation must fit inside its ledger reservation (04-11-2026).

Prices: dev.meta.ai/docs/pricing-rate-limits (Muse Spark 1.3 Standard, Voice Transcribe).
Tokens are estimated at 3 characters each, a conservative ratio for Spanish JSON.
"""

import json

from bosque_ai.guide import SYSTEM

from bosque_api.guide_tools import PARKS, TAXA, TOOLS, execute_tool

INPUT_USD, OUTPUT_USD, VOICE_USD_HOUR = 1.25e-6, 4.25e-6, 0.18
# Values for docs/META_CLOUD_ACTIVATION.md (microUSD).
GUIDE_RESERVATION, VOICE_RESERVATION, IDENTIFY_RESERVATION = 100_000, 5_000, 30_000


def largest(name, argument_sets):
    size = 0
    for args in argument_sets:
        try:
            result = execute_tool(name, args, owner="x", store=None, landscape_context=None)
        except ValueError:
            continue
        size = max(size, len(json.dumps(result, ensure_ascii=False)))
    return size


def test_worst_case_wilo_answer_fits_its_reservation():
    by_park = [{"park_id": p, "sector": None} for p in PARKS] + [{"park_id": p} for p in PARKS]
    searches = [{"query": q, "park_id": p} for q in ("sendero", "bosque", "especie") for p in PARKS]
    tools = {t["function"]["name"] for t in TOOLS}
    biggest = max(
        largest(name, by_park + [{"taxon_id": t} for t in TAXA])
        for name in tools - {"search_knowledge", "compare_taxa"}
    )
    biggest = max(
        biggest,
        largest(
            "compare_taxa", [{"taxon_a": a, "taxon_b": b} for a in TAXA for b in list(TAXA)[:6]]
        ),
    )
    search = largest("search_knowledge", searches + [{"query": "bosque"}])
    assert biggest <= 15_000, biggest  # get_park_trails is capped by MAX_TRAILS

    # guide.py: planning call, a second planning call only after search, then the answer;
    # at most 4 tool calls per planning turn; the question is at most 2000 characters.
    prompt = len(SYSTEM) + 2000 + len(json.dumps(TOOLS, ensure_ascii=False))
    first = prompt
    second = prompt + 4 * search
    final = second - len(json.dumps(TOOLS, ensure_ascii=False)) + 4 * biggest
    input_tokens = (first + second + final) / 3
    output_tokens = 1200 + 1200 + 4096
    worst_usd = input_tokens * INPUT_USD + output_tokens * OUTPUT_USD
    print(f"wilo worst-case USD {worst_usd:.4f}")
    assert worst_usd * 1.2 <= GUIDE_RESERVATION / 1e6, worst_usd


def test_voice_and_identify_fit_their_reservations():
    assert 60 / 3600 * VOICE_USD_HOUR * 1.2 <= VOICE_RESERVATION / 1e6  # 60 s stream cap
    # verify strategy: identification (<=1600 out) + one verification (<=800 out). Real phone
    # photos measured ~2k input tokens per call (OPEN_SET_IDENTIFICATION_REPORT); Meta does not
    # document image tokens, so 4k (2x measured) is an empirical bound, reconciled via usage.
    worst = 2 * 4000 * INPUT_USD + (1600 + 800) * OUTPUT_USD
    assert worst * 1.2 <= IDENTIFY_RESERVATION / 1e6
