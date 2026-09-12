#!/usr/bin/env python3
import sys
import os
import json
import urllib.request
import urllib.error
import zipfile
import io

def download_and_extract(ext_id, target_dir):
    url = f"https://clients2.google.com/service/update2/crx?response=redirect&prodversion=155.0&acceptformat=crx2,crx3&x=id%3D{ext_id}%26uc"
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        data = resp.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(json.dumps({"success": False, "error": "Расширение не найдено в Chrome Web Store (удалено или неверный ID)"}))
            return
        print(json.dumps({"success": False, "error": f"Ошибка HTTP {e.code}: {e.reason}"}))
        return
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Ошибка сети при загрузке: {str(e)}"}))
        return

    if not data or len(data) == 0:
        print(json.dumps({"success": False, "error": "Google прекратил распространение данного расширения (устаревший Manifest V2)"}))
        return

    pos = data.find(b"PK\x03\x04")
    if pos == -1:
        print(json.dumps({"success": False, "error": "Не удалось распаковать расширение (неверный формат CRX / архив поврежден)"}))
        return

    os.makedirs(target_dir, exist_ok=True)
    try:
        zf = zipfile.ZipFile(io.BytesIO(data[pos:]))
        zf.extractall(target_dir)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Ошибка распаковки архива: {str(e)}"}))
        return

    manifest_path = os.path.join(target_dir, "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            pass

    name = manifest.get("name", ext_id)
    if isinstance(name, str) and name.startswith("__MSG_") and name.endswith("__"):
        key = name[6:-2]
        for loc in ["ru", "en", "en_US", "en_GB"]:
            loc_path = os.path.join(target_dir, "_locales", loc, "messages.json")
            if os.path.exists(loc_path):
                try:
                    with open(loc_path, "r", encoding="utf-8") as f:
                        loc_data = json.load(f)
                        if key in loc_data and "message" in loc_data[key]:
                            name = loc_data[key]["message"]
                            break
                except Exception:
                    pass

    print(json.dumps({
        "success": True,
        "name": name,
        "version": manifest.get("version", "1.0"),
        "path": target_dir
    }))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: ext_installer.py <ext_id> <target_dir>"}))
        sys.exit(0)
    try:
        download_and_extract(sys.argv[1], sys.argv[2])
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
