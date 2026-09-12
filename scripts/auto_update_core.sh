#!/usr/bin/env bash
set -e

CHROMIUM_SRC="/build/chromium/src"
HYPERION_DIR="/build/hyperion-desktop"
PATCH_FILE="${HYPERION_DIR}/patches/hyperion_core_fingerprint.patch"
OUT_RELEASE="${CHROMIUM_SRC}/out/Release"

echo "=== Hyperion Upstream Chromium Rebuilder ==="

# 1. Fetch latest upstream version
UPSTREAM_VER=$(curl -s "https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux" | jq -r '.[0].version')
echo "Upstream Chromium Stable: ${UPSTREAM_VER}"

if [ ! -d "${CHROMIUM_SRC}" ]; then
  echo "Chromium source directory ${CHROMIUM_SRC} not found. Skipping local compile."
  exit 0
fi

cd "${CHROMIUM_SRC}"

# Check current version in src
if [ -f "chrome/VERSION" ]; then
  CURRENT_MAJ=$(grep 'MAJOR=' chrome/VERSION | cut -d'=' -f2)
  CURRENT_BLD=$(grep 'BUILD=' chrome/VERSION | cut -d'=' -f2)
  echo "Current Local Chromium: ${CURRENT_MAJ}.0.${CURRENT_BLD}.0"
fi

echo "Testing patch status..."
if [ -f "${PATCH_FILE}" ]; then
  echo "Patch file exists: ${PATCH_FILE}"
fi

# Build chrome binary
echo "Running autoninja compile..."
autoninja -C "${OUT_RELEASE}" chrome

# Sync to local user browser directory if exists
TARGET_USER_DIR="/home/obidinog/hyperion-browser"
if [ -d "${TARGET_USER_DIR}" ]; then
  echo "Updating ${TARGET_USER_DIR}/chrome..."
  cp "${OUT_RELEASE}/chrome" "${TARGET_USER_DIR}/chrome"
fi

echo "=== Build finished successfully! ==="
