# Theme recipes: 100 name card + 100 portfolio themes

The list is `themeRecipes.json`, the source of truth. Copies live in:

- **web:** `bizhub/src/namecard/themeRecipes.json`
- **API:** `bizhub-api/src/biz/namecard/themeRecipes.json`
- **app:** generated as `lib/features/namecard/recipes_data.dart`

Each theme is `{key, en, km, <part>: <option>}`. All 200 are premium, at the same price as the existing premium themes: `premium_theme` for cards and `portfolio_theme` for portfolios. The old themes stay as they are (18 card themes, 12 portfolio themes).

Colours always come from the owner colour `c`:

| Name | Card | Portfolio |
|---|---|---|
| `dark` | `shade(c,-35)` | `shade(c,-45)` |
| `light` | `shade(c,55)` | `shade(c,55)` |
| `soft` | `shade(c,88)` | `shade(c,90)` |

In this file, `a(X,n)` means colour X at opacity n.

Edge shapes are SVG paths in a 0..100 × 0..100 box, stretched to (width, E px). The filled area is what stays visible. The web uses them as a mask (`preserveAspectRatio="none"`). The app scales the same path.

| Shape | Path |
|---|---|
| wave | `M0 0H100V55C80 100 65 20 45 55S10 90 0 50Z` |
| arc | `M0 0H100V20Q50 140 0 20Z` |
| slant | `M0 0H100V10L0 100Z` |
| zig | `M0 0H100V40L90 100 80 40 70 100 60 40 50 100 40 40 30 100 20 40 10 100 0 40Z` |
| bowl | `M0 0H100V0C100 60 75 100 50 100S0 60 0 0Z` |
| tab | `M0 0H100V100H45C20 100 0 80 0 50Z` |

A shaped box has height H. It is a full rectangle for `H-E` px, then the edge shape fills the last `E` px.

## Patterns (shared by card `pat` and portfolio `pat`)

Patterns tile from the top-left corner of their layer. Lines are strokes; dots and bubbles are fills. Colour is P (see each part).

| Pattern | What it draws |
|---|---|
| none | nothing |
| dots | circle r=1.6 in an 18×18 tile, at (9,9) |
| grid | 1px lines every 24px, both directions |
| diag | 45° lines (bottom-left to top-right), 2px thick, every 14px (measured along x) |
| waves | sine rows every 18px. Amplitude 4, wavelength 28, stroke 1.4 |
| rings | concentric circles centred at (layerWidth-40, 60), radius 26, 52, 78 … up to 520, stroke 1.2 |
| bubbles | filled circles (cx as % of width, cy px, r px): (85%,40,70), (8%,260,46), (92%,420,34), (20%,540,22). Alpha is P's alpha × 1 |
| stars | 4-point sparkle in a 60×60 tile. Centres/sizes: (10,12,8), (38,30,5), (22,48,6). The shape is a 4-point star: points at ±size on each axis, inner waist at size×0.28 |
| confetti | 48×48 tile, rounded bars 8×3 (radius 1.5). Bar centres, rotation and colour: (8,10) 30° P1; (32,22) -40° P2; (18,38) 70° P3. P1/P2/P3 are listed under bg |
| tri | outline triangles in a 32×32 tile: (8,24) (16,10) (24,24), stroke 1.2 |
| plus | plus sign in a 26×26 tile, centre (13,13), arms ±4, stroke 1.4 |
| zigzag | zigzag rows every 20px. Period 16, amplitude 5 (points at y±2.5), stroke 1.4 |
| halftone | dot grid every 14px. Dot radius = 3.5 × max(0, 1 − dist/320), where dist runs from the layer's top-right corner |

## NAME CARD

Parts, in order: `bg pat hd hf ph al ct ft nm rl btn`.

Page structure: the same `nc` structure as today (`nc-fx` / `nc-cover` / `nc-body` …).

- **Web:** class `nc nc-r rb-<bg> rp-<pat> rh-<hd> rf-<hf> rph-<ph> ra-<al> rc-<ct> rt-<ft> rn-<nm> rr-<rl> rbt-<btn>`.
- **App:** a recipe renderer inside `nc_card.dart` (part file).

Base sizes are the same as the classic card:

- max width 420, radius 28, body padding 28 on the sides and 24 at the bottom
- photo 120, name 26 w800, role 15 w700, bio 14.5
- contacts 38px icons with a 16 tile radius and 12 icon radius

### bg (sets the tone T)

T is one of: **L** (light), **D** (dark), **C** (colour).

