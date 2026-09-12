#!/usr/bin/env python3
"""
Cookie Warm-Up Robot for Hyperion Browser
Navigates given Chromium profile through specified URLs in headless/silent mode
to naturally collect first-party cookies, cache, and history.
"""
import sys
import os
import time
import subprocess
import json

DEFAULT_WARMUP_URLS = [
    "https://www.wikipedia.org",
    "https://www.bbc.com",
    "https://news.ycombinator.com",
    "https://www.cnn.com",
    "https://www.reuters.com",
    "https://www.amazon.com",
    "https://www.reddit.com"
]

def warmup_profile(chrome_bin, profile_dir, urls, proxy=None):
    if not urls:
        urls = DEFAULT_WARMUP_URLS

    os.makedirs(profile_dir, exist_ok=True)

    args = [
        chrome_bin,
        f"--user-data-dir={profile_dir}",
        "--headless=new",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-gpu",
        "--password-store=basic"
    ]

    if proxy:
        args.append(f"--proxy-server={proxy}")

    visited = 0
    total = len(urls)

    for i, url in enumerate(urls, 1):
        url = url.strip()
        if not url:
            continue
        try:
            print(json.dumps({"type": "progress", "index": i, "total": total, "url": url}), flush=True)
            cmd = args + [url]
            proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            # Give page time to load and set cookies
            time.sleep(3)
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
            visited += 1
        except Exception as e:
            pass

    return visited

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print('{"success": false, "error": "Usage: warmup_robot.py <chrome_bin> <profile_dir> [proxy]"}')
        sys.exit(1)

    chrome_bin = sys.argv[1]
    profile_dir = sys.argv[2]
    proxy = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "none" else None

    # URLs from stdin or default
    urls = []
    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            raw = raw.replace('\r', '').replace('\\r', '').replace('\\n', '\n')
            urls = [line.strip() for line in raw.split("\n") if line.strip()]

    if not urls:
        urls = DEFAULT_WARMUP_URLS

    count = warmup_profile(chrome_bin, profile_dir, urls, proxy)
    print(json.dumps({"success": True, "visited": count, "total": len(urls)}), flush=True)
