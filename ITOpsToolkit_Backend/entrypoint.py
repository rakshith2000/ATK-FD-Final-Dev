#!/usr/bin/env python3
import os
import subprocess
import sys

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)


def start_background(name: str, cmd: list[str], log_path: str) -> subprocess.Popen:
    """Start a background process, redirecting its output to a log file."""
    print(f"Starting {name}...", flush=True)
    log_file = open(log_path, "ab")
    return subprocess.Popen(
        cmd,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
    )


def main() -> None:
    # Equivalent of: nohup python3 mcp_servers/servicenow_mcp.py > servicenow_mcp.log 2>&1 &
    start_background(
        "MCP Server",
        [sys.executable, "mcp_servers/servicenow_mcp.py"],
        os.path.join(LOG_DIR, "servicenow_mcp.log"),
    )

    # Equivalent of: python3 modules/mim_assist/utils/app.py &
    start_background(
        "MIM",
        [sys.executable, "modules/mim_assist/utils/app.py"],
        os.path.join(LOG_DIR, "mim_assist.log"),
    )

    # Equivalent of: exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
    print("Starting FastAPI Server...", flush=True)
    os.execvp(
        "uvicorn",
        ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"],
    )


if __name__ == "__main__":
    main()
