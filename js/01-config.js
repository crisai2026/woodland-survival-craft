const CONFIG = {
  world: {
    tileSize: 40,          // pixels per tile
    width: 90,             // world width in tiles
    height: 90,            // world height in tiles
    treeChance: 0.13,      // 0 to 1: how many tiles become trees
    rockGroups: 34,        // how many groups of grey rocks
    rockGroupSize: 2,      // how wide a rock group is (in tiles)
    coalChance: 0.3,       // 0 to 1: how many rocks have coal in them
    ironChance: 0.15,      // 0 to 1: how many rocks have iron in them
    minIron: 30,           // the world always has at least this many iron rocks
    ironNearStart: 3,      // iron rocks kept within reach of the start (6–12 squares away)
    clearingRadius: 4,     // open space (in tiles) around the start
    borderThickness: 2,    // rows of trees around the edge (these cannot be chopped)
    regrowEvery: 20,       // seconds: a new tree grows somewhere far away
    farAway: 700,          // pixels: new trees and animals appear at least this far from you
    seed: 2026             // the first world. A new world gets a random seed.
  },
  player: {
    speed: 150,            // pixels per second
    size: 34,              // drawing size in pixels
    hitbox: 22,            // collision size in pixels
    turnSpeed: 12,         // how quickly he turns to face a new direction
    jumpTime: 0.5,         // seconds for one jump (up and down)
    jumpHeight: 10,        // pixels he rises at the top of a jump
    light: 90              // pixels: small light around you at night
  },
  survival: {
    maxHealth: 10,              // hearts
    maxHunger: 10,              // roast chickens
    hungerEverySeconds: 40,     // lose 1 chicken this often
    starveDamageEverySeconds: 5,// with 0 chickens, lose 1 heart this often
    healEverySeconds: 8,        // get 1 heart back this often ...
    healWhenHungerAtLeast: 8,   // ... when you have at least this many chickens
    wakeUpHunger: 6             // chickens you have after fainting
  },
  time: {
    dayLength: 240,        // seconds of daytime
    nightLength: 120,      // seconds of night
    fadeLength: 20,        // seconds for evening and morning to change slowly
    warnBefore: 30,        // seconds: "Night is coming" shows this long before night
    maxDarkness: 0.62,     // 0 to 1: how dark the night gets
    startTime: 25          // seconds into the first day when the game starts
  },
  actions: {
    reach: 30,             // pixels in front of the player that F can reach
    cooldown: 0.4,         // seconds between hits
    swingTime: 0.3,        // seconds for one axe swing
    fadeTime: 0.8          // seconds for a tree, rock or animal to slowly disappear
  },
  // Things on the map you can break with F.
  // hits: hits needed with a basic tool. tool: 'axe' (you always have one) or 'pickaxe'.
  // Better tools hit harder (see "power" in items).  light: glows at night.
  blocks: {
    tree:      { hits: 3, tool: 'axe',     drops: { wood: 1 },      solid: true,  natural: true },
    stone:     { hits: 4, tool: 'pickaxe', drops: { stone: 1 },     solid: true,  natural: true },
    coal:      { hits: 5, tool: 'pickaxe', drops: { coal: 1 },      solid: true,  natural: true },
    iron:      { hits: 6, tool: 'pickaxe', drops: { iron: 1 },      solid: true,  natural: true,
                 minPower: 2 },     // needs a stone pickaxe (power 2) or better
    table:     { hits: 2, tool: 'axe',     drops: { table: 1 },     solid: true },
    tent:      { hits: 2, tool: 'axe',     drops: { tent: 1 },      solid: true,  enter: true },
    bed:       { hits: 2, tool: 'axe',     drops: { bed: 1 },       solid: true,  sleep: true },  // only beds from old saves
    campfire:  { hits: 2, tool: 'axe',     drops: { campfire: 1 },  solid: true,  light: 180 },
    torch:     { hits: 1, tool: 'axe',     drops: { torch: 1 },     solid: false, light: 120 },
    woodWall:  { hits: 3, tool: 'axe',     drops: { woodWall: 1 },  solid: true },
    stoneWall: { hits: 4, tool: 'pickaxe', drops: { stoneWall: 1 }, solid: true },
    // Garlic: wild patches in the forest, and garlic you plant (it grows in 3 stages).
    garlicWild: { hits: 1, tool: 'axe',    drops: { garlic: 2 },    solid: false, natural: true, plant: true },
    garlic0:   { hits: 1, tool: 'axe',     drops: { garlic: 1 },    solid: false, plant: true },   // sprout
    garlic1:   { hits: 1, tool: 'axe',     drops: { garlic: 1 },    solid: false, plant: true },   // green leaves
    garlic2:   { hits: 1, tool: 'axe',     drops: { garlic: 3 },    solid: false, plant: true },   // ripe
    // A wooden farm gate with two doors. Closed: nothing can pass. Open: you (and animals) can walk through.
    gate:      { hits: 3, tool: 'axe',     drops: { gate: 1 },      solid: true,  gate: true },
    // A cave opening in the rocks (R: go inside). It can't be broken.
    cave:      { hits: 0, tool: 'none',    drops: {},               solid: true,  cave: true },
    // Rivers and ponds. You can't walk on water, but you can fish in it (see CONFIG.fishing).
    water:     { hits: 0, tool: 'none',    drops: {},               solid: true,  natural: true, water: true },
    // Underground (inside caves):
    caveRock:  { hits: 0, tool: 'none',    drops: {},               solid: true,  natural: true },  // deep rock: can't be broken
    crackedRock: { hits: 3, tool: 'pickaxe', drops: { stone: 1 },   solid: true,  natural: true },  // something may be behind it...
    caveExit:  { hits: 0, tool: 'none',    drops: {},               solid: true,  light: 170, caveExit: true },  // R: back outside
    chest:     { hits: 0, tool: 'none',    drops: {},               solid: true,  chest: true },    // E: open it
    glowShroom: { hits: 1, tool: 'axe',    drops: { glowShroom: 1 }, solid: false, natural: true, plant: true, light: 60 },
    // A trophy shelf (not in the game for now: no recipe. Kept so nothing breaks in saved worlds).
    shelf:     { hits: 2, tool: 'axe',     drops: { shelf: 1 },     solid: true,  shelf: true },
    gold:      { hits: 6, tool: 'pickaxe', drops: { gold: 1 },      solid: true,  natural: true, minPower: 2 }   // only in the gold mine
  },
  tools: {
    basicAxePower: 1,      // the axe you always carry
    chainsawCooldown: 0.15, // seconds between cuts with the chainsaw (the axe: actions.cooldown)
    basicHuntPower: 1      // hunting with the basic axe
  },
  animals: {
    walkTimeMin: 1, walkTimeMax: 3,   // seconds walking
    restTimeMin: 1, restTimeMax: 4,   // seconds standing still
    turnSpeed: 4,          // how quickly an animal turns
    respawnEvery: 15,      // seconds: a new animal appears far away if there are too few
    // Attacks (wolves, bears, and a moose you hit). You walk faster than all of them.
    noticeRadius: 220,     // pixels: a hunter notices you when you are this close
    alertTime: 1,          // seconds a "!" shows before an animal comes toward you
    giveUpDistance: 320,   // pixels: an attacking animal stops if you get this far away
    biteEvery: 1.5,        // seconds between bites
    // Taming: feed a wolf meat (R) this many times and it becomes your dog.
    taming: { feedsNeeded: 3, petSpeed: 165, followDistance: 70, teleportDistance: 900 },
    // Food chain: the bigger the animal, the more hits it takes and the more meat it gives.
    // hits = F presses with the basic axe.  behavior: 'calm', 'hunter' (attacks you),
    // 'defends' (attacks only if you hit it first).  damage = hearts lost per bite.
    // nearStart = how many start close to you.  minStartDistance = squares from the start.
    kinds: {
      rabbit: { name: 'Rabbit', count: 10, nearStart: 2, hits: 1,  drops: { meat: 1 },
                speed: 50, size: 16, hitbox: 12, behavior: 'calm' },
      fox:    { name: 'Fox',    count: 6,  nearStart: 1, hits: 2,  drops: { meat: 2 },
                speed: 45, size: 20, hitbox: 14, behavior: 'calm' },
      wolf:   { name: 'Wolf',   count: 5,  nearStart: 0, hits: 3,  drops: { meat: 3 },
                speed: 45, size: 26, hitbox: 18, behavior: 'hunter',
                chaseSpeed: 100, damage: 1, minStartDistance: 14 },
      deer:   { name: 'Deer',   count: 8,  nearStart: 1, hits: 4,  drops: { meat: 4 },
                speed: 40, size: 26, hitbox: 18, behavior: 'calm' },
      sheep:  { name: 'Sheep',  count: 10, nearStart: 3, hits: 5,  drops: { wool: 2, meat: 1 },
                speed: 30, size: 26, hitbox: 20, behavior: 'calm' },
      moose:  { name: 'Moose',  count: 4,  nearStart: 0, hits: 8,  drops: { meat: 8 },
                speed: 30, size: 36, hitbox: 28, behavior: 'defends',
                chaseSpeed: 95, damage: 2 },
      bear:   { name: 'Bear',   count: 3,  nearStart: 0, hits: 12, drops: { meat: 12 },
                speed: 30, size: 40, hitbox: 30, behavior: 'hunter',
                chaseSpeed: 90, damage: 2, minStartDistance: 18 },
      // Not part of the food chain. Never appears by itself: see CONFIG.vampire.
      vampire: { name: 'Vampire', count: 0, nearStart: 0, hits: 5, drops: {},
                speed: 35, size: 34, hitbox: 22, behavior: 'vampire',
                chaseSpeed: 85, damage: 1, garlicOnly: true, avoidLight: true,
                notice: 620, giveUp: 760 },  // it looks for you from further away
      // Night creatures (see CONFIG.night). They come out at night and fade away at sunrise.
      zombie:   { name: 'Zombie',   count: 0, nearStart: 0, hits: 6,  drops: { wool: 1 },
                  speed: 25, size: 32, hitbox: 20, behavior: 'night', avoidLight: true,
                  chaseSpeed: 70, damage: 1, notice: 420, giveUp: 520 },
      skeleton: { name: 'Skeleton', count: 0, nearStart: 0, hits: 6,  drops: { bone: 2 },
                  speed: 30, size: 32, hitbox: 20, behavior: 'night', avoidLight: true, ranged: true,
                  chaseSpeed: 75, damage: 1, notice: 420, giveUp: 520 },
      werewolf: { name: 'Werewolf', count: 0, nearStart: 0, hits: 16, drops: { bone: 3, meat: 4 },
                  speed: 40, size: 38, hitbox: 26, behavior: 'night', avoidLight: true,
                  chaseSpeed: 115, damage: 2, notice: 460, giveUp: 560 }
    }
  },
  drops: {
    size: 18,              // pixels: how big a dropped item looks
    spread: 8,             // pixels: how far apart drops land
    pickupDelay: 0.6,      // seconds before a new drop can be picked up
    magnetRadius: 60,      // pixels: drops slide toward you when this close
    magnetSpeed: 140,      // pixels per second while sliding
    pickupRadius: 16       // pixels: the drop goes in your inventory when this close
  },
  inventory: {
    hotbarSize: 10,        // slots in the hotbar at the bottom of the screen
    backpackSize: 20,      // extra slots you see when you press E
    stackSize: 64          // most items stack up to this many in one slot
  },
  rifle: {
    shots: 6,              // shots in the rifle before you must reload
    reloadTime: 1.5,       // seconds to reload (a small bar shows it)
    power: 4,              // one shot = 4 axe hits (wolf: 1 shot, bear: 3 shots)
    range: 320,            // pixels a shot can travel. Trees, rocks and walls stop it.
    cooldown: 0.6,         // seconds between shots
    lineTime: 0.3          // seconds the thin shot line stays (no flash)
  },
  garlic: {
    wildPatches: 14,       // groups of wild garlic (white flowers) in the forest
    wildNearStart: 2,      // wild garlic kept close to the start (5–10 squares away)
    minWild: 20,           // the forest always has at least this much wild garlic
    stageTime: 180         // seconds for each growing stage (sprout → leaves → ripe): 2 stages = about one game day
  },
  caves: {
    count: 4,              // cave openings on the map: the first one is the old (haunted) mine
    minFromStart: 16,      // squares: caves are a walk away from the start
    apart: 20,             // squares between caves
    // Inside, each cave is its own big dark map (it scrolls, like the forest).
    darkness: 0.78,        // 0 to 1: how dark it is underground
    playerLight: 200,      // pixels: the light around you underground (a torch or the cape: more)
    notice: 300,           // pixels: cave creatures notice you this close (less than outside)
    safeAround: 9,         // squares around the way out where no creature starts
    wallRings: 2,          // rows of stone (with ore) around every tunnel and room: you can mine them
    coalChance: 0.2,       // 0 to 1: stone in cave walls with coal ...
    ironChance: 0.12,      // ... or with iron
    chests: 0,             // treasure chests in corners and dead ends (none: there is only the one secret chest)
    coins: [1, 1],
    secretCoins: 1,        // the secret chest in the minions' room holds one Knight's Quest trophy coin
    swordMark: 0.6,        // 0 to 1: how clearly the Knight's Quest sword mark shows on the floor (the clue to a secret)
    goldChance: 0,         // no gold in the caves (the gold block stays only so older saves still work)
    glowShrooms: 14,       // glowing mushrooms (a little light, and a snack)
    bats: 14,              // harmless bats hanging from the ceiling
    batFlights: [12, 25],  // seconds between little groups of bats flying past you (they never hurt you)
    // The four caves. size: [width, height] in squares. creatures: how many live there.
    kinds: [
      { title: 'The haunted mine', size: [46, 36], rooms: 9,  mine: true,
        creatures: { zombie: 3, skeleton: 2, vampire: 1 }, secrets: ['coffins'] },
      { title: 'A quiet cave', size: [38, 30], rooms: 7,  pool: true,
        creatures: { zombie: 2, skeleton: 2 },             secrets: [] },
      { title: 'A deep cave',  size: [50, 42], rooms: 11,
        creatures: { zombie: 4, skeleton: 3, vampire: 1 }, secrets: ['minions'] },
      { title: 'A crystal cave', size: [54, 44], rooms: 12, crystals: true, pool: true,
        creatures: { zombie: 4, skeleton: 3, vampire: 1 }, secrets: ['dragon'] }
    ]
  },
  water: {
    ponds: 6,              // ponds in the forest
    pondNearStart: true,   // one pond 7–11 squares from the start, so fishing is easy to find
    rivers: 1,             // rivers that cross the whole forest
    fordEvery: 14,         // squares: a river has a dry crossing (a ford) this often, so you can always get across
    fordWidth: 3           // squares of dry ground at each crossing
  },
  fishing: {
    reach: 3,              // squares in front of you where the line can land
    biteMin: 3,            // seconds you wait before a fish bites (random between these)
    biteMax: 8,
    biteWindow: 2.5,       // seconds you have to press F when a fish bites (it is easy, take your time)
    salmonChance: 0.3,     // 0 to 1: how often you catch a salmon instead of a small fish
    walkAway: 150          // pixels: walking this far away pulls the line in
  },
  gate: {
    swingTime: 0.5         // seconds for the doors to swing open or closed (slow and smooth)
  },
  slingshot: {
    speed: 260,            // pixels per second: the garlic flies slowly, so you can see it
    range: 300,            // pixels
    cooldown: 0.5          // seconds between shots
  },
  vampire: {
    firstNight: 2,         // the first night a vampire can come out (Day 2)
    everyNights: 2,        // then every 2nd night (Day 2, 4, 6 ...)
    spawnDistance: 460,    // pixels: it appears this far from you, never in the light
    garlicHits: 5,         // garlic hits to beat it (the axe and the rifle do nothing)
    keepAway: 110,         // pixels: holding garlic, the vampire will not come closer than this
    campfireLight: 150,    // pixels: it will not walk into a campfire's light ...
    torchLight: 100,       // ... or a torch's light
    leaveAt: 0.4           // morning: when the night is lighter than this, it turns into bats and flies away
  },
  night: {
    firstNight: 1,         // zombies and skeletons come out every night, from Day 1
    startAt: 0.6,          // 0 to 1: they come out once the evening is this dark (before full night)
    maxZombies: 6,         // at most this many at the same time
    maxSkeletons: 4,
    spawnEvery: 7,         // seconds between new night creatures (never in the light)
    perSpawn: 2,           // how many come out each time
    spawnDistance: 420,    // pixels from you: just outside the screen, so they find you soon
    fullMoonFirst: 4,      // the werewolf comes out on full-moon nights: Day 4, then every 4th night
    fullMoonEvery: 4,
    boneSpeed: 160,        // pixels per second: skeleton bones fly slowly, you can walk out of the way
    boneEvery: 2.5,        // seconds between bones
    boneRange: 260,        // pixels
    keepDistance: [150, 210]   // a skeleton stays this far from you while it throws
  },
  furnace: {
    cookTime: 6,           // seconds for one piece of meat (one at a time, like Minecraft)
    piecesPerCoal: 4,      // one coal cooks this many pieces
    maxPieces: 8           // raw meat that fits in the furnace
  },
  easter: {
    minDistanceFromStart: 26,   // squares: the secret is far from the start
    fireflyCount: 30,
    fireflyTime: 10             // seconds the fireflies stay
  },
  food: {
    eatTime: 1.5,          // seconds you hold R (or the right mouse button) to eat
    cookTime: 10,          // seconds for raw meat to cook on a campfire
    campfireSlots: 4       // pieces of meat that fit on one campfire
  },
  crafting: {
    tableReach: 80,        // pixels: stand this close to a crafting table for the 3 x 3 grid
    campfireReach: 80      // pixels: stand this close to a campfire to cook
  },
  // Everything you can carry.
  // food: chickens it gives back.  tool + power: better tools hit harder.
  // hunt: hunting power.  placeable: what it becomes on the map (press Q).  stack: max per slot.
  items: {
    wood:         { name: 'Wood' },
    planks:       { name: 'Planks' },
    sticks:       { name: 'Sticks' },
    stone:        { name: 'Stone' },
    coal:         { name: 'Coal' },
    iron:         { name: 'Iron' },
    ammo:         { name: 'Ammo' },
    wool:         { name: 'Wool' },
    meat:         { name: 'Raw meat',    food: 2, cooksInto: 'cookedMeat' },
    cookedMeat:   { name: 'Cooked meat', food: 5 },
    fish:         { name: 'Raw fish',    food: 1, cooksInto: 'cookedFish' },
    cookedFish:   { name: 'Cooked fish', food: 4 },
    salmon:       { name: 'Raw salmon',  food: 2, cooksInto: 'cookedSalmon' },
    cookedSalmon: { name: 'Cooked salmon', food: 6 },
    fishingRod:   { name: 'Fishing rod', stack: 1, rod: true },     // face water and press F
    woodPickaxe:  { name: 'Wooden pickaxe', stack: 1, tool: 'pickaxe', power: 1 },
    stonePickaxe: { name: 'Stone pickaxe',  stack: 1, tool: 'pickaxe', power: 2 },
    woodAxe:      { name: 'Wooden axe',     stack: 1, tool: 'axe',     power: 1 },   // like the axe you start with
    stoneAxe:     { name: 'Stone axe',      stack: 1, tool: 'axe',     power: 2 },
    ironAxe:      { name: 'Iron axe',       stack: 1, tool: 'axe',     power: 3 },   // a tree in one hit
    chainsaw:     { name: 'Chainsaw',       stack: 1, tool: 'axe',     power: 3, saw: true },  // fast, only for trees and wood
    stoneSword:   { name: 'Stone sword',    stack: 1, hunt: 2 },
    rifle:        { name: 'Hunting rifle',  stack: 1, gun: true },
    table:        { name: 'Crafting table', placeable: 'table' },
    tent:         { name: 'Tent',           placeable: 'tent' },
    bed:          { name: 'Bed',            insideTent: true },     // goes inside your tent, not outside
    furnace:      { name: 'Stone furnace',  insideTent: true },     // goes inside your tent, cooks with coal
    goldenAxe:    { name: 'Golden axe',     stack: 1, tool: 'axe', power: 3 },   // a secret gift
    campfire:     { name: 'Campfire',       placeable: 'campfire' },
    torch:        { name: 'Torch',          placeable: 'torch' },
    woodWall:     { name: 'Wooden wall',    placeable: 'woodWall' },
    stoneWall:    { name: 'Stone wall',     placeable: 'stoneWall' },
    garlic:       { name: 'Garlic',         placeable: 'garlic0' },  // plant it, or shoot it with the slingshot
    slingshot:    { name: 'Garlic slingshot', stack: 1, sling: true },
    cape:         { name: 'Vampire cape',   stack: 1, light: 160 }, // a bigger light around you at night
    bone:         { name: 'Bone' },                               // a dog treat: feed it to a wolf to tame it
    gate:         { name: 'Wooden gate',    placeable: 'gate' },
    key:          { name: 'Gate key',       stack: 1 },             // hold it and press R at a closed gate: lock / unlock
    coin:         { name: "Knight's Quest trophy coin", stack: 1 },   // the secret prize in the one hidden chest
    shelf:        { name: 'Trophy shelf',   placeable: 'shelf' },   // put your coins on it (R)
    glowShroom:   { name: 'Glow mushroom',  food: 1 },              // grows in caves
    gold:         { name: 'Gold' }                                  // from the haunted gold mine
  },
  // Recipes, drawn like the crafting grid. A space means "leave this square empty".
  // Recipes wider or taller than 2 need the 3 x 3 grid (stand next to a crafting table).
  // Cooking is not a recipe: put raw meat on a campfire (face it, press R).
  recipes: [
    { makes: 'planks',       amount: 4, pattern: ['W'],                 key: { W: 'wood' } },
    { makes: 'sticks',       amount: 4, pattern: ['P', 'P'],            key: { P: 'planks' } },
    { makes: 'table',        amount: 1, pattern: ['PP', 'PP'],          key: { P: 'planks' } },
    { makes: 'torch',        amount: 4, pattern: ['C', 'K'],            key: { C: 'coal', K: 'sticks' } },
    { makes: 'woodPickaxe',  amount: 1, pattern: ['PPP', ' K ', ' K '], key: { P: 'planks', K: 'sticks' } },
    { makes: 'stonePickaxe', amount: 1, pattern: ['SSS', ' K ', ' K '], key: { S: 'stone', K: 'sticks' } },
    { makes: 'woodAxe',      amount: 1, pattern: ['PP', 'PK', ' K'],    key: { P: 'planks', K: 'sticks' } },
    { makes: 'stoneAxe',     amount: 1, pattern: ['SS', 'SK', ' K'],    key: { S: 'stone', K: 'sticks' } },
    { makes: 'ironAxe',      amount: 1, pattern: ['II', 'IK', ' K'],    key: { I: 'iron', K: 'sticks' } },
    { makes: 'chainsaw',     amount: 1, pattern: ['III', 'IAI', 'III'], key: { I: 'iron', A: 'ironAxe' } },
    { makes: 'stoneSword',   amount: 1, pattern: ['S', 'S', 'K'],       key: { S: 'stone', K: 'sticks' } },
    { makes: 'woodWall',     amount: 6, pattern: ['PPP', 'PPP'],        key: { P: 'planks' } },
    { makes: 'stoneWall',    amount: 6, pattern: ['SSS', 'SSS'],        key: { S: 'stone' } },
    { makes: 'tent',         amount: 1, pattern: [' L ', 'LLL', 'K K'], key: { L: 'wool', K: 'sticks' } },
    { makes: 'bed',          amount: 1, pattern: ['LLL', 'PPP'],        key: { L: 'wool', P: 'planks' } },
    { makes: 'campfire',     amount: 1, pattern: [' K ', 'KCK', 'WWW'], key: { K: 'sticks', C: 'coal', W: 'wood' } },
    { makes: 'furnace',      amount: 1, pattern: ['SSS', 'S S', 'SSS'], key: { S: 'stone' } },
    { makes: 'rifle',        amount: 1, pattern: ['III', 'PPK'],        key: { I: 'iron', P: 'planks', K: 'sticks' } },
    { makes: 'ammo',         amount: 8, pattern: ['I', 'C'],            key: { I: 'iron', C: 'coal' } },
    { makes: 'slingshot',    amount: 1, pattern: ['KLK', ' K ', ' K '], key: { K: 'sticks', L: 'wool' } },
    { makes: 'gate',         amount: 1, pattern: ['KPK', 'KPK'],        key: { K: 'sticks', P: 'planks' } },
    { makes: 'key',          amount: 1, pattern: ['I', 'K'],            key: { I: 'iron', K: 'sticks' } },
    { makes: 'fishingRod',   amount: 1, pattern: ['  K', ' KL', 'K L'], key: { K: 'sticks', L: 'wool' } }
  ],
  sound: {
    volume: 0.5,           // 0 to 1: starting volume (the player can change it in the H box)
    musicOn: false,        // music starts OFF; press M to turn it on
    soundsOn: true,        // soft sounds for the axe, the rifle and the campfire
    fireHearDistance: 260, // pixels: you hear a campfire when you are this close
    // Forest sounds in the background (a button in the H box turns them off).
    ambientOn: true,
    ambientVolume: 0.5,    // 0 to 1, compared with the other sounds
    insideTent: 0.35,      // forest sounds are quieter inside the tent
    birdEvery: [5, 14],    // seconds between bird songs (daytime), random between these
    owlEvery: [25, 50],    // seconds between owl calls (night)
    wolfEvery: [60, 110],  // seconds between far-away wolf howls (night)
    dripEvery: [1.5, 5],   // seconds between water drips in a cave
    caveSoundEvery: [5, 12], // seconds between other cave sounds: pebbles, trickling water, bat squeaks, the rock settling
    kqMusic: 0.6,          // 0 to 1: how loud the Knight's Quest music is in the secret rooms (quiet, with echo)
    kqSlower: 1.6,         // the Knight's Quest tunes play this much slower there (ambient)
    // Music comes now and then, like in Minecraft: it plays for a while, then it is quiet.
    musicPlay: [35, 55],   // seconds a piece of music lasts
    musicRest: [45, 90]    // seconds of quiet between pieces
  },
  save: {
    key: 'woodland-survival-craft-save-v1',
    everySeconds: 15       // the game saves itself this often (in this browser)
  },
  game: {
    maxFrameTime: 0.05     // seconds; stops big jumps after switching tabs
  },
  colors: {
    outside: '#243021',
    grass: ['#6f9a4e', '#6b964b', '#73a052'],
    grassTuft: '#5f8a43',
    leaves: ['#3f7a3a', '#376d33', '#468541'],
    rock: ['#8a8a86', '#7d7d79', '#979792'], coalSpot: '#2b2b2b', ironSpot: '#e8893a',
    sawBody: '#e8893a', sawBar: '#b5b5b0', ironHead: '#d8dcdf', woodHead: '#a47a4f',
    rifleBarrel: '#4a4d50', rifleStock: '#6e4a2c', shotLine: 'rgba(241, 237, 224, 0.8)',
    treeShadow: 'rgba(20, 30, 15, 0.25)',
    shirt: '#b5463b', shirtDark: '#7f2e28',
    skin: '#e2b78d', hair: '#4b3526',
    axeHandle: '#7a5230', axeHead: '#a8adb0',
    deer: '#9a6b43', deerLight: '#c9a27a', deerDark: '#5e3f27', deerTail: '#eee6d8',
    rabbit: '#a08c78', rabbitEar: '#c8b6a2', rabbitTail: '#f2ede4',
    sheepWool: '#ecE8dc', sheepWoolShade: '#d3cdbf', sheepHead: '#5a544c', sheepLeg: '#4a453e',
    moose: '#5a3e2a', mooseDark: '#3f2b1d', mooseAntler: '#c9b48a',
    fox: '#c8743a', foxLight: '#f0e6d8', foxDark: '#3a2a20',
    wolf: '#8a8d8f', wolfDark: '#64676a', wolfLight: '#c9cbcc',
    bear: '#4a3324', bearDark: '#3a281b', bearSnout: '#8a6a4a',
    alertBox: '#f1ede0', alertText: '#2b2b2b', collar: '#c0392b', heart2: '#e0605a',
    gatePost: '#6e4a2c', gateWood: '#b88b56', gateBrace: '#8a6437', lock: '#9a9a95', lockDark: '#5c5c58',
    water: ['#4f86b0', '#4a80aa', '#5590b8'], waterLight: '#7fb2d4', waterEdge: '#3f6f94', lily: '#5f9a3f', lilyFlower: '#f2d6e0',
    bobber: '#d9453f', bobberTop: '#f1ede0', fishLine: 'rgba(241, 237, 224, 0.7)',
    caveRock: ['#4a4643', '#423e3b', '#524e4a'], caveFloor: '#3a3632', caveFloorDark: '#322e2b', caveFloors: ['#3d3935', '#3a3632', '#403b37'],
    mineWood: '#6e4a2c', rail: '#8a8a86', crack: '#3a3a37', glowCap: '#7fd6e0', glowStem: '#cfe9ea',
    chestClosed: '#b45309', chestOpen: '#78350f', chestTrim: '#f59e0b', chestLatch: '#fef3c7', coin: '#facc15', coinEdge: '#a16207',
    crystalA: '#8fd0e8', crystalB: '#b9a8e8', web: 'rgba(230, 230, 225, 0.35)', lantern: '#f2c14e',
    garlicLeaf: '#5f9a3f', garlicFlower: '#f4f1e6', garlicBulb: '#efe9dc', garlicStripe: '#b98fb0', soil: '#6e5236',
    zombieSkin: '#7fa36a', zombieShirt: '#4f6f9a', zombieShirtDark: '#3d5778', zombieHair: '#3b4a2f',
    boneWhite: '#e9e6dc', boneShade: '#b9b5a8', boneDark: '#4a4740',
    wereFur: '#5a4535', wereDark: '#3e2f24', wereLight: '#8a7258', wereEye: '#e8c547',
    vampCape: '#1f1a24', vampLining: '#8f2330', vampFace: '#e6e1dc', vampHair: '#121014', bat: '#2a2430',
    caveBat: '#625870', mushroomCap: '#c0392b', mushroomDot: '#f1ede0', mushroomStem: '#e9e4d8', gold: '#e8c547',
    tableTop: '#b88b56', tableEdge: '#6e4a2c', tableLine: '#8a6437',
    tentCloth: '#d9ceb2', tentShade: '#b9ad8f', tentPole: '#7a5230', tentDoor: '#4b3f30',
    bedFrame: '#8a6437', bedPillow: '#efe9dd', bedBlanket: '#b5463b',
    stone: '#8a8a86', fireOuter: '#e8893a', fireInner: '#f2c14e', fireGlow: 'rgba(242, 170, 80, 0.16)',
    woodWall: '#a47a4f', woodWallLine: '#7a5230',
    stoneWall: '#8f8f8a', stoneWallLine: '#666662',
    heart: '#d9453f', heartShine: '#f08a84', chicken: '#b5703c', chickenShine: '#d89a5e',
    bone: '#efe6d6', iconEmpty: '#4a3f38',
    night: '8, 12, 30',
    hitBar: '#f1ede0', hitBarBack: 'rgba(0, 0, 0, 0.35)',
    shadow: 'rgba(0, 0, 0, 0.18)'
  }
};
