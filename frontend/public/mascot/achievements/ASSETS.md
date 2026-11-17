# Showing up mascot badges
Six poses provided by the user in Fox Mascot Achievement Badge Collection.png. Cleaned with the built-in image generation tool, then sliced into individual transparent WebP assets. Original source remains untouched.
Prompt: Preserve all six poses, identity, clothing and props; remove noisy edge halos and stray pixels; output clean transparent cutouts in the original 3-by-2 order with generous gutters.
Ordering: first calendar / rising chart / thumbs-up calendar / checklist / fire / trophy champion.
Badge frames are rendered in achievement-emblem.tsx.

## Prepared category slots
achievementMascots in frontend/components/achievement-emblem.tsx accepts six paths per category, in rank I–VI order. Until the user supplies artwork, category icons occupy those same image slots; no replacement mascots are invented.
- consistency: blue shield (six fox assets already installed).
- tasks: gold rosette.
- training: orange hexagon.
- nutrition: purple medallion.
- journal: pink octagonal crest.
All frames use section-colored bevels, progressively layered rims and ribbons, and shared centered sizing. Share-card exports automatically embed each supplied raster into the SVG before PNG generation.
## Small wins mascot sheet
User-supplied fox_small_wins_transparent_sheet.png sliced directly without generation or redrawing; original preserved. Six transparent WebP assets small-wins-1.webp through small-wins-6.webp follow reading order: first task, momentum, gear, 100 tasks, regular checklist, 500 trophy. Existing gold rosette frames provide rank progression.

## Training mascot sheet
User-supplied Chibi Fox Training Achievement Stickers.png sliced directly, preserving artwork and alpha; original unchanged. Assets training-1.webp through training-6.webp map in reading order to 1, 5, 10, 25, 50, and 100 completed workout days. Existing orange hexagon frames and glow remain.

## Food logging mascot sheet
User-supplied Food Logging Fox Achievement Stickers.png sliced directly, preserving artwork and transparency; original unchanged. Assets food-logging-1.webp through food-logging-6.webp follow reading order for 1, 10, 25, 50, 100, and 250 food entries. Purple medallion frames and orange glow remain.

## Your journal mascot sheet
User-supplied Wellness Journal Fox Achievement Stickers.png sliced directly with artwork and transparency preserved; original unchanged. Assets journal-1.webp through journal-6.webp follow reading order for 1, 3, 7, 14, 30, and 60 journal days. Existing pink octagonal frames and orange glow remain.

## Your journal mascot sheet
User-supplied Wellness Journal Fox Achievement Stickers.png sliced directly with artwork and transparency preserved; original unchanged. Assets journal-1.webp through journal-6.webp follow reading order for 1, 3, 7, 14, 30, and 60 journal days. Existing pink octagonal frames and orange glow remain.
