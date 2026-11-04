# ATLETIKA Visual Assets

## Included
- `illustrations/`: crops of the approved reference artwork for the planche athlete, right-running athlete, push-up bars, and settings gears.
- `icons/svg/` and `icons/png/`: individual icons in black and cream variants: dumbbell, history, settings, edit pencil, reset, delete, menu, plus, minus, pause, play.
- `backgrounds/`: a red diagonal accent with transparency, plus a full black/red poster-style background reference.
- `previews/assets_overview.jpg`: visual contact sheet.

## Important notes
1. The four illustration files are crops from the original approved screen images. They retain the surrounding red/cream/black graphic background. They are not transparent character cut-outs.
2. The original red-diagonal source preview had a checkerboard pattern baked into its RGB pixels. The included `red_diagonal_accent_transparent.png` was isolated from the red shape and has actual alpha transparency. Inspect it before production use.
3. The icon SVGs are newly drawn vector assets based on the visual language of the app, not pixel-perfect crops from the screenshots. Black variants are for cream/light surfaces; cream variants are for dark surfaces.
4. Keep the original reference screenshots as the source of truth for visual composition.

## Fonts
The mockup screenshots are flattened raster images. No editable font files or font-family metadata were embedded, so the exact fonts used to render the mockup lettering cannot be reliably identified.

Recommended Cyrillic-capable font pairing for implementation:
- **Oswald** (Bold / SemiBold) for large condensed headings and CTA labels.
- **Roboto Condensed** (Regular / Medium / Bold) for body text, labels, and compact metadata.

Verify Cyrillic glyph coverage (`А–Я`, `а–я`, `Ё`, `ё`) in the actual font files bundled with the app. These are recommendations, not a claim that those fonts were used to generate the mockup screenshots.
