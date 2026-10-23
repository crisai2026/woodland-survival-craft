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
- No flashing, no loud or sudden sounds, no sudden movements. Day and night change slowly.
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
- **Water:** one river runs across the whole forest (top to bottom, away from the start), with a dry ford
  (3 squares of ground) every 14 squares so you can always get across. 6 ponds, and one pond a short walk
  (8–10 squares) from the start. You can't walk on water. Water is calm: still ripples, some lily pads.
  Older worlds get the same river and ponds once, safely: only on grass, trees and rocks, never on or next to
  anything you built, never where you stand, never on the secret ring (those spots simply stay dry).
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
| F with the slingshot in your hand | Shoot garlic |
| Q with garlic | Plant it |
| R facing a gate | Open or close it (with the gate key: lock or unlock) |
| F with the fishing rod, facing water | Cast the line. When a fish bites, F again to catch it |
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
- Raw meat gives 2 chickens, cooked meat 5. Raw fish 1, cooked fish 4. Raw salmon 2, cooked salmon 6. Cooking is worth it.
- **Cooking (like Minecraft):** hold raw meat or fish, face a campfire and press R. The meat goes on the fire
  (up to 4 pieces). It slowly changes from red to brown over 10 seconds (no flicker), then drops
  next to the fire as cooked meat. Breaking a campfire gives back the raw meat on it.
- Wolves, bears, angry moose and night creatures also take hearts (see Animals and Night creatures).
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
| Wooden axe | planks + sticks in an axe shape | table |
| Stone axe | stone + sticks in an axe shape | table |
| Iron axe | iron + sticks in an axe shape | table |
| Chainsaw | the iron axe in the middle, 8 iron all around it | table |
| Stone sword | 2 stone above a stick | table |
| 6 wooden walls | 6 planks (2 rows of 3) | table |
| 6 stone walls | 6 stone (2 rows of 3) | table |
| Tent | 4 wool in a roof shape + 2 sticks as legs | table |
| Bed | 3 wool on top of 3 planks | table |
| Campfire | sticks, 1 coal, 3 wood | table |
| Hunting rifle | 3 iron on top, 2 planks + 1 stick below | table |
| 8 ammo | 1 iron above 1 coal | anywhere |
| Garlic slingshot | sticks in a Y shape, 1 wool between the top sticks | table |
| Wooden gate | 2 rows of: stick, plank, stick | table |
| Gate key | 1 iron above 1 stick | anywhere |
| Fishing rod | 3 sticks in a diagonal, 2 wool hanging down as the line | table |

**Breaking things (F)**

| Thing | Hits (basic tool) | Needs | Drops |
|---|---|---|---|
| Tree | 3 | axe (you always have one) | 1 wood |
| Stone rock | 4 | pickaxe | 1 stone |
| Coal rock | 5 | pickaxe | 1 coal |
| Iron rock (orange spots) | 6 | **stone** pickaxe or better | 1 iron |
| Wild garlic (white flowers) | 1 | nothing | 2 garlic |
| Planted garlic | 1 | nothing | 1 garlic (ripe: 3 garlic) |
| Things you placed | 1 – 4 | axe (stone wall: pickaxe) | the item back |

- Stone tools are twice as strong: fewer hits.
- **Axes, step by step:** wooden axe (3 hits for a tree, like the axe you start with) → stone axe (2 hits)
  → iron axe (1 hit) → **chainsaw**. You always use the best axe you carry.
- **Chainsaw:** hold it and press F: a tree is cut in one go, and it cuts again very quickly (every 0.15 s),
  with a soft, low "brrr" (never loud). It is only for trees and wooden things: it never hits animals
  ("The chainsaw is only for trees and wood"), and it doesn't count for hunting.
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
- The rifle works on animals and night creatures, but not on the vampire (only garlic hurts it).

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
- Hold raw meat or fish and press R next to it: it goes in (up to 8). One coal cooks 4 pieces.
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

**Garlic**
- Wild garlic grows in small patches with white flowers (at least 20 in the forest, a few 5–10 squares
  from the start). F picks it: 2 garlic. New wild garlic grows back slowly far away.
- Planting: choose garlic and press Q on grass. It grows in 3 stages you can see: sprout → green leaves → ripe
  (a white bulb shows). Each stage takes 3 minutes, so about one game day. It also grows while you sleep.
- F on ripe garlic: 3 garlic. (F on unripe garlic gives the clove back.)

**Garlic slingshot**
- Choose the slingshot and press F: a garlic flies slowly in the direction you face (you can see it).
  Each shot uses 1 garlic. The hotbar shows how much garlic you have.