| bg | background | ink | muted | T |
|---|---|---|---|---|
| white | #ffffff | #16171b | #6a6e7a | L |
| cream | #f6efe3 | #2b2620 | #6f665b | L |
| paper | #fbfaf6, plus a frame (see below) | #23211c | #6a665c | L |
| slate | #e8ecf1 | #1d2430 | #5d6878 | L |
| tint | soft | #16171b | #5a5e6a | L |
| fade | linear 180°: soft 0% → #ffffff 55% | #16171b | #6a6e7a | L |
| color | c | #fff | a(#fff,.86) | C |
| grad | linear 160°: dark 0%, c 45%, light 100% | #fff | a(#fff,.88) | C |
| deep | dark | #fff | a(#fff,.8) | C |
| dark | #131418 | #f4f5f7 | #a3a7b3 | D |
| black | #050507 | #ffffff | #9a9cab | D |
| navy | #0d1530 | #eef2ff | #a8b3d6 | D |

- **paper frame:** a 1px border in a(c,.35), inset 10px, radius 20, drawn above the pattern and below the content.
- **Accent A** (role, icons, lines):
  - L: c
  - D: light
  - C: #fff
- **Pattern colour P:**
  - L: a(c,.14)
  - D: a(light,.16)
  - C: a(#fff,.14)
- **Confetti colours:**
  - L: P1 = a(c,.55), P2 = a(light,.8), P3 = a(dark,.45)
  - D/C: P1 = a(light,.6), P2 = a(#fff,.35), P3 = a(c,.7)
- **Photo border colour B:** the bg colour. Use #ffffff for fade and for grad.
- **The pattern layer** (`nc-fx`) covers the whole card (inset 0), above the background and below everything else.

### hd (the cover; heights H / edge E)

| hd | H | E / shape | Notes |
|---|---|---|---|
| band | 170 | flat | |
| tall | 230 | flat | |
| short | 110 | flat | |
| wave | 180 | 40 | wave edge |
| arc | 170 | 46 | arc edge |
| slant | 180 | 50 | slant edge |
| zig | 165 | 16 | zig edge |
| bowl | 190 | 70 | bowl edge |
| tab | 160 | 60 | tab edge |
| inset | 150 | flat | margin 14 14 0, radius 22 on all corners |
| none | — | — | no cover; the body gets padding-top 36 and the photo does not overlap |

- An uploaded cover image fills the same shape (background-size cover).
- Otherwise the cover is filled with **hf**.
- The photo overlaps the cover by half its height (margin-top −size/2), except for `none`.

### hf (cover fill when there is no cover image)

| hf | fill |
|---|---|
| grad | linear 135°: c → light |
| solid | c |
| deep | linear 135°: dark → c |
| mesh | c, plus radial light at 20% 30% (radius 60%, light → transparent), plus radial dark at 85% 80% (radius 55%) |
| soft | soft |
| stripe | c with repeating 45° stripes: a(light,.5) for 0–6px, transparent for 6–12px |
| duo | linear 90°: dark 0–50%, c 50–100% (hard stop) |

### ph (photo frame)

Default size is 120, with a B border of 5. With no photo, the background is soft and the initial is dark, w800 48.

| ph | frame |
|---|---|
| circle | round |
| round | radius 28 |
| square | radius 6 |
| squircle | radius 44 |
| hex | polygon 50,0 93,25 93,75 50,100 7,75 7,25 (in %). Outer shape filled with B, the picture inset 5px with the same polygon. Drop shadow 0 8 24 a(#000,.12) |
| diamond | size 132, polygon 50,0 100,50 50,100 0,50. Same border technique as hex (inset 6) |
| octa | polygon 30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30. Same as hex |
| ring | size 112, round, no border. Ring of a 4px gap in the bg colour (B), then 3px in A (box-shadow 0 0 0 4px B, 0 0 0 7px A) |
| tilt | radius 18, border 6 #ffffff, rotated −4°, shadow 0 14 30 a(#000,.22) |
| arch | 120 × 140, radius 60 60 12 12, border 5 B |
| blob | elliptical radii 58% 42% 55% 45% / 45% 55% 45% 55%, border 5 B |

The app uses `BorderRadius.only` with `Radius.elliptical(w*.58,h*.45)` and so on, clockwise from top-left: tl (58%, 45%), tr (42%, 55%), br (55%, 45%), bl (45%, 55%).

### al (alignment)

- **c:** centred.
- **l:** body items and text aligned left.

### ct (contact rows)

| ct | tile | icon box |
|---|---|---|
| soft | L: soft · D: a(#fff,.07) · C: a(#000,.16) | bg c, ink #fff (C: bg #fff, ink c) |
| outline | transparent, border 1.5 a(ink,.14), radius 14 | L: soft / dark · D: a(#fff,.08) / light · C: a(#fff,.18) / #fff |
| line | transparent, radius 0, padding-left 0, bottom line 1 a(ink,.12) | no bg, ink A |
| solid | L/D: c · C: dark; text #fff, label opacity .75 | bg a(#fff,.2), ink #fff |
| glass | L: a(#fff,.7) + border 1 a(ink,.08) · D/C: a(#fff,.12) + border 1 a(#fff,.2); radius 18 | bg c, ink #fff (C: #fff / c) |
| shadow | L: #fff · D: #1d1f26 · C: #fff (text #16171b); shadow 0 6 18 a(#000,.08) (D: a(#000,.35)) | L/C: soft / dark · D: c / #fff |
| bar | L: a(ink,.04) · D/C: a(#fff,.06); left border 4 A, radius 8 | no bg, ink A |
| pill | like soft, radius 999, padding 6 18 6 6 | icon radius 999 |

Extras (the dashed box) and the bio keep the base look, using the ink and muted colours.

### ft (font)

| ft | font | name | role |
|---|---|---|---|
| sans | Plus Jakarta Sans | 26 w800 | |
| serif | serif for all card text (app: `_serif`) | 30 w600 | w500 |
| mono | monospace for all card text (app: `_mono`) | 23 w700 | |
| display | sans | 30 w800, uppercase, letter-spacing .04em (Khmer: no uppercase, spacing 0) | |
| light | sans | 32 w400, letter-spacing −0.02em | w500 |

### nm (name accent)

| nm | look |
|---|---|
| plain | no accent |
| bar | a 36×4 bar (radius 2) in A under the name, margin-top 8. Left-aligned when al = l, else centred |
| grad | gradient text, left to right. L: dark → c · D/C: #fff → light |
| glow | text-shadow 0 0 8 G and 0 0 22 G, where G = c (C: a(#fff,.55)) |
| mark | highlighter band behind the bottom 38% of the text line. L: a(c,.3) · D: a(light,.35) · C: a(#fff,.25) |
| shadow | hard shadow offset 3,3, blur 0. L: a(c,.45) · D: c · C: dark |

### rl (role line)

The role colour R is: L → c, D → light, C → a(#fff,.92).

| rl | look |
|---|---|
| text | R, 15 w700 |
| pill | bg c and #fff text (C: bg #fff, text dark), padding 4 12, radius 999, 14 w700 |
| tag | transparent, border 1.5 R, text R, padding 3 12, radius 999, 13.5 w700 |
| caps | R, uppercase, 12 w700, letter-spacing .16em (Khmer: normal case, 14, spacing 0) |
| dash | `—  role  —`: the dashes in R, the role in muted, w600 |
| slash | a `/ ` prefix in R w800, then the role in ink w600 |

### btn ("View portfolio")

| btn | look |
|---|---|
| pill | bg c and #fff text (C: bg #fff, text dark), radius 999, height 50 |
| square | the same, radius 10 |
| outline | transparent, border 2 A, text A, radius 999 |
| grad | linear 90°: dark → light, text #fff, radius 999 (C: #fff → soft, text dark) |

## PORTFOLIO

Parts, in order: `bg hero hs hl pat ph sec h2 tl chip ft`.

- **Web:** class `pf pf-t-<key> pf-r qb-<bg> qh-<hero> qs-<hs> ql-<hl> qp-<pat> qph-<ph> qc-<sec> qt-<h2> qtl-<tl> qch-<chip> qf-<ft>` on the same `.pf` structure.
- **App:** a recipe path in `pf_view.dart`.

### bg (page palette)

T is **L** or **D**.

| bg | page | paper (sections) | ink | muted | line | T |
|---|---|---|---|---|---|---|
| light | #f4f5f8 | #fff | #15161a | #646a78 | #e9ebf0 | L |
| white | #fff | #fff | #15161a | #646a78 | #e6e8ee | L |
| cream | #f3ede2 | #fbf8f2 | #2b2620 | #6f665b | #e6dccb | L |
| slate | #e6eaf0 | #f8fafc | #1d2430 | #5d6878 | #d5dce6 | L |
| tint | soft | #fff | #15161a | #646a78 | shade(c,75) | L |
| dark | #0f1115 | #171a21 | #eef0f4 | #9aa1ae | #262a33 | D |
| black | #050507 | #0e0e12 | #fff | #8e909c | #1f1f26 | D |
| navy | #0b1226 | #121b36 | #eef2ff | #a3aed0 | #22305a | D |
| warm | #17130f | #211b15 | #f6efe6 | #b3a594 | #352c22 | D |

- Accent A: L → c, D → light.
- Body text (about, descriptions) uses the ink colour at .85 opacity.

### hero (fill)

| hero | fill |
|---|---|
| grad | linear 135°: dark 0%, c 70%, light 130% |
| solid | c |
| deep | linear 135°: dark → c |
| mesh | c, plus radial light at 15% 20% (radius 55%), plus radial dark at 90% 90% (radius 60%) |
| duo | linear 90°: dark 0–50%, c 50–100% (hard stop) |
| stripe | c with repeating 45° stripes: a(light,.35) for 0–10px, transparent for 10–22px |
| soft | soft. Text in ink #15161a |
| plain | transparent (the page shows through), text in ink, bottom border 1 line |

- **Coloured heroes** (all except soft and plain):
  - text #fff;
  - contact chips are white glass, as today.
- **soft and plain heroes:**
  - text ink, role in A;
  - chips are transparent with a line border and ink text.
- **Pattern** in the hero layer:
  - coloured hero: a(#fff,.14);
  - soft/plain on L: a(c,.14);
  - plain on D: a(light,.16).

### hs (bottom edge of the hero)

| hs | E |
|---|---|
| flat | — |
| wave | 56 |
| arc | 56 |
| slant | 56 |
| zig | 18 |
| bowl | 56 |

- The hero's inner padding-bottom becomes 56 + E.
- **Main area:** margin-top −28 only when hs = flat and the hero is coloured; otherwise +8.

### hl (hero layout)

- **center:** as the classic portfolio.
- **left:** text left-aligned, contacts start-aligned. When the box is ≥ 720px wide, the photo sits left of the text in a row.

### ph (photo frame)

The same frames as the card, at size 120.

- **B (border colour):** a(#fff,.85) on a coloured hero; on soft/plain it is the paper colour.
- **ring:** the ring colour is #fff on a coloured hero, A otherwise.
- **No rotation:** unlike the classic portfolio, the photo is not rotated, except for tilt.

### sec (section box)

| sec | box |
|---|---|
| card | paper, radius 24, shadow 0 10 30 a(#16171b,.06) (D: a(#000,.35)) |
| flat | transparent, radius 0, padding 26 4, bottom border 1 line; the main gap is 0 |
| outline | paper, border 1.5 line, radius 16, no shadow |
| bar | paper, radius 14, left border 5 c, shadow 0 6 18 a(#000,.05) (D: none) |
| tinted | L: soft · D: a(c,.12) over paper; radius 22, no shadow |
| brutal | paper, radius 4, border 2 ink, shadow 5 5 0 ink (D: shadow 5 5 0 c) |
| glass | L: a(#fff,.6) + border 1 a(#fff,.8) · D: a(#fff,.05) + border 1 a(#fff,.1); radius 22, backdrop blur 10 |

### h2 (section title)

| h2 | look |
|---|---|
| icon | as today: an icon chip in soft / dark (D: a(c,.18) / light) |
| caps | no icon, uppercase 12.5 w800, letter-spacing .14em, colour A (Khmer: 15, normal case) |
| under | no icon, 20 w800, with a 40×4 A bar under it (radius 2, margin-top 8) |
| num | no icon; a "01", "02" … counter (section order) in A, 14 w800, then 10px, then the title at 18 w800 |
| pill | the title inside a pill: bg c, #fff text, 13 w800, padding 6 14, radius 999; the icon is white and inline |

### tl (experience and education timeline)

| tl | look |
|---|---|
| dots | as today. The dot is filled with paper; on D the ring is a(c,.25) |
| bars | no dots and no line; each item has a left border 3 c, padding-left 14, and 18 between items |
| cards | no dots and no line; each item has bg a(ink,.04), radius 14, padding 14, and 10 between items |

### chip (skills)

| chip | look |
|---|---|
| soft | as today (D: bg a(c,.18), text light) |
| outline | border 1.5 A, text A, transparent, radius 999 |
| solid | bg c, text #fff, radius 999 |
| square | radius 6, soft bg (D: a(c,.18)), text dark (D: light), left border 3 c |
| hash | transparent, border 1 line, radius 999, ink text, a "#" prefix in A |

### ft (font)

Fonts apply to the h1 and the h2 titles. serif and mono apply to the whole page.

| ft | font | h1 |
|---|---|---|
| sans | sans | 32 w800 |
| serif | serif | 36 w600 |
| mono | mono | 28 w700 |
| display | sans | 34 w800, uppercase, .04em (Khmer: none) |
| light | sans | 38 w400, −0.02em |

## Galleries

- **Filters:** All · Light · Dark · Colour · Serif (`ft = serif`) · Mono (`ft = mono`) · Owned.
  - Card: Light = bg L, Dark = bg D, Colour = bg C.
  - Portfolio: Light = bg L, Dark = bg D, Colour = hero not soft/plain.
- **Free and old themes** still come first.
- **Show more:** the 100 new themes are split into chunks of 24.
