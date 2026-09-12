# LOIN — Android build guide (macOS)

Every step, in order. Do not skip any.

---

## 0. What Capacitor is

Capacitor takes the built web app (plain HTML/CSS/JS in `dist/client`) and wraps
it inside a real Android app — a native Android project with a full-screen
WebView. That native project is where phone-locking powers later get added,
because only native Android code can do that.

---

## 1. Install the tools (Terminal on your MacBook)

Open **Terminal** (Cmd+Space → type `Terminal` → Enter).

1. Install Homebrew (skip if `brew -v` already prints a version):
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Install Node.js:
   ```
   brew install node
   node -v
   ```
   Must print v20 or higher.
3. Install Java 21 (Android Gradle needs it):
   ```
   brew install --cask temurin@21
   ```
4. Install Android Studio:
   ```
   brew install --cask android-studio
   ```
   Then open **Android Studio** from Applications. On first launch choose
   **Standard** setup and let it download the SDK. Finish the wizard.
5. Tell your shell where the Android SDK is. Run:
   ```
   echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator' >> ~/.zshrc
   source ~/.zshrc
   adb --version
   ```

---

## 2. Run the project

```
cd ~/Downloads/loin          # wherever you unzipped it
npm install
npm run build
```

Confirm the build produced the web files:
```
ls dist/client/index.html
```

---

## 3. Sync the Android project

The `android/` folder is already included in this project (with the
`app.loin.focus://auth/callback` deep link wired up for Google sign-in), so you
only need to copy the freshly built web assets into it:

```
npx cap sync android
```

Every time you change the web app afterwards, run:
```
npm run build && npx cap sync android
```
(or the shortcut `npm run android:sync`)

Note: `webDir` in `capacitor.config.ts` is `dist/client` — that is where the
build writes the prerendered, hydrating app, including `index.html`. Do not
point it at `.output/public`.

---

## 4. Open and run it

```
npx cap open android
```

Android Studio opens. Wait for "Gradle sync finished" at the bottom.

**On a real phone:**
1. On your Android phone: Settings → About phone → tap **Build number** 7 times.
2. Settings → System → Developer options → enable **USB debugging**.
3. Plug the phone into the MacBook, tap **Allow** on the phone.
4. In Android Studio, pick your phone in the device dropdown (top toolbar).
5. Click the green ▶ **Run** button.

**On an emulator:** Android Studio → Device Manager (right sidebar) →
**Create Device** → Pixel 7 → download a system image → Finish → ▶ Run.

---

## 5. Adding the real phone-locking powers

This is native Android work, done inside `android/` in Android Studio. Three
Android APIs do the job:

| Goal | Android API | Permission the user must grant |
| --- | --- | --- |
| Block other apps | `AccessibilityService` | Settings → Accessibility → LOIN → On |
| Read per-app screen time | `UsageStatsManager` | `PACKAGE_USAGE_STATS` special access |
| Stay on top / kiosk | `Screen pinning` or Device Owner | Settings → Security → App pinning |

Concrete order of work:

1. In Android Studio, open `android/app/src/main/AndroidManifest.xml` and add:
   ```xml
   <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
                    tools:ignore="ProtectedPermissions" />
   <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   ```
2. Create `LoinAccessibilityService.kt` extending `AccessibilityService`. In
   `onAccessibilityEvent`, read the foreground package name; if it is not in the
   whitelist, call `performGlobalAction(GLOBAL_ACTION_HOME)` and show the LOIN
   lock screen. Register it in the manifest with
   `android.permission.BIND_ACCESSIBILITY_SERVICE`.
3. Create `UsageStatsPlugin.kt`, a `@CapacitorPlugin`, that queries
   `UsageStatsManager.queryUsageStats(...)` and returns per-app milliseconds to
   the web layer. Call it from JavaScript with
   `import { registerPlugin } from '@capacitor/core'`.
4. Add an in-app onboarding screen that deep-links users to the two settings
   pages so they can grant consent:
   `Settings.ACTION_ACCESSIBILITY_SETTINGS` and
   `Settings.ACTION_USAGE_ACCESS_SETTINGS`.

Google Play requires a written justification for Accessibility use — declare it
as "device lockdown for user-initiated focus sessions" in the Play Console
Sensitive App Declaration, or the listing gets rejected.

---

## 6. Publishing to Google Play

1. Go to https://play.google.com/console → pay the one-time $25 → create a
   developer account.
2. In Android Studio: **Build → Generate Signed App Bundle / APK → Android App
   Bundle → Create new keystore**. Save the `.jks` file and its passwords
   somewhere safe — losing it means you can never update the app again.
3. Build the release `.aab`, found at
   `android/app/build/outputs/bundle/release/app-release.aab`.
4. In Play Console: **Create app** → fill store listing (name, description,
   screenshots, 512×512 icon, 1024×500 feature graphic) → **Production →
   Create new release** → upload the `.aab` → Review → **Start rollout**.
5. First review takes a few days. Accessibility apps are reviewed more closely.

---

## Note on the AI features

Goal validation and photo proof-checking run on LOIN's backend, not on the
phone. The packaged Android app calls the deployed backend over HTTPS, so the
device needs an internet connection for those two features. Timer sessions,
the ledger and streaks all work offline.