- A garlic that misses lands on the ground, so you can pick it up again.
- It also hits animals softly (like 1 axe hit).

**Night creatures** (calm and fair, like the wolves: a steady "!" first, you are always faster, they give up)
| Creature | Hits (basic axe) | Rifle shots | Behaviour | Drops |
|---|---|---|---|---|
| Zombie | 6 | 2 | Slow, walks toward you, arms forward (1 heart per bite) | 1 wool |
| Skeleton | 6 | 2 | Stays 4–5 squares away and throws a slow, spinning bone every 2.5 s (1 heart). Walk out of the way! | 2 bones |
| Werewolf | 16 | 4 | Only on full-moon nights. Big and strong (2 hearts per bite), but still slower than you | 3 bones, 4 meat |
- Zombies and skeletons come out every night, from Day 1, as soon as the evening gets dark: 2 at a time,
  every 7 seconds, just outside the screen, up to 6 zombies and 4 skeletons. They look for you from about 10 squares away.
- Night creatures and the vampire have a small soft light around them, so you can see them coming in the dark.
- **Full moon:** Day 4, then every 4th night (Day 8, 12 ...). The clock shows a round moon and "Full moon".
  In the evening a calm message warns you. One werewolf comes out, with a soft far-away howl.
- They never come into the light of campfires and torches, can't pass closed gates or walls, and
  trees and walls stop bones. Your tent is safe.
- At sunrise they all fade away slowly. They are not saved (a new night brings new ones).
- Peaceful mode: none of them come out.
- **Bones** are dog treats: hold a bone and press R facing a wolf (like meat) to tame it.

**The vampire**
- Comes out every 2nd night: Day 2, 4, 6 ... (once the evening is dark). Never in Peaceful mode.
- In the evening a calm message warns you: "Tonight a vampire may come out... Get your garlic ready!"
- It appears far from you, never in the light, and walks toward you with a steady "!" first. You are faster.
- **Only garlic hurts it.** The axe and the rifle do nothing ("The vampire doesn't feel it. Try garlic!").
  5 garlic hits from the slingshot beat it; each hit makes it flinch and step back.
- **Holding garlic** keeps it away: it will not come closer than about 3 squares.
- It stays out of the light of campfires and torches, so a lit base is safe. Your tent is safe too.
- Beaten: it turns into a little cloud of bats that flies away (no blood), and leaves a **Vampire cape**
  next to you (later vampires leave 3 garlic). The cape gives you a bigger light at night and shows on your back.
- At sunrise, a vampire that is still around turns into bats and flies away.

**Wooden gate** (a farm gate with two doors, **2 squares wide**: one door on each square)
- Q places it across the way you are facing, on the square in front of you and the one next to it,
  so it fits in a 2-square gap in a line of walls. If there is no room: "A gate needs 2 free squares side by side."
- Both doors always move together: opening, closing, locking.
- R facing the gate opens it: the two doors swing slowly open, away from you (like pushing a farm gate).
  R again closes it. You can't close it while you, or an animal, stand in it.
- Open: you can walk through (animals too). Closed: nothing can pass — not wolves, bears or the vampire.
- **Locking:** hold the gate key and press R at a closed gate: a small padlock shows. A locked gate can't be
  opened or broken ("The gate is locked..."). Hold the key and press R again to unlock it.
- F breaks an unlocked gate (both squares) and gives back 1 gate.

**Fishing**
- Make a fishing rod at the crafting table. Choose it and face a pond or the river (up to 3 squares away),
  then press F: the line goes in and a red-and-white bobber floats on the water.
- Wait calmly (3–8 seconds). When a fish bites, a soft "blip-blip" plays, the bobber dips a little and a
  steady "!" shows above it, with the message "A fish is biting! Press F now." You have 2.5 seconds.
- Catch: a small fish (raw fish), or sometimes (3 in 10) a salmon. Too late: "The fish swam away" and another
  one comes; nothing is lost. F before a bite pulls the line in. Walking away or changing item pulls it in too.
- Fish are food: eat them raw (hold R) or cook them on a campfire or in the stone furnace, like meat.

**Placing (Q)**: crafting table, tent, campfire, torch, wooden wall, stone wall, gate, garlic (planting).
**Sleeping**: inside your tent, in your bed, in the evening or at night. The screen fades slowly,
the night passes, and you wake up in the morning. That bed or tent becomes your home.

**Drops** lie on the ground. Walk near them and they slide to you. If your inventory is full,
they stay on the ground.

