"""Create, inspect or revoke a closed-beta invitation. The operator token is read from stdin.

    python scripts/beta_invite.py beta-07 guide,transcribe < operator-token-file
    python scripts/beta_invite.py --status beta-07 < operator-token-file
    python scripts/beta_invite.py --revoke beta-07 < operator-token-file

The invitation is printed once; only its hash is stored. Never pass tokens as arguments.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument(
    "identity", help="seudónimo estable, sin datos personales (p. ej. beta-07)"
)
parser.add_argument("scopes", nargs="?", default="guide,transcribe,identify")
action = parser.add_mutually_exclusive_group()
action.add_argument("--revoke", action="store_true")
action.add_argument(
    "--status", action="store_true", help="invitaciones, sesiones y consumo"
)
parser.add_argument("--base", default="https://api-bosquevivo.progarlabs.com")
args = parser.parse_args()
token = sys.stdin.read().strip()
method, body = "POST", {}
if args.revoke:
    path = f"/admin/identities/{args.identity}/revoke"
elif args.status:
    path, method, body = f"/admin/identities/{args.identity}", "GET", None
else:
    path = "/admin/invitations"
    body = {"identity": args.identity, "scopes": args.scopes.split(",")}
request = urllib.request.Request(
    args.base + path,
    data=None if body is None else json.dumps(body).encode(),
    method=method,
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "bosque-vivo-operator/1.0",
    },
)
try:
    with urllib.request.urlopen(request, timeout=30) as response:
        print(json.dumps(json.load(response), indent=2, ensure_ascii=False))
except urllib.error.HTTPError as exc:
    sys.exit(f"{exc.code}: {exc.read().decode(errors='replace')[:300]}")
