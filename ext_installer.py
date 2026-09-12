#!/usr/bin/env python3
import sys
import os
import json
import urllib.request
import zipfile
import io

def download_and_extract(ext_id, target_dir):
    url = f"https://clients2.google.com/service/update2/crx?response=redirect&prodversion=155.0&acceptformat=crx2,crx3&x=id%3D{ext_id}%26uc"
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36"
    }
    req = urllib.request.Request(url, headers=headers)
    data = urllib.request.urlopen(req, timeout=30).read()

    pos = data.find(b"PK\x03\x04")
    if pos == -1:
        print(json.dumps({"success": False, "error": "Invalid CRX format / zip header not found"}))
        sys.exit(1)

    os.makedirs(target_dir, exist_ok=True)
    zf = zipfile.ZipFile(io.BytesIO(data[pos:]))
    zf.extractall(target_dir)

    manifest_path = os.path.join(target_dir, "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            pass

    print(json.dumps({
        "success": True,
        "name": manifest.get("name", ext_id),
        "version": manifest.get("version", "1.0"),
        "path": target_dir
    }))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: ext_installer.py <ext_id> <target_dir>"}))
        sys.exit(1)
    try:
        download_and_extract(sys.argv[1], sys.argv[2])
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