**Saving**: the game saves itself in this browser every 15 seconds and when you close it.
"Start a new world" (in the H controls box) asks once more, then starts a fresh forest.

**Music and sounds** (made inside the game, no sound files, nothing loud, nothing sudden)
- **Forest sounds** in the background: soft wind and leaves that slowly come and go.
  - Daytime: little birds sing now and then.
  - Night: quiet crickets, an owl now and then ("hoo ... hoo-hoo"), and sometimes a wolf howling far away.
    All of them start softly and are quieter than the other sounds.
  - Inside the tent the forest sounds are quieter. "Forest sounds: ON/OFF" in the H box turns them off.
- **Music** starts OFF. Press **M** (or the button in the H box) to turn it on. It fades in slowly.
  Like Minecraft, it plays **now and then**: a piece of about 35–55 seconds, then 45–90 seconds of quiet.
  - Daytime: a calm, bright tune.
  - Night: a slow, low, mysterious (a little spooky) tune with a deep soft hum. Never sudden or loud.
- Soft sounds: a wooden "thock" when the axe hits wood, a gentle "tink" on rocks, a soft thud on animals,
  a muffled "pof" for the rifle (not a loud bang), small clicks for reloading and an empty rifle,
  and a cozy crackle near a campfire that gets louder as you come closer.
- **Timber!** On the last hit, a tree creaks slowly and then falls with a soft crash and rustling leaves.
- In the H box: Music ON/OFF, Sounds ON/OFF, Forest sounds ON/OFF, and a volume slider. The choices are remembered.

### Caves and ore
- **4 caves** on the map, far from the start: a dark opening in a small stone hill. One is **the haunted mine** (wooden frame and a sign).
- Face an opening and press **R** to go in. Each cave is its **own big map** that scrolls like the forest
  (tunnels and rooms). It is always dark underground: your light is bigger there, torches work as outside.
  The bright square of daylight behind you is the way out: face it and press **R**.
- Everything works like outside: mining, placing torches and campfires, fighting, fishing in cave pools,
  your dog comes with you. You can't put a tent or plant garlic underground.
- **Lots of ore**: every tunnel and room has 2 rows of stone around it, full of coal and iron. Deep rock behind it can't be broken.
- **Dripping water**: in every cave, realistic drops into puddles (a tiny tap and a rising "bloop"), near or far,
  left or right, sometimes two in a row, with the cave's echo.
- **Bats** in every cave (14 each): they hang still and flutter away when you come close. Now and then a little group
  flies past you. They never hurt you.
- **More cave sounds** (soft, with echo): a low hum of air in the rock, small pebbles falling, water trickling far away,
  bats squeaking, and the rock settling deep and far away.
- **Glow mushrooms** (a little light, and a snack), **harmless bats** that flutter away when you come close.
- **Creatures** live in the caves (day and night): zombies, skeletons and, in 3 caves, a vampire.
  Same calm rules as outside (a steady "!", you are faster, they give up, they stay out of the light).
  Never near the way out, never in secret rooms. New ones come each day. Peaceful mode: none.
- The 4 caves: **The haunted mine** (straight tunnels with rails, wooden beams, old carts, lanterns, slow ghost lights),
  **A quiet cave** (small, a pool), **A deep cave** (big), **A crystal cave** (biggest, glowing crystals, a pool).
