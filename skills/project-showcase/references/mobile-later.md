# Mobile capture (not built)

Planned approach for Expo and native apps, so the result drops into the same `docs/media/` folder and manifest. Nothing here exists yet; build it when a mobile project needs a showcase.

## If the app has an Expo web target

Capture it with the existing script: run `npx expo export --platform web` and serve `dist/`, or use `npx expo start --web`, then point `serve` at it with only the `mobile` viewport. This shows layout and flows, but not native controls, gestures or haptics. Say so in the README caption ("web build").

## Native capture

- **Driver:** [Maestro](https://maestro.mobile.dev) flows (`.maestro/<id>.yaml`) drive both the iOS simulator and the Android emulator from one script, and play the role `flows[].run` has on the web. Each flow id matches a manifest id.
- **Screenshots:** Maestro `takeScreenshot: screens/<id>-mobile-<theme>` at the step where a shot belongs. Set the theme per run with `xcrun simctl ui booted appearance dark|light` on iOS or `adb shell cmd uimode night yes|no` on Android.
- **Clips:** record the device screen around each flow with `xcrun simctl io booted recordVideo` (MP4) or `adb shell screenrecord` (MP4). Convert to `clips/<id>.webm`, `clips/<id>.gif` and a poster with a full ffmpeg (palettegen/paletteuse for the GIF). The trimmed Playwright ffmpeg cannot read MP4.
- **Status bar:** pin a clean status bar before capture (`xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100`; Android demo mode).
- **Manifest:** a small writer that emits the same schema with `viewport: "ios"` or `"android"`, so READMEs and the portfolio use mobile items with no special cases. Reuse `staleFiles` and `mergeItems` from `scripts/capture-lib.mjs`.
- **Device frames:** keep raw captures in the manifest. Framing is a presentation choice for the explainer, so do it at display time.
