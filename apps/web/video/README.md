# Use-case videos

The three videos in the home page's "Who it's for" section (`components/UseCases.tsx`) are rendered
from `use-cases.html`, one 14 s scene per case on a 1280×720 stage:

| Case | Audience (from the grant proposal) | Story |
|---|---|---|
| `newsroom` | journalists and newsrooms | photo stamped at capture → printed with its code and QR → a reader checks it |
| `evidence` | human-rights documenters, citizen reporters | video stamped as it is filmed → two Filecoin copies proven every day → checked years later |
| `viral` | public figures and creators | stamped photo → copies spread, one edited → Explorer finds the original and marks the change |

Everything moves through CSS animations. `render.mjs` pauses them and steps every animation to each
frame's time, so the output is exact and repeatable:

```sh
node video/render.mjs            # all three → public/use-cases/<case>.mp4, .webm, .jpg (poster)
node video/render.mjs viral      # one case
SCALE=1 node video/render.mjs    # 1280×720 instead of 1920×1080
```

It needs Playwright's Chromium and `ffmpeg` with libx264 and libvpx-vp9. Open
`use-cases.html?case=newsroom` in a browser to watch a scene live while editing it.

Codes, names and the newspaper are illustrations. The harbour photo is the Calibration demo stamp
T1AQ-QJ5V-3, and `assets/harbour-edited.jpg` is the edited copy the Explorer's example uses. Captions
follow the site's copy rules: none of the banned words in `@stamper/core` (verified, authentic, real,
same, matches, identical).
