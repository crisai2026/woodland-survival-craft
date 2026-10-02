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
- Trees, groups of grey rocks (some with dark coal spots or orange iron spots), and animals.
- Trees grow back slowly, far away from you. New animals appear far away.
- There is always enough iron: at least 30 iron rocks, with at least 3 within 6–12 squares of the start.
  Mined iron comes back slowly somewhere far away. Iron rocks have big bright orange spots.
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
| R (hold) / right mouse button | Eat the chosen food |
| R facing a campfire | Put raw meat on it to cook |
| R facing your tent | Go inside the tent (place your bed, sleep) |
| F with the rifle in your hand | Shoot |
| R with the rifle in your hand | Reload (takes ammo from your inventory) |
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
- **Eating (like Minecraft):** choose food in the hotbar and **hold R** (or the right mouse button)
  for 1.5 seconds. A small bar above you fills, then the food is eaten and the chickens fill up.
  Letting go early cancels it. You can't eat when you are full. Choosing food shows "hold R to eat".
- Raw meat gives 2 chickens. Cooked meat gives 5, so cooking is worth it.
- **Cooking (like Minecraft):** hold raw meat, face a campfire and press R. The meat goes on the fire
  (up to 4 pieces). It slowly changes from red to brown over 10 seconds (no flicker), then drops
  next to the fire as cooked meat. Breaking a campfire gives back the raw meat on it.
- Wolves, bears and angry moose also take hearts (see Animals).
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
- **Recipe book** (open by default, "Recipes" button hides or shows it), like Minecraft:
  - Click a recipe and its ingredients go into the crafting grid automatically. Then click the result.
  - Shift + click a recipe: fills the grid with as many as you can make. Shift + click the result to make them all.
  - Recipes you can make have a green bar and say "Click to fill the grid".
  - Recipes you can't make yet are grey and say why: "Missing: 1 Coal" or "Needs a crafting table".
  - You can still place ingredients by hand.

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
| Hunting rifle | 3 iron on top, 2 planks + 1 stick below | table |
| 8 ammo | 1 iron above 1 coal | anywhere |

**Breaking things (F)**

| Thing | Hits (basic tool) | Needs | Drops |
|---|---|---|---|
| Tree | 3 | axe (you always have one) | 1 wood |
| Stone rock | 4 | pickaxe | 1 stone |
| Coal rock | 5 | pickaxe | 1 coal |
| Iron rock (orange spots) | 6 | **stone** pickaxe or better | 1 iron |
| Things you placed | 1 – 4 | axe (stone wall: pickaxe) | the item back |

- Stone tools are twice as strong: fewer hits.
- Edge-of-world trees cannot be chopped.

**Animals** — food chain: rabbit, fox, wolf, deer, moose, bear.
Rule: the bigger the animal, the more hits it takes and the more meat it gives.
The bear is the biggest animal you can hunt.

| Animal | Hits (basic axe) | Drops | Behaviour | In the forest |
|---|---|---|---|---|
| Rabbit | 1 | 1 meat | Calm | 10 |
| Fox | 2 | 2 meat | Calm | 6 |
| Wolf | 3 | 3 meat | **Hunter**: attacks you on sight (1 heart per bite) | 5 |
| Deer | 4 | 4 meat | Calm | 8 |
| Sheep | 5 | 2 wool + 1 meat | Calm (the wool animal, not in the food chain) | 10 (3 start near you) |
| Moose | 8 | 8 meat | **Fights back only if you hit it first** (2 hearts per bite) | 4 |
| Bear | 12 | 12 meat | **Hunter**: attacks you on sight (2 hearts per bite) | 3 |

A stone sword (or stone axe) hunts with power 2, so big animals need fewer hits.

**Attacks — calm and fair**
- A steady "!" (no blinking) shows above an animal 1 second before it comes toward you.
- Attacking animals walk at a steady speed, with no jumping. You are always faster, so you can walk away.
- They give up when you are far enough away, then they are calm again.
- One bite every 1.5 seconds. No flashing or shaking; a short message says what is happening.
- Wolves and bears never appear near the start (wolves 14+ squares away, bears 18+).
- **Peaceful** setting (button in the H controls box): no animal attacks. Remembered in this browser.
- If an animal takes all your hearts, you faint and wake up at your bed with all your items.

**Hunting rifle**
- No sound, no muzzle flash, no screen shake. Only a thin line shows where the shot went, then fades.
- Choose the rifle in the hotbar. F shoots in the direction you face. One shot = 4 axe hits
  (a wolf needs 1 shot, a bear 3 shots). Shots reach about 8 squares; trees, rocks and walls stop them.
- The rifle holds 6 shots. The hotbar shows the shots left, for example 4/6.
- R reloads: a small bar fills for 1.5 seconds, then ammo from your inventory goes into the rifle.
  Changing to another item stops the reload.
- Out of shots: "Out of ammo. Press R to reload." No ammo left: "No ammo. Make some at the crafting table."
- No new enemies: the rifle is for hunting and for wolves, bears and angry moose.

**Tent**
- Face your tent and press R: a calm pop-up shows the inside of the tent, seen from above.
- It is cozy and full: wooden floor, a big rug, little flags, a lantern with a steady warm light,
  a small table with a mug and a book, a bookshelf, a plant, cushions, firewood and a wool basket.
- **You walk around inside** with W A S D, like outside. Walls and furniture block you; the rug doesn't.
- **Your bed goes inside the tent**, in its own place (a dashed square, "Your bed goes here").
  Same keys as outside: walk to the bed place, choose the bed and press **Q** to put it there;
  **R** next to the bed sleeps (evening or night); **F** next to the bed takes it back.
  A short line under the room always says what you can do where you stand.
