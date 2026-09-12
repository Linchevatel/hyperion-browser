#!/usr/bin/env python3
import sys
import os
import json
import sqlite3
import time

def import_cookies(db_path, cookies_data):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Create standard Chromium cookies table if not exists
    cur.execute('''
    CREATE TABLE IF NOT EXISTS cookies(
        creation_utc INTEGER NOT NULL,
        host_key TEXT NOT NULL,
        top_frame_site_key TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        encrypted_value BLOB DEFAULT X'',
        path TEXT NOT NULL,
        expires_utc INTEGER NOT NULL,
        is_secure INTEGER NOT NULL,
        is_httponly INTEGER NOT NULL,
        last_access_utc INTEGER NOT NULL,
        has_expires INTEGER NOT NULL,
        is_persistent INTEGER NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        samesite INTEGER NOT NULL DEFAULT -1,
        source_scheme INTEGER NOT NULL DEFAULT 0,
        source_port INTEGER NOT NULL DEFAULT -1,
        is_same_party INTEGER NOT NULL DEFAULT 0,
        last_update_utc INTEGER NOT NULL DEFAULT 0,
        UNIQUE (host_key, top_frame_site_key, name, path)
    )
    ''')

    count = 0
    now_windows_epoch = int((time.time() + 11644473600) * 1000000)

    for item in cookies_data:
        name = item.get('name') or item.get('Name') or ''
        value = item.get('value') or item.get('Value') or ''
        domain = item.get('domain') or item.get('Domain') or item.get('host') or ''
        path = item.get('path') or item.get('Path') or '/'
        secure = 1 if (item.get('secure') or item.get('Secure')) else 0
        httponly = 1 if (item.get('httpOnly') or item.get('HttpOnly')) else 0
        exp = item.get('expirationDate') or item.get('expiry') or item.get('expires') or 0

        if not name or not domain:
            continue

        if exp:
            expires_utc = int((float(exp) + 11644473600) * 1000000)
            has_expires = 1
            is_persistent = 1
        else:
            expires_utc = 0
            has_expires = 0
            is_persistent = 0

        cur.execute('''
        INSERT OR REPLACE INTO cookies (
            creation_utc, host_key, top_frame_site_key, name, value, path,
            expires_utc, is_secure, is_httponly, last_access_utc,
            has_expires, is_persistent, priority, samesite
        ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, -1)
        ''', (
            now_windows_epoch, domain, name, value, path,
            expires_utc, secure, httponly, now_windows_epoch,
            has_expires, is_persistent
        ))
        count += 1

    conn.commit()
    conn.close()
    return count

def export_cookies(db_path):
    if not os.path.exists(db_path):
        return []
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute('SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly FROM cookies')
        rows = cur.fetchall()
        cookies = []
        for r in rows:
            domain, name, value, path, exp_utc, secure, httponly = r
            exp_unix = (exp_utc / 1000000) - 11644473600 if exp_utc > 0 else None
            cookies.append({
                "domain": domain,
                "name": name,
                "value": value,
                "path": path,
                "expirationDate": exp_unix,
                "secure": bool(secure),
                "httpOnly": bool(httponly)
            })
        conn.close()
        return cookies
    except Exception as e:
        conn.close()
        return []

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: cookie_manager.py <import|export> <db_path> [json_data]"}))
        sys.exit(1)

    cmd = sys.argv[1]
    db_path = sys.argv[2]

    try:
        if cmd == "import":
            raw_json = sys.stdin.read()
            data = json.loads(raw_json)
            # handle netscape string vs json array
            if isinstance(data, list):
                imported = import_cookies(db_path, data)
                print(json.dumps({"success": True, "count": imported}))
            else:
                print(json.dumps({"success": False, "error": "JSON must be array of cookies"}))
        elif cmd == "export":
            cookies = export_cookies(db_path)
            print(json.dumps({"success": True, "cookies": cookies}))
        else:
            print(json.dumps({"success": False, "error": f"Unknown command {cmd}"}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
