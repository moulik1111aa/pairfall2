#!/usr/bin/env bash
# Smoke test on an Android emulator (run by CI inside android-emulator-runner):
# install the APK, launch it, play the first move, use the back button, open
# How to play, and leave the app — taking screenshots and checking the log for
# crashes along the way. Usage: scripts/smoke-android.sh Pairfall.apk out-dir
set -u
APK=${1:-Pairfall.apk}
OUT=${2:-ci-results}
PKG=com.pairfall.game
mkdir -p "$OUT"
FAILS=()
STEP=0

note() { echo "[smoke] $*" | tee -a "$OUT/steps.txt"; }
fail() { note "FAIL: $*"; FAILS+=("$*"); }
shot() { STEP=$((STEP + 1)); adb exec-out screencap -p > "$OUT/$(printf %02d $STEP)-$1.png"; }
ui() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb exec-out cat /sdcard/ui.xml 2>/dev/null; }
# Centre of the first on-screen node whose text or description contains $1 (prints "x y").
find_node() {
  ui | python3 -c '
import sys, re, html
want = sys.argv[1]
xml = sys.stdin.read()
for m in re.finditer(r"<node [^>]*>", xml):
    n = m.group(0)
    text = html.unescape(" ".join(re.findall(r"(?:text|content-desc)=\"([^\"]*)\"", n)))
    b = re.search(r"bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"", n)
    if want in text and b:
        x1, y1, x2, y2 = map(int, b.groups())
        if x2 > x1 and y2 > y1:
            print((x1 + x2) // 2, (y1 + y2) // 2); break
' "$1"
}
# Wait up to $2 seconds for text $1 to appear on screen.
wait_for() {
  local t=0
  while [ $t -lt "${2:-30}" ]; do
    [ -n "$(find_node "$1")" ] && return 0
    sleep 2; t=$((t + 2))
  done
  return 1
}
tap_text() {
  local xy; xy=$(find_node "$1")
  if [ -z "$xy" ]; then fail "could not find \"$1\" to tap"; return 1; fi
  adb shell input tap $xy; note "tapped \"$1\" at $xy"
}
alive() { [ -n "$(adb shell pidof $PKG | tr -d '\r')" ]; }

note "device: $(adb shell getprop ro.product.model | tr -d '\r'), Android $(adb shell getprop ro.build.version.release | tr -d '\r'), $(adb shell wm size | tr -d '\r')"
adb install -r "$APK" | tee -a "$OUT/steps.txt" || { fail "install failed"; exit 1; }
adb logcat -c

# 1. Launch: the home screen appears, full screen.
adb shell am start -W -n $PKG/.MainActivity | tee -a "$OUT/steps.txt"
if wait_for "Start playing" 90; then note "home screen is up"; else fail "home screen did not appear"; fi
sleep 3; shot home
adb shell dumpsys window windows 2>/dev/null | grep -iE "mCurrentFocus|isStatusBarVisible|statusBars" | head -5 >> "$OUT/steps.txt"

# 2. Start level 1: the coach explains the first move, in English and Hindi.
tap_text "Start playing"
if wait_for "Tap a tile" 60; then note "level 1 coach shown"; else fail "level 1 did not start"; fi
wait_for "टाइल" 5 && note "Hindi coach line shown" || fail "Hindi coach line missing"
sleep 2; shot level-1

# 3. Tap tiles until one goes to the tray (the coach then asks for its twin).
for name in Lotus Koi Bamboo Lantern Blossom Crane Fan Bonsai Moon Wave Stones Bell; do
  xy=$(find_node "$name") || true
  [ -z "$xy" ] && continue
  adb shell input tap $xy; sleep 2
  if [ -n "$(find_node "twin")" ]; then note "tile \"$name\" moved to the tray"; break; fi
done
[ -n "$(find_node "twin")" ] || fail "no tile tap reached the tray"
shot first-move

# 4. Back button pauses; back again resumes.
adb shell input keyevent KEYCODE_BACK
if wait_for "Paused" 10; then note "back paused the game"; else fail "back did not pause"; fi
shot paused
adb shell input keyevent KEYCODE_BACK; sleep 2
[ -z "$(find_node "Resume")" ] && note "back resumed" || fail "back did not resume"

# 5. Pause, go home, open How to play and page through it.
adb shell input keyevent KEYCODE_BACK; wait_for "Paused" 10 >/dev/null
tap_text "Home"
wait_for "Start playing" 20 || wait_for "Play level" 5 || fail "did not return home"
tap_text "How to play"
if wait_for "Tap a tile" 15; then note "How to play opened"; else fail "How to play did not open"; fi
shot how-to-play
tap_text "Next"; sleep 2; shot how-to-play-2
adb shell input keyevent KEYCODE_BACK; sleep 2

# 6. On home, back warns first, then leaves (the app moves to the background).
adb shell input keyevent KEYCODE_BACK
wait_for "Press back again" 6 && note "exit warning shown" || fail "no exit warning"
shot exit-warning
adb shell input keyevent KEYCODE_BACK; sleep 3
FOCUS=$(adb shell dumpsys window | grep -m1 mCurrentFocus | tr -d '\r')
note "after second back: $FOCUS"
echo "$FOCUS" | grep -q "$PKG" && fail "app did not leave on second back"

# 7. Relaunch: still alive, progress kept (level 1 was played once).
adb shell am start -W -n $PKG/.MainActivity >/dev/null
wait_for "Pairfall" 30 || fail "relaunch failed"
alive && note "process alive after relaunch" || fail "process died"
shot relaunch

# Logs: crashes and JavaScript errors fail the test.
adb logcat -d > "$OUT/logcat-full.txt"
grep -E "AndroidRuntime|Capacitor|chromium|Pairfall|$PKG|System.err" "$OUT/logcat-full.txt" | tail -n 400 > "$OUT/logcat.txt"
if grep -q "FATAL EXCEPTION" "$OUT/logcat-full.txt"; then fail "app crashed (FATAL EXCEPTION in logcat)"; fi
if grep -E "Capacitor/Console.*(Uncaught|TypeError|ReferenceError)" "$OUT/logcat-full.txt" > "$OUT/js-errors.txt"; then fail "JavaScript errors in the console"; fi
rm -f "$OUT/logcat-full.txt"

if [ ${#FAILS[@]} -gt 0 ]; then
  note "${#FAILS[@]} problem(s): ${FAILS[*]}"
  exit 1
fi
note "all smoke checks passed"
