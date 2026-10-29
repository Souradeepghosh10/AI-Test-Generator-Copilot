#!/usr/bin/env bash
# Builds the Demo Shop Android app into demo-mobile-app/build/demo-shop.apk.
# Uses only the Android SDK command-line tools (aapt2, d8, zipalign, apksigner) and a JDK 17+: no Gradle,
# no Android Studio. Pass --install to also install the app on the running emulator or device.
set -euo pipefail
cd "$(dirname "$0")"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
BUILD_TOOLS="$SDK/build-tools/$(ls "$SDK/build-tools" | sort -V | tail -1)"
ANDROID_JAR="$SDK/platforms/$(ls "$SDK/platforms" | sort -V | tail -1)/android.jar"
MIN_SDK=26
TARGET_SDK=34

rm -rf build
mkdir -p build/gen build/classes build/dex

echo "Compiling resources..."
"$BUILD_TOOLS/aapt2" compile --dir res -o build/res.zip
"$BUILD_TOOLS/aapt2" link -I "$ANDROID_JAR" --manifest AndroidManifest.xml --java build/gen \
  --min-sdk-version "$MIN_SDK" --target-sdk-version "$TARGET_SDK" --version-code 1 --version-name 1.0 \
  -o build/unsigned.apk build/res.zip

echo "Compiling Java..."
javac --release 17 -nowarn -classpath "$ANDROID_JAR" -d build/classes $(find src build/gen -name '*.java')
"$BUILD_TOOLS/d8" --release --min-api "$MIN_SDK" --lib "$ANDROID_JAR" --output build/dex \
  $(find build/classes -name '*.class')

echo "Packaging..."
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BUILD_TOOLS/zipalign" -f 4 build/unsigned.apk build/aligned.apk

# Sign with the standard Android debug key (made here if Android Studio never made one)
KEYSTORE="$HOME/.android/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  KEYSTORE=build/debug.keystore
  keytool -genkeypair -keystore "$KEYSTORE" -storepass android -keypass android -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
fi
"$BUILD_TOOLS/apksigner" sign --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android \
  --ks-key-alias androiddebugkey --out build/demo-shop.apk build/aligned.apk

echo "Built demo-mobile-app/build/demo-shop.apk (package com.demoshop.mobile)"

if [ "${1:-}" = "--install" ]; then
  "$SDK/platform-tools/adb" install -r build/demo-shop.apk
fi
