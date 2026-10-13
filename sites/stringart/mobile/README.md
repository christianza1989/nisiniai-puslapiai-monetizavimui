# MemoryString local creator

Android-first, English interface and narration. Retail/distributor websites and the partner platform are paused under the owner's app-first priority. This directory contains the self-contained creator, pinned MIT solver and native Android wrapper. See ACCEPTANCE.md for source-bound checks and limits. The local test APK compiled, installed and launched on the authorized USB phone; complete phone, frame and machine acceptance remain unverified. The selected 22-screen design and prepared asset pack are in [design/](design/README.md); the new layouts have not yet replaced this prototype.

## Local browser build

Node 24, no npm dependencies:

    node build.mjs
    node --test acceptance.test.mjs
    node serve.mjs

Open the printed loopback URL. Generated output/MemoryString.html contains the solver, styles and licence with no network dependencies. This single file is also copied to Android assets. Direct browser-file storage and speech can vary by browser; the localhost route was tested. Close the owned preview server when finished.

Browser narration uses an available installed/local English voice. Android uses installed offline TextToSpeech voices and the system document picker. There is no INTERNET, microphone, camera or broad-storage permission. Photos and full project state stay local. Clearing app/browser data removes projects; export JSON backups from My projects.

## Android build

The owner authorized official SDK installation and terms for this build. Current local tooling: SDK platform 35, Build Tools 35.0.0, Platform Tools 37.0.1, JDK 21 and Gradle 8.9; AGP 8.7.3 compiles Java 17. No Android Studio is required. On another machine install licensed official tooling and set an ignored android/local.properties sdk.dir.

Generate the HTML first. In android/, with JAVA_HOME set to the JDK, run:

    gradle --no-daemon --console=plain :app:assembleDebug

This machine's Gradle executable is C:/Users/Lenovo/.cache/memorystring-android-tools/gradle/gradle-8.9/bin/gradle.bat; the SDK is under the same task cache's sdk/. Java is C:/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot. Tool locations and debug keys are not portable source or credentials for a production release.

The resulting app/build/outputs/apk/debug/app-debug.apk is a signed local test package, Android 8+ (min SDK 26), target/compile SDK 35. Use a phone's normal file/install flow to test it; this session does not enable unknown-source settings or publish to Play. It is not a production/store release.

## Project format and rights

JSON retains exact frame, numbering, full layers and completed-step count. Imported projects receive new IDs. This is not an ALINEDECO/NOVA machine file or proof that the proposed frame/thread matches a real kit.

Upstream notice and pinned source: vendor/PROVENANCE.md and vendor/LICENSE-TrevorPeters0n.txt. Only Trevor's solver was copied. Our UI/guide use no competitor pictures, branding, fonts or GPL source. Algorithm pixel-error tests do not replace actual portrait/kit validation.
