#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
output="${1:-/tmp/rhythm-watch-build}"
app="$output/RhythmWatch.app"
sdk="$(xcrun --sdk watchsimulator --show-sdk-path)"
mkdir -p "$app"
cp "$root/targets/watch/Info.plist" "$app/Info.plist"
cp "$root/assets/icon.png" "$app/RhythmMark.png"
cat > "$output/HealthKit.entitlements" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>com.apple.developer.healthkit</key><true/></dict></plist>
PLIST
xcrun --sdk watchsimulator swiftc -parse-as-library \
  -target "$(uname -m)-apple-watchos10.0-simulator" -sdk "$sdk" \
  -module-cache-path "$output/ModuleCache" \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __entitlements \
  -Xlinker "$output/HealthKit.entitlements" \
  "$root/targets/watch/RhythmWatchApp.swift" -o "$app/RhythmWatch"
codesign --force --sign - "$app"