- **The secret treasure chest** (like in Knight's Quest): there is only **one**, in the minions' secret room in the deep cave.
  Press **E** (or R) next to it: the Knight's Quest chest sound, and a **Knight's Quest trophy coin** pops out.
  Pick it up (the Knight's Quest coin sound): a secret prize, not money. Later it will go in your tent (still to plan).
  The chest stays empty after.
- The trophy shelf is out of the game for now (no recipe), until we plan the trophy in the tent.
- **Knight's Quest secrets** (Easter eggs), one in the haunted mine, the deep cave and the crystal cave:
  - The clue: a short tunnel that stops for no reason, with a tiny Knight's Quest sword faintly scratched in the floor.
  - At its end, a **hidden rock** that looks exactly like normal stone. Mining it sounds hollow ("This rock sounds hollow...").
  - Before you break in, the room is completely hidden: it looks like solid stone, nothing inside shows.
  - Breaking the rock (or any wall next to the room) **turns the lights on**: wall torches light one after another
    (a soft fade, no flash), a chime, "You broke through! A secret! ... (n of 3 secrets)". The room stays lit (also after saving).
  - Inside a found room, **quiet, echoing ambient music from Knight's Quest** plays: the game's tunes, slower, with soft
    round waves, a little muffled and with a cave echo (fades in and out; our own music waits).
  1. Haunted mine: the Knight and the Princess resting together in two coffins (Knight's Quest "princess is free" tune).
  2. Deep cave: one room with the bones of all the Dragon's minions (furry, insect, tentacle and winged),
     scattered where they fell (different places and angles, loose bones), not in a row; one lies right next to the chest,
     and one treasure chest (the Knight's Quest forest-level tune).
  3. Crystal cave: the bones of the Dragon boss (the dark-level tune).
- Saving inside a cave: next time you start outside its opening. Fainting in a cave: you wake up outside.

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
  `Mechanics`, `Icons`, `Hud` + `Goals` + `Hotbar`, `InventoryScreen`, `Screens`, `Tent`, `Easter`, `Sound`,
  `Save`, `Game`.

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
- Step 15 — Forest sounds (wind, leaves, birds by day; crickets, owls and far-away wolves at night),
  a "timber" creak and crash when a tree falls, and music that plays now and then: calm by day,
  mysterious at night. New "Forest sounds" button in the H box.
- Step 16 — Garlic (wild patches, planting, 3 growing stages, harvest), the garlic slingshot, and the vampire:
  comes out every 3rd night from Day 3, only garlic hurts it, holding garlic keeps it away, it avoids light,
  turns into bats when beaten or at sunrise, and leaves a Vampire cape. Other enemies are on hold.
- Step 17 — Wooden farm gate with two doors that swing open away from you (R), and a gate key (iron + stick)
  to lock and unlock it. A locked gate can't be opened or broken.
- Fix — The gate is now 2 squares wide, with one long door on each square.
- Step 18 — Night creatures: zombies and skeletons (from Day 2; skeletons throw slow bones) and a werewolf on
  full-moon nights (every 4th night, round moon and "Full moon" on the clock). They avoid light, fade at sunrise,
  and bones can tame wolves.
- Fix — Night creatures and the vampire were too rare and hard to see. Now more come out, closer, from Day 1
  (vampire every 2nd night), with a soft light around them.
- Step 19 — Fishing: one river (with dry fords) and ponds on the map, a fishing rod to craft, calm fishing
  (cast with F, wait, press F when the fish bites), raw fish and salmon to eat or cook on the campfire or furnace.
- Fix — Older worlds only got one small pond. Now they get the whole river and all the ponds too (safely, around your things).
- Step 20 — Axe steps: wooden axe, stone axe, iron axe, and the chainsaw (iron axe surrounded by 8 iron):
  fast, one cut per tree, only for trees and wood.
- Step 21 — Caves and ore: 4 caves (one haunted old mine) with extra ore that grows back, top-down insides like the tent,
  and 4 Knight's Quest secrets (coffins, minion skeletons including the insect and winged ones, the chest with one coin,
  the Dragon skeleton). Older worlds get the caves once, safely, around your things.
- Step 22 — Caves rebuilt (after playing): each cave is now a big scrolling map with lots of ore, creatures, bats,
  glow mushrooms, hidden Knight's Quest treasure chests (E: coins pop out, same sounds as Knight's Quest),
  a trophy shelf for the coins, and hidden secrets behind cracked rocks.
- Fix — The minion skeletons are now together in one secret room with one chest (deep cave), 3 secrets in all.
  Knight's Quest music plays inside the secret rooms. Caves saved before this change are made fresh.
- Fix — Only the minions' secret room has a treasure chest (the coffins and the Dragon rooms don't).
  The Knight's Quest music in the secret rooms is louder (CONFIG.sound.kqMusic).
- Fix — Only one treasure chest in the game (minions' room) with one Knight's Quest trophy coin, a secret prize.
  The trophy shelf is out for now. The old mine is a haunted gold mine (gold ore, later removed). Water drips in every cave.
- Step 23 — Secret room entry: a dead-end tunnel with a faint sword mark, a hidden rock that looks like stone
  (hollow sound), the room stays dark and hidden until you break in, then its torches light up one by one.
  Minion skeletons lie scattered, not in a row.
- Fix — One minion skeleton lies next to the chest. 8 bats in every cave. Realistic water drops with a cave echo.
  The Knight's Quest music in the secret rooms is quiet, slower and echoing (ambient).
- Fix — No gold in the mine any more ("The haunted mine"). More cave sounds (air hum, pebbles, trickling water,
  bat squeaks, the rock settling). 14 bats in each cave, and little groups of bats fly past now and then.
