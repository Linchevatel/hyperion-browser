#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert Camoufox fingerprint presets into Hyperion Hardware Kits.

Attribution:
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.

    Hardware preset data derived from Camoufox (MPL-2.0):
    Source: https://github.com/daijro/camoufox
"""

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# GPU classification and market popularity weights
# References: Steam Hardware Survey & StatCounter Global Stats
GPU_METADATA = {
    "windows": {
        "ANGLE (Intel, Intel(R) HD Graphics Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "intel_hd_graphics",
            "category": "laptop",
            "weight": 30.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "nvidia_gtx980",
            "category": "desktop",
            "weight": 25.0,
            "hardwareConcurrency": [6, 12],
            "ram_gb": [16, 32],
        },
        "ANGLE (Intel, Intel(R) HD Graphics 400 Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "intel_hd400",
            "category": "laptop",
            "weight": 15.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "ANGLE (AMD, Radeon R9 200 Series Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "amd_r9_200",
            "category": "desktop",
            "weight": 10.0,
            "hardwareConcurrency": [6, 12],
            "ram_gb": [16, 32],
        },
        "ANGLE (AMD, Radeon HD 3200 Graphics Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "amd_hd3200",
            "category": "laptop",
            "weight": 6.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "intel_arc_a750",
            "category": "desktop",
            "weight": 5.0,
            "hardwareConcurrency": [8, 16],
            "ram_gb": [16, 32],
        },
        "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "basic_render_driver",
            "category": "desktop",
            "weight": 3.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "ANGLE (NVIDIA, NVIDIA GeForce GTX 480 Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "nvidia_gtx480",
            "category": "desktop",
            "weight": 2.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "ANGLE (AMD, Radeon HD 5850 Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "amd_hd5850",
            "category": "desktop",
            "weight": 1.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "ANGLE (NVIDIA, NVIDIA GeForce 8800 GTX Direct3D11 vs_5_0 ps_5_0)": {
            "slug": "nvidia_8800gtx",
            "category": "desktop",
            "weight": 1.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
    },
    "macos": {
        "Apple M1": {
            "slug": "apple_m1",
            "category": "laptop",
            "weight": 70.0,
            "hardwareConcurrency": [8, 10],
            "ram_gb": [8, 16],
        },
        "Intel(R) HD Graphics 400": {
            "slug": "intel_hd400",
            "category": "laptop",
            "weight": 12.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "Radeon R9 200 Series": {
            "slug": "amd_r9_200",
            "category": "desktop",
            "weight": 8.0,
            "hardwareConcurrency": [6, 12],
            "ram_gb": [16, 32],
        },
        "Intel(R) HD Graphics": {
            "slug": "intel_hd_graphics",
            "category": "laptop",
            "weight": 5.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "Radeon HD 3200 Graphics": {
            "slug": "amd_hd3200",
            "category": "desktop",
            "weight": 5.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
    },
    "linux": {
        "Intel(R) HD Graphics": {
            "slug": "intel_hd_graphics",
            "category": "laptop",
            "weight": 35.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "Intel(R) HD Graphics 400": {
            "slug": "intel_hd400",
            "category": "laptop",
            "weight": 20.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "Radeon R9 200 Series": {
            "slug": "amd_r9_200",
            "category": "desktop",
            "weight": 18.0,
            "hardwareConcurrency": [6, 12],
            "ram_gb": [16, 32],
        },
        "NVIDIA GeForce GTX 980": {
            "slug": "nvidia_gtx980",
            "category": "desktop",
            "weight": 12.0,
            "hardwareConcurrency": [8, 16],
            "ram_gb": [16, 32],
        },
        "Radeon HD 3200 Graphics": {
            "slug": "amd_hd3200",
            "category": "desktop",
            "weight": 12.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
        "llvmpipe": {
            "slug": "llvmpipe",
            "category": "desktop",
            "weight": 3.0,
            "hardwareConcurrency": [4, 8],
            "ram_gb": [8, 16],
        },
    },
}

DEFAULT_SPEECH_VOICES = {
    "windows": [
        "Microsoft David - English (United States):en-US:local",
        "Microsoft Mark - English (United States):en-US:local",
        "Microsoft Zira - English (United States):en-US:local",
        "Microsoft David Desktop - English (United States):en-US:local",
        "Microsoft Zira Desktop - English (United States):en-US:local",
    ],
    "macos": [
        "Samantha:en-US:local",
        "Alex:en-US:local",
    ],
    "linux": [
        "en_US-ryan-high:en-US:remote",
    ],
}


def compute_device_memory(ram_gb_min: float) -> int:
    """
    Compute navigator.deviceMemory bucket: power of 2, max 8.
    Buckets: 0.25, 0.5, 1, 2, 4, 8.
    """
    for bucket in [8, 4, 2, 1, 0.5, 0.25]:
        if ram_gb_min >= bucket:
            return int(bucket) if float(bucket).is_integer() else bucket
    return 1


def clean_renderer_name(raw_renderer: str) -> str:
    """Remove Firefox RFP spoofing suffix ', or similar'."""
    return raw_renderer.replace(", or similar", "").strip()


STANDARD_DPRS = [1, 1.25, 1.5, 1.75, 2, 2.5]


def normalize_display(display: Dict[str, Any], os_name: str) -> Optional[Dict[str, Any]]:
    """
    Normalize display metrics to standard OS scaling and screen bounds.

    1. physical_w = round(width * devicePixelRatio), physical_h = round(height * devicePixelRatio).
    2. snapped_dpr = nearest value from [1, 1.25, 1.5, 1.75, 2, 2.5] to devicePixelRatio.
    3. logical width = round(physical_w / snapped_dpr), height = round(physical_h / snapped_dpr).
       logical availWidth = round(round(availWidth * dpr_old) / snapped_dpr).
       logical availHeight = round(round(availHeight * dpr_old) / snapped_dpr).
    4. Consistency rule:
       - windows: if availHeight == height -> height - 40 (taskbar)
       - macos: if availHeight == height -> height - 25 (menubar), laptop dock preserved if < height
       - linux: if availHeight == height -> height - 32
    5. devicePixelRatio = snapped_dpr.
    7. Sanity check: if width * snapped_dpr > 8000 or width < 640 -> discard.
    """
    w = display["width"]
    h = display["height"]
    aw = display["availWidth"]
    ah = display["availHeight"]
    dpr = float(display["devicePixelRatio"])

    physical_w = round(w * dpr)
    physical_h = round(h * dpr)

    snapped_dpr = min(STANDARD_DPRS, key=lambda d: abs(d - dpr))

    # Логические размеры должны давать ЦЕЛЫЕ физические пиксели:
    # width * dpr ∈ ℤ (панель имеет целое число пикселей).
    # Для этого width/height округляем до кратных знаменателю DPR.
    DPR_DENOM = {1.0: 1, 1.25: 4, 1.5: 2, 1.75: 4, 2.0: 1, 2.5: 2}
    den = DPR_DENOM[float(snapped_dpr)]

    new_w = max(den, int(round(physical_w / snapped_dpr / den)) * den)
    new_h = max(den, int(round(physical_h / snapped_dpr / den)) * den)

    avail_phys_w = round(aw * dpr)
    new_aw = max(den, int(round(avail_phys_w / snapped_dpr / den)) * den)

    avail_phys_h = round(ah * dpr)
    new_ah = max(den, int(round(avail_phys_h / snapped_dpr / den)) * den)
    # avail не может превышать полный размер
    new_aw = min(new_aw, new_w)
    new_ah = min(new_ah, new_h)

    if os_name == "windows" and new_ah == new_h:
        new_ah = new_h - 40
    elif os_name == "macos" and new_ah == new_h:
        new_ah = new_h - 25
    elif os_name == "linux" and new_ah == new_h:
        new_ah = new_h - 32

    # Sanity check
    if new_w * snapped_dpr > 8000 or new_w < 640:
        return None

    dpr_val = int(snapped_dpr) if float(snapped_dpr).is_integer() else snapped_dpr

    return {
        "width": new_w,
        "height": new_h,
        "availWidth": new_aw,
        "availHeight": new_ah,
        "devicePixelRatio": dpr_val,
        "colorDepth": display.get("colorDepth", 24),
        "weight": display.get("weight", 0),
    }


def build_hardware_kits(presets_path: Path, output_dir: Path) -> Dict[str, List[Dict[str, Any]]]:
    """Parse Camoufox presets and build correlated Hardware Kits per OS."""
    with open(presets_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    presets_by_os = data.get("presets", {})
    results: Dict[str, List[Dict[str, Any]]] = {}

    for os_name in ["windows", "macos", "linux"]:
        raw_presets = presets_by_os.get(os_name, [])
        os_prefix = "win" if os_name == "windows" else ("mac" if os_name == "macos" else "linux")
        platform_name = "Win32" if os_name == "windows" else ("MacIntel" if os_name == "macos" else "Linux x86_64")

        # Group presets by unique (vendor, cleaned_renderer)
        grouped_presets: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
        for p in raw_presets:
            vendor = p["webgl"]["unmaskedVendor"]
            renderer = clean_renderer_name(p["webgl"]["unmaskedRenderer"])
            grouped_presets[(vendor, renderer)].append(p)

        kits: List[Dict[str, Any]] = []

        for (vendor, renderer), plist in grouped_presets.items():
            meta = GPU_METADATA.get(os_name, {}).get(renderer)
            if not meta:
                # Fallback for any unknown renderer
                is_laptop = any(term in renderer.lower() for term in ["laptop", "intel", "apple m", "iris", "uhd"])
                meta = {
                    "slug": renderer.lower().replace(" ", "_").replace("(", "").replace(")", ""),
                    "category": "laptop" if is_laptop else "desktop",
                    "weight": max(1.0, round(len(plist) * 1.0, 1)),
                    "hardwareConcurrency": [4, 8] if is_laptop else [6, 12],
                    "ram_gb": [8, 16] if is_laptop else [16, 32],
                }

            category = meta["category"]
            weight = meta["weight"]
            hw_concurrency = meta["hardwareConcurrency"]
            ram_gb = meta["ram_gb"]
            device_memory = compute_device_memory(min(ram_gb))
            slug = meta["slug"]

            # Aggregate displays for this renderer
            # Screen keys: width, height, availWidth, availHeight, devicePixelRatio, colorDepth
            display_counter = Counter()
            for p in plist:
                sc = p["screen"]
                dkey = (
                    int(sc["width"]),
                    int(sc["height"]),
                    int(sc["availWidth"]),
                    int(sc["availHeight"]),
                    float(sc["devicePixelRatio"]),
                    int(sc["colorDepth"]),
                )
                display_counter[dkey] += 1

            # Dominant resolution height for kit ID
            height_counter = Counter(s["screen"]["height"] for s in plist)
            dominant_height = height_counter.most_common(1)[0][0] if height_counter else 1080
            kit_id = f"{os_prefix}_{category}_{slug}_{dominant_height}p"

            total_screens = len(plist)
            raw_displays: List[Dict[str, Any]] = []
            for (w, h, aw, ah, dpr, cd), count in display_counter.items():
                disp_weight = round((count / total_screens) * 100, 1)
                disp_weight = int(disp_weight) if disp_weight.is_integer() else disp_weight
                dpr_val = int(dpr) if dpr.is_integer() else dpr
                raw_displays.append({
                    "width": w,
                    "height": h,
                    "availWidth": aw,
                    "availHeight": ah,
                    "devicePixelRatio": dpr_val,
                    "colorDepth": cd,
                    "weight": disp_weight,
                })

            # Normalize displays according to Chrome / standard OS scaling rules
            normalized_displays: List[Dict[str, Any]] = []
            for d in raw_displays:
                norm = normalize_display(d, os_name)
                if norm is not None:
                    normalized_displays.append(norm)

            # Collapse duplicate displays (same width+height+dpr+availHeight) summing weight
            collapsed: Dict[Tuple[int, int, Any, int], Dict[str, Any]] = {}
            for d in normalized_displays:
                key = (d["width"], d["height"], d["devicePixelRatio"], d["availHeight"])
                if key in collapsed:
                    cur = collapsed[key]
                    summed_weight = round(cur["weight"] + d["weight"], 1)
                    if d["weight"] > cur["weight"]:
                        collapsed[key] = dict(d)
                    collapsed[key]["weight"] = int(summed_weight) if float(summed_weight).is_integer() else summed_weight
                else:
                    collapsed[key] = dict(d)

            displays = list(collapsed.values())
            # Sort displays deterministically: weight descending, width descending, height descending, availHeight descending
            displays.sort(key=lambda d: (-d["weight"], -d["width"], -d["height"], -d["availHeight"]))

            # Speech voices: most common non-empty list in presets, else default OS fallback
            voice_lists = [tuple(p["speechVoices"]) for p in plist if p.get("speechVoices")]
            if voice_lists:
                selected_voices = list(Counter(voice_lists).most_common(1)[0][0])
            else:
                selected_voices = list(DEFAULT_SPEECH_VOICES.get(os_name, []))

            # maxTouchPoints: most common in presets (default 0)
            touch_counter = Counter(p["navigator"].get("maxTouchPoints", 0) for p in plist)
            max_touch_points = touch_counter.most_common(1)[0][0] if touch_counter else 0

            kit = {
                "id": kit_id,
                "os": os_name,
                "category": category,
                "weight": weight,
                "navigator": {
                    "platform": platform_name,
                    "hardwareConcurrency": hw_concurrency,
                    "maxTouchPoints": max_touch_points,
                },
                "ram_gb": ram_gb,
                "deviceMemory": device_memory,
                "webgl": {
                    "vendor": vendor,
                    "renderer": renderer,
                    # Полный WebGL-пресет (data/webgl_presets/<id>.json) для C++ патча.
                    # Пока база маленькая: windows → generic ANGLE, linux+NVIDIA → GTX980 дамп.
                    "preset": (
                        "windows_generic_angle" if os_name == "windows"
                        else ("nvidia_gtx980_linux" if (os_name == "linux" and "NVIDIA" in vendor.upper())
                        else None)
                    ),
                },
                "displays": displays,
                "speechVoices": selected_voices,
            }
            kits.append(kit)

        # Sort kits deterministically: weight descending, id ascending
        kits.sort(key=lambda k: (-k["weight"], k["id"]))
        results[os_name] = kits

        # Write to JSON file
        out_file = output_dir / f"{os_name}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(kits, f, indent=2, ensure_ascii=False)
            f.write("\n")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Camoufox fingerprint presets to Hyperion Hardware Kits.")
    parser.add_argument(
        "presets_arg",
        nargs="?",
        default=None,
        help="Path to camoufox-presets.json (positional shortcut)",
    )
    parser.add_argument(
        "--input",
        "-i",
        default="/tmp/camoufox-presets.json",
        help="Path to camoufox-presets.json (default: /tmp/camoufox-presets.json)",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        default=None,
        help="Target directory for hardware kits (default: data/hardware_kits/ relative to project)",
    )

    args = parser.parse_args()

    presets_path_str = args.presets_arg if args.presets_arg else args.input
    presets_path = Path(presets_path_str).resolve()
    if not presets_path.is_file():
        print(f"Error: presets file not found: {presets_path}", file=sys.stderr)
        sys.exit(1)

    if args.output_dir:
        output_dir = Path(args.output_dir).resolve()
    else:
        # Default to data/hardware_kits in project root
        repo_root = Path(__file__).resolve().parent.parent
        output_dir = repo_root / "data" / "hardware_kits"

    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Reading presets from: {presets_path}")
    print(f"Writing hardware kits to: {output_dir}")

    results = build_hardware_kits(presets_path, output_dir)

    for os_name, kits in results.items():
        print(f"\n[{os_name.upper()}] Generated {len(kits)} kits:")
        for k in kits[:5]:
            print(f"  - {k['id']} (weight={k['weight']}, category={k['category']}, displays={len(k['displays'])})")


if __name__ == "__main__":
    main()
