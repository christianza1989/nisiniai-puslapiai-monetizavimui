# MemoryString local creator

Android-first, English interface and English offline narration. The owner's warm ivory / forest / copper design is now implemented with live controls, actual solver output and the prepared assets. The local creator is separate from the future partner platform and a production/store release. See [ACCEPTANCE.md](ACCEPTANCE.md) for tested paths and limits.

## Features

- Local photo crop, pan, zoom, rotation, brightness and contrast.
- Declared 42/50/60 cm presets with 200/240/300 pins, monochrome or four separate CMYK thread layers, and actual connection/thread estimates.
- Cancellable computation, original/preview comparison, saved projects, rename, delete confirmation and exact JSON backups.
- A compact guide with large pin values, complete text instructions and saved completed counts.
- Installed offline English voices, repeat, rate and post-speech pause. Manual changes, navigation, app backgrounding and colour boundaries cancel obsolete narration.
- Explicit thread-ready confirmation at every colour layer and when resuming a colour project.
- Settings, frame help, support address, full MIT/OFL licence notices and recoverable errors.

Photos and projects stay local. Clearing app/browser data removes projects; export backups first. The application requests no INTERNET, microphone, camera or broad-storage permission. A support button opens a mail composer only on request; it sends no message automatically.

## Browser build

Node 24; no npm dependencies for the app build:

    node build.mjs
    node --test acceptance.test.mjs
    node serve.mjs

The printed loopback URL serves output/MemoryString.html. That portable file embeds 17 runtime images/fonts, 45 SVG icons, the solver, notices, styles and controller without network dependencies. It is larger than the native HTML because its binary assets use data URIs. Direct-file storage and installed browser voices depend on the browser; localhost is the tested route.

## Android build

Generate assets/HTML first. In android/, with JAVA_HOME and the official SDK configured:

    gradle --no-daemon :app:assembleDebug

Current tooling: SDK 35 / Build Tools 35.0.0, Platform Tools 37.0.1, AGP 8.7.3, Gradle 8.9 and JDK 21 compiling Java 17. The owner approved SDK installation and terms. On another machine install official licensed tools and set the ignored android/local.properties sdk.dir.

The normal signed debug APK is app/build/outputs/apk/debug/app-debug.apk, version 0.2.0-device-test, Android 8+. It excludes the device instrumentation runners. Android serves packaged assets at a local intercepted HTTPS origin; external HTTP requests are blocked. This is a local test distribution, not Play publication or a production signing setup.

## Owned-device acceptance runner

For a connected, authorized and unlocked test phone, build with the explicit diagnostic flag:

    gradle --no-daemon -PmemorystringDeviceQa :app:assembleDebug

This includes the src/androidTest journeys and src/deviceQa manifest in the debug APK, avoiding a separate helper application on phones which reject its installation. It grants no extra app permissions. Run AppJourney and FileJourney through adb am instrument against lt.pinet.memorystring.demo. These journeys operate MemoryString and owned test backups only; provider selection uses actual native touch events. Reports, device screenshots and native speech waveform are private in files/qa-current and excluded from Git.

Build/install the normal APK without that flag after testing. Diagnostic runners are never included in the delivered package. The tests create a labelled sample project and a short synthetic colour-boundary fixture; the latter is deleted by its exact owned ID. Existing projects are preserved.

## Project format and rights

JSON retains the exact declared frame, clockwise top-pin numbering, all layer paths and completed count. Imports receive new local IDs. It is not an ALINEDECO/NOVA machine file, kit activation record or proof of material compatibility. Frame/thread settings require a physical pilot before customer promises.

On Android, JSON imports read only the explicitly selected document through a bounded 400 KB native stream. This avoids stale provider size metadata; the same strict schema importer validates browser and native text. Native export/import preserves the exact path and completed position in the tested round-trip.

Only Trevor's pinned MIT solver is copied; vendor/PROVENANCE.md and its notice record the source. Fonts retain their OFL notices. The app uses our own SVG icon/brand work and separately generated illustrative assets. The decorative home portrait is not a claim about actual solver quality. All 22 screen references and raster prompts remain in [design/](design/README.md).