- Walk out of the door at the bottom (or press Esc / E, or the "Leave the tent" button) to leave.
  The world waits while you are inside.
- Breaking a tent gives back the tent and the bed inside it.
- **Beds can't be placed outside.** Pressing Q with a bed shows a pop-up:
  "You can't place your bed outside of your tent. Face your tent and press R to go inside, then place it there."
  (Beds that were already outside in old saves still work.)

**Stone furnace (inside the tent)**
- Recipe: 8 stone in a ring (crafting table). Like the bed, it only goes inside your tent
  (pressing Q outside shows the same kind of pop-up).
- Inside the tent it has its own place by the firewood. Q places it, F takes it back (with the meat inside).
- Hold raw meat and press R next to it: the meat goes in (up to 8). One coal cooks 4 pieces.
  It cooks one piece at a time (6 seconds each), with a steady warm glow and a small progress bar,
  also while you are away. R with anything else takes the cooked meat out.
- While it cooks, you hear a soft fire crackle inside the tent.

**Your dog**
- Hold meat (raw or cooked) and press R facing a wolf: it likes the meat and a small heart shows.
  Feed it 3 times and it becomes your dog (with a red collar). A wolf you have fed never attacks you.
- Your dog follows you and sits when it is close. It can't be hit by the axe or the rifle,
  and it never blocks your way. In your tent it sleeps on its little dog bed ("zz").

**Campfire sound** — like sitting in front of a real campfire: a warm low "whoosh" that slowly
breathes, soft crackles (sometimes a few together), and now and then a little pop. Louder as you come closer.

**Easter egg (secret!)** — a ring of red mushrooms is hidden far away in the forest (26+ squares from the start).
It glows softly at night. Stand in the middle at night and press R: fireflies dance around you (they fade in
and out softly, no blinking), a soft magic chime plays, and you get a **Golden axe** that chops a tree in one hit.
In the daytime: "The mushrooms seem to be waiting for the night..."

**Placing (Q)**: crafting table, tent, campfire, torch, wooden wall, stone wall.
**Sleeping**: inside your tent, in your bed, in the evening or at night. The screen fades slowly,
the night passes, and you wake up in the morning. That bed or tent becomes your home.

**Drops** lie on the ground. Walk near them and they slide to you. If your inventory is full,
they stay on the ground.

**Saving**: the game saves itself in this browser every 15 seconds and when you close it.
"Start a new world" (in the H controls box) asks once more, then starts a fresh forest.

**Music and sounds** (made inside the game, no sound files, nothing loud)
- Music starts OFF. Press **M** (or the button in the H box) to turn it on. It fades in slowly.
  Slow, soft notes: a brighter tune by day, a calmer and lower one at night.
- Soft sounds: a wooden "thock" when the axe hits wood, a gentle "tink" on rocks, a soft thud on animals,
  a muffled "pof" for the rifle (not a loud bang), small clicks for reloading and an empty rifle,
  and a quiet crackle near a campfire that gets louder as you come closer.
- In the H box: Music ON/OFF, Sounds ON/OFF, and a volume slider. The choices are remembered.

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
- Step 7 — New animals: fox, wolf and bear. Food chain rabbit → fox → wolf → deer → moose → bear
  (bigger = more hits, more meat). Wolves and bears hunt you; a moose fights back if hit.
  Calm attacks (a "!" first, you are faster, they give up). Peaceful setting.
- Step 8 — Recipe book fills the crafting grid automatically (click a recipe; Shift + click for as many as
  you can). It shows which recipes you can make and what is missing.
- Step 9 — Eating and cooking like Minecraft: hold R (or the right mouse button) to eat with a small bar;
  put raw meat on a campfire with R and it cooks slowly, then drops as cooked meat.
  Cooking was removed from the crafting grid.
- Step 10 — Iron rocks (need a stone pickaxe), hunting rifle and ammo. F shoots and R reloads when the rifle
  is in your hand. 6 shots, 1.5 s reload, a shots counter on the hotbar. No sound, no flash.
- Fix — Saves now store what each tile is by name, so adding new blocks never changes old saves
  (before, a crafting table in an old save could turn into an iron rock). If an unexpected error happens,
  the game keeps running and writes the details to the browser console.
- Step 11 — Tent interior: R facing the tent opens a cozy top-down view of the inside. The bed is placed
  there (not outside; Q with a bed shows a pop-up). You sleep in the tent's bed.
- Step 12 — Walk around inside the tent like outside (W A S D, furniture blocks you). Q places the bed,
  R sleeps, F takes the bed; walk out of the door to leave.
- Fix — You could get stuck after placing the bed while standing on its spot. Now you can always walk out of
  anything you overlap (inside the tent and outside), and the bed moves you to a free spot next to it.
- Fix — The Goal box crashed once you reached the last goals (a missing comma in the goal list).
  All 14 goals now work in order, then "Free play".
- Fix — Old saves could have almost no iron (the save bug had turned the iron check off). Now the game makes sure
  there are at least 30 iron rocks and a few near the start, and iron rocks are easier to see.
- Step 13 — Calm music (off at the start, M turns it on, day and night tunes) and soft sounds for the axe,
  the rifle and the campfire, with on/off buttons and a volume slider.
- Step 14 — Stone furnace inside the tent (cooks with coal), taming a wolf into a dog, a cozier campfire sound,
  and a secret fairy ring with fireflies and a Golden axe.
