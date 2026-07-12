#!/usr/bin/env python3
"""Start (or restart) the seven Stat APIs the demo consumes.

Frees ports 8001-8007, launches each FastAPI service detached with `uv run`,
streams logs to ./logs/<name>.log, then health-checks every service.

Usage:
    scripts/start-apis.py            # kill ports + start + health-check
    scripts/start-apis.py --stop     # just free the ports and exit
"""
from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
STAT_APIS = REPO.parent
LOG_DIR = REPO / "logs"

# name, sibling directory, uvicorn app module, port
SERVICES = [
    ("github", "GitHub", "main:app", 8001),
    ("leetcode", "LeetCode", "app:app", 8002),
    ("codeforces", "CodeForces", "app:app", 8003),
    ("gfg", "GFG", "app:app", 8004),
    ("codechef", "CodeChef", "main:app", 8005),
    ("hackerrank", "HackerRank", "main:app", 8006),
    ("tuf", "TUF", "app:app", 8007),
]
PORTS = [port for *_, port in SERVICES]


def pids_on_port(port: int) -> list[int]:
    out = subprocess.run(
        ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
        text=True, capture_output=True, check=False,
    ).stdout
    return sorted({int(p) for p in out.split() if p.strip().isdigit()})


def alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def free_port(port: int) -> None:
    pids = pids_on_port(port)
    if not pids:
        print(f"  port {port}: already free")
        return
    print(f"  port {port}: killing {', '.join(map(str, pids))}")
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    deadline = time.time() + 3
    while time.time() < deadline and any(alive(p) for p in pids):
        time.sleep(0.2)
    for pid in pids:
        if alive(pid):
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass


def free_ports() -> None:
    print("Freeing ports 8001-8007...")
    for port in PORTS:
        free_port(port)


def launch(name: str, directory: str, module: str, port: int) -> None:
    path = STAT_APIS / directory
    log = LOG_DIR / f"{name}.log"
    if not path.exists():
        print(f"  ! {name}: dir not found ({path}) — skipping")
        return
    cmd = ["uv", "run", "python", "-m", "uvicorn", module, "--port", str(port), "--reload"]
    with open(log, "w") as fh:
        subprocess.Popen(
            cmd, cwd=str(path), stdout=fh, stderr=subprocess.STDOUT,
            start_new_session=True,  # detach so servers outlive this script
        )
    print(f"  → {name}: {module} on :{port}  (log: {log.relative_to(REPO)})")


def http_up(port: int) -> bool:
    """A server is 'up' if it answers HTTP at all (any status, even 404)."""
    for route in ("/docs", "/"):
        try:
            urllib.request.urlopen(f"http://localhost:{port}{route}", timeout=2)
            return True
        except urllib.error.HTTPError:
            return True  # responded with a status code -> process is alive
        except (urllib.error.URLError, ConnectionError, OSError):
            continue
    return False


def health_check() -> bool:
    print("\nWaiting for services to boot...")
    pending = {name: port for name, _, _, port in SERVICES}
    deadline = time.time() + 40
    while pending and time.time() < deadline:
        for name in list(pending):
            if http_up(pending[name]):
                print(f"  ✓ {name} (:{pending[name]})")
                del pending[name]
        if pending:
            time.sleep(1)
    for name, port in pending.items():
        print(f"  ✗ {name} (:{port}) — not responding (see logs/{name}.log)")
    return not pending


def main() -> None:
    if "--stop" in sys.argv:
        free_ports()
        print("Stopped.")
        return

    LOG_DIR.mkdir(exist_ok=True)
    print("--- Stat APIs startup ---")
    free_ports()
    print("\nLaunching services...")
    for name, directory, module, port in SERVICES:
        launch(name, directory, module, port)
    ok = health_check()
    print("\nAll seven up." if ok else "\nSome services failed — check logs/.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
