# Woodland Survival Craft — SPEC

## Concept
A top-down 2D survival crafting game, styled like Minecraft. You play as a lumberjack
who spawns in a forest with an axe. You chop trees, hunt animals, mine stone and coal,
and craft tools and shelter. You build up your base step by step: tent and campfire first,
then a bed, walls and stone tools.

- The pickaxe mines coal and stone to make better tools.
- When hungry, you lose one health every few seconds.
- You need coal to make a campfire and to cook meat.

## Design rules (for a neurodivergent young player)
- Clean screens, few elements.
- No flashing, no sounds, no sudden movements. Day and night change slowly.
- Messages are short, simple and literal. They fade out slowly.
- A "Goal" box always says what to try next.

## SPEC 1 · STORY
No story for now.

## SPEC 2 · WORLD
- Forest, 90 × 90 squares, with a wall of trees around the edge.
- The camera stays centred on the player.
- Trees, groups of grey rocks (some with dark coal spots), and animals.
- Trees grow back slowly, far away from you. New animals appear far away.
- Day and night: 4 minutes of day, 2 minutes of night. Evening and morning change slowly.
  At night the forest gets darker. Campfires and torches glow. There is a small light around you.

## SPEC 3 · MECHANICS

**Controls**

| Key | What it does |
|---|---|
| W A S D / arrows | Walk |
| F | Chop trees, mine rocks, hunt animals, break things you placed |
| Space | Small jump (just for fun) |
| 1 – 0 | Choose a hotbar slot |
| Q | Place the chosen item on the square in front of you |
| R | Eat the chosen food · sleep when facing a bed or tent |
| E | Inventory and crafting (the game pauses) |
| H | Show or hide the controls |

**Screen**
- Top-left: 10 hearts (health) and 10 roast chickens (hunger), and the Goal box.
- Top-right: a round day/night clock (like Minecraft), "Day N" and "Daytime / Night is coming / Night / Morning soon".
  The controls box (H) is under the clock.
- Bottom centre: the hotbar, 10 slots, with numbers.

**Health and hunger**
- You lose 1 chicken every 40 seconds.
- With 0 chickens, you lose 1 heart every 5 seconds.
- With 8 or more chickens, you get 1 heart back every 8 seconds.
- Raw meat gives 2 chickens. Cooked meat gives 5.
- With 0 hearts you faint. You wake up at your bed (or the start) with all your items.

**Inventory (E) — like Minecraft**
- Crafting grid at the top, 20 backpack slots, then the same 10 hotbar slots.
- Click a slot to pick up, click another to put down (or swap / stack).
- Drag: press on a slot, move, let go on another slot to drop the items there.
- Holding items, drag across several slots to share them out
  (left button: share evenly, right button: one in each).
- Right-click: put down one item, or pick up half a stack.
- Shift + click: move a stack between hotbar and backpack. Shift + click the result: craft as many as you can.
- Most items stack to 64. Tools stack to 1.
- "Recipes" button: a book with the shape of every recipe.

**Crafting** — 2 × 2 grid normally, 3 × 3 next to a crafting table. The shape matters.

| Makes | Recipe | Where |
|---|---|---|
| 4 planks | 1 wood | anywhere |
| 4 sticks | 2 planks, one above the other | anywhere |
| Crafting table | 4 planks in a square | anywhere |
| 4 torches | coal above a stick | anywhere |
| Wooden pickaxe | 3 planks on top, 2 sticks down the middle | table |
| Stone pickaxe | 3 stone on top, 2 sticks down the middle | table |
| Stone axe | stone + sticks in an axe shape | table |
| Stone sword | 2 stone above a stick | table |
| 6 wooden walls | 6 planks (2 rows of 3) | table |
| 6 stone walls | 6 stone (2 rows of 3) | table |
| Tent | 4 wool in a roof shape + 2 sticks as legs | table |
| Bed | 3 wool on top of 3 planks | table |
| Campfire | sticks, 1 coal, 3 wood | table |
| Cooked meat | 1 raw meat | next to a campfire |

**Breaking things (F)**

| Thing | Hits (basic tool) | Needs | Drops |
|---|---|---|---|
| Tree | 3 | axe (you always have one) | 1 wood |
| Stone rock | 4 | pickaxe | 1 stone |
| Coal rock | 5 | pickaxe | 1 coal |
| Things you placed | 1 – 4 | axe (stone wall: pickaxe) | the item back |

- Stone tools are twice as strong: fewer hits.
- Edge-of-world trees cannot be chopped.

**Animals** — they walk slowly and calmly and do not run away.

| Animal | Hits (basic axe) | Drops | In the forest |
|---|---|---|---|
| Rabbit | 1 | 1 meat | 10 |
| Deer | 4 | 4 meat | 8 |
| Sheep | 5 | 2 wool + 1 meat | 10 (3 start near you) |
| Moose | 8 | 8 meat | 4 |

A stone sword (or stone axe) hunts with power 2, so big animals need fewer hits.

**Placing (Q)**: crafting table, tent, bed, campfire, torch, wooden wall, stone wall.
**Sleeping (R)**: face a bed or tent in the evening or at night. The screen fades slowly,
the night passes, and you wake up in the morning. That bed or tent becomes your home.

**Drops** lie on the ground. Walk near them and they slide to you. If your inventory is full,
they stay on the ground.

**Saving**: the game saves itself in this browser every 15 seconds and when you close it.
"Start a new world" (in the H controls box) asks once more, then starts a fresh forest.

## How we work
1. These specs live in this file (SPEC.md).
2. The game is built in separate modules so one can change without breaking the others.
3. All numbers (speeds, amounts, hits, times, recipes) live together in `CONFIG`
   at the top of `index.html`.
4. Anything new that is not decided: suggest a simple option and ask.
5. After every change, check the game still matches this SPEC.

## Technical
- One HTML file (`index.html`) with JavaScript. No external dependencies.
- Modules: `CONFIG`, `Story`, `World`, `Animals`, `Drops`, `Time`, `Inventory`, `Crafting`,
  `Mechanics`, `Icons`, `Hud` + `Goals` + `Hotbar`, `InventoryScreen`, `Screens`, `Save`, `Game`.

## Progress log
- Step 1 — The lumberjack walks around a forest. The camera follows him.
- Step 2 — F chops trees and hunts. Space jumps.
- Step 3 — Drops you pick up by walking near them. Inventory and crafting.
- Step 4 — Rabbit, deer, sheep and moose with their own hits and drops.
- Step 5 — Minecraft-style hearts, hunger, hotbar, inventory screen and crafting grid.
- Step 6 — Full game: day/night with a clock, hunger and health working, eating, cooking,
  stone and coal, stone tools, torches, walls, sleeping, fainting, goals, drag-and-drop
  in the inventory, saving. Q places, R eats and sleeps. Grass marks that looked like
  cobwebs were removed.
