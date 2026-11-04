# Typography Guidelines

## 1. General Requirements

Typography is an essential part of ATLETIKA's visual identity. The application should use a bold, athletic, high-contrast typographic style.

The visual direction is based on tall, narrow, condensed letterforms, strong uppercase headings, and clear text hierarchy.

**The entire application UI must be in Russian.**

All fonts must fully support the Cyrillic character set, including:
- Uppercase Russian letters: А–Я
- Lowercase Russian letters: а–я
- Ё and ё
- Russian punctuation marks
- Numbers and common interface symbols

Do not use fonts that lack Cyrillic support. Never allow missing glyphs, incorrect character substitution, or inconsistent fallback fonts.

## 2. Primary Display Font: Oswald

**Font family:** Oswald  
**Recommended weights:**
- Bold (700)
- SemiBold (600)

**Usage:**
- Main screen headings
- Section titles
- Training day titles
- Large numerical values
- Primary and secondary button labels
- Important short labels and navigation headings

Oswald should create the application's distinctive condensed athletic appearance.

Use uppercase lettering for major headings and prominent action labels wherever appropriate.

Avoid using Oswald for long paragraphs or dense explanatory text.

## 3. Secondary Font: Roboto Condensed

**Font family:** Roboto Condensed  
**Recommended weights:**
- Regular (400)
- Medium (500)
- Bold (700)

**Usage:**
- Body text
- Exercise names and descriptions
- Form labels and input fields
- Training set information
- Repetition and rest-time values
- Secondary navigation labels
- Small metadata and supporting information

Roboto Condensed should provide good readability while maintaining the narrow typographic character of the application.

## 4. Typography Hierarchy

Use the following hierarchy as a starting point. Adjust sizes responsively to the actual device dimensions.

| UI Element | Font | Weight | Style |
|---|---|---|---|
| Main screen title | Oswald | Bold | Uppercase |
| Section heading | Oswald | Bold | Uppercase |
| Training day title | Oswald | Bold | Uppercase |
| Primary button | Oswald | Bold | Uppercase |
| Secondary button | Oswald | Bold | Uppercase |
| Exercise name | Roboto Condensed | Bold | As appropriate |
| Body text | Roboto Condensed | Regular | Sentence case |
| Input labels | Roboto Condensed | Medium | Sentence case |
| Supporting information | Roboto Condensed | Regular | Sentence case |
| Small numerical data | Roboto Condensed | Bold | As appropriate |

## 5. Implementation Requirements

1. Bundle the actual font files with the application instead of relying on system-installed fonts.
2. Use consistent font weights throughout the application.
3. Verify that every font file includes complete Cyrillic glyph coverage.
4. Test all screens using real Russian interface text.
5. Pay special attention to the letters `Ё` and `ё`.
6. Avoid excessive letter spacing in Russian text, especially in small labels.
7. Prevent text clipping and unexpected line wrapping on narrow mobile screens.
8. Use the same typography tokens across all screens and reusable components.
9. Do not use multiple unrelated font families.
10. Do not render interface text as images.

## 6. Important Design Principle

The application should feel bold and athletic without sacrificing readability.

Use **Oswald** to establish the visual identity and **Roboto Condensed** to keep the interface readable and functional.

The recommended font pairing is:

- **Oswald Bold / SemiBold** for display typography and buttons.
- **Roboto Condensed Regular / Medium / Bold** for interface text and supporting information.

These are recommended implementation fonts. The original reference screenshots are flattened images, so their exact original font metadata is unavailable.
