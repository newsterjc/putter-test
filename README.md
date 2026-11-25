# Putter Test (Release 2 prototype)

Expo (SDK 58) app for running a head-to-head putter test with 2 or 3 putters.
Data stays on the phone (AsyncStorage). Export sends a CSV through the share sheet.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. For Android, Expo Go opens from the Expo CLI. For iPhone, see the note below.

## Screens (app/)

- `index.js`: setup (names, head length, advanced settings, Start, Simulate, Continue)
- `entry.js`: station entry (L/R and S/P steppers, Made, Save)
- `pattern.js`: putting pattern, verdict, averages by distance, export, edit, new test

## Logic (src/)

- `engine.js`: unchanged copy of the project's calculation engine (single source of truth)
- `logic.js`: replays saved putts through the engine, verdict, cut, simulate, CSV rows
- `TestContext.js`: shared state, saving, pop-ups, persistence
- `exportCsv.js`: writes the CSV and opens the share sheet
- `Pops.js`, `ui.js`, `theme.js`: shared UI pieces

## Rules built in

- 21 stations. With 3 putters, the worst putter (rank points after station 9) is cut.
- Verdict: final head-to-head at station 21, two-sided Wilcoxon signed-rank, winner if p < 0.10. Early stops are off.
- Units: putter heads (needs head length, 4 to 8 in) or inches. Units lock once real data is entered.
- Max miss 15 heads or inches.

## Not done yet

- Not tested on a physical phone (no device in the build environment).
- Lint not run (needs network access the build environment lacks).
- Test name placeholder "Deez-putts" on the setup screen (one line, easy to swap).
