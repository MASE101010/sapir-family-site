#!/bin/bash
# בדיקת הממשק בטלוויזיה: מתקינים, פותחים, לוחצים על השלט ומצלמים כל שלב
mkdir -p shots
shot() { sleep "${2:-2}"; adb exec-out screencap -p > "shots/$1.png"; echo "shot $1"; }
key() { for i in $(seq 1 "${2:-1}"); do adb shell input keyevent "$1"; sleep 0.4; done; }
adb install -r apk/sapir-family-tv.apk
adb shell pm list packages | grep sapir
adb logcat -c
adb shell am start -n il.co.sapirfamily.app/.MainActivity
shot 01-launch 25
key 21 3; shot 02-row-next3 2          # DPAD_LEFT: הבא בשורה (RTL)
key 20 2; shot 03-down2 2              # DPAD_DOWN
key 23; shot 04-player 25              # OK: פתיחת סרטון
key 22 3; shot 05-seek-fwd 1           # DPAD_RIGHT: קדימה
shot 06-after-seek 4
key 23; shot 07-paused 2               # OK: עצירה
key 23; key 19; shot 08-next-card 2    # המשך, ואז למעלה: הבא בתור
key 4; shot 09-back-rows 3             # BACK: חזרה לשורות
key 19 4; key 21; key 23; shot 10-shorts 20   # לסרגל, שורטס
key 20; shot 11-short-next 15
key 4; shot 12-back-vod 3
adb logcat -d | grep -iE "chromium|console|AndroidRuntime|FATAL" | tail -80 > shots/log.txt
adb shell pidof il.co.sapirfamily.app > shots/pid.txt || echo dead > shots/pid.txt
exit 0
