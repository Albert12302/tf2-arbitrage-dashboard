/**
 * frontend/lib/weapon-defindex.ts
 *
 * Weapon name -> TF2 item definition index. Used only to build exact
 * per-weapon backpack.tf stats links for Killstreak Kits/Fabricators (see
 * statsPageItemName in tf2-display.ts) — those items collapse into one
 * generic per-tier catalog page unless the specific weapon's defindex is
 * appended as a trailing URL segment.
 *
 * Source: https://wiki.alliedmods.net/Team_fortress_2_item_definition_indexes
 * (cross-checked against confirmed real backpack.tf links: Panic Attack =
 * 1153, Shotgun = 199, Big Kill = 161). Defindexes are effectively static —
 * Valve rarely reassigns them — but this list isn't guaranteed exhaustive;
 * a lookup miss just falls back to the generic tier page, not a broken link.
 *
 * Keys are normalized without a leading "The ", matching how the weapon
 * name appears embedded inside a Kit/Fabricator item name (e.g. backpack.tf
 * names the item "Professional Killstreak Loch-n-Load Kit", not "...The
 * Loch-n-Load Kit").
 */
export const WEAPON_DEFINDEX: Record<string, number> = {
  // Scout
  Scattergun: 13,
  "Force-A-Nature": 45,
  Shortstop: 220,
  "Soda Popper": 448,
  "Baby Face's Blaster": 772,
  "Back Scatter": 1103,
  "Scout's Pistol": 23,
  "Bonk! Atomic Punch": 46,
  "Crit-a-Cola": 163,
  "Mad Milk": 222,
  Lugermorph: 294,
  Winger: 449,
  "Pretty Boy's Pocket Pistol": 773,
  "Flying Guillotine": 812,
  Bat: 0,
  Sandman: 44,
  "Holy Mackerel": 221,
  "Frying Pan": 264,
  "Candy Cane": 317,
  "Boston Basher": 325,
  "Sun-on-a-Stick": 349,
  "Fan O'War": 355,
  Atomizer: 450,
  "Wrap Assassin": 648,

  // Soldier
  "Rocket Launcher": 18,
  "Direct Hit": 127,
  "Black Box": 228,
  "Rocket Jumper": 237,
  "Liberty Launcher": 414,
  "Cow Mangler 5000": 441,
  Original: 513,
  "Beggar's Bazooka": 730,
  "Air Strike": 1104,
  "Soldier's Shotgun": 10,
  "Buff Banner": 129,
  Gunboats: 133,
  "Battalion's Backup": 226,
  "Reserve Shooter": 415,
  "Righteous Bison": 442,
  Mantreads: 444,
  "B.A.S.E. Jumper": 1101,
  "Panic Attack": 1153,
  Shovel: 6,
  Equalizer: 128,
  "Pain Train": 154,
  "Half-Zatoichi": 357,
  "Market Gardener": 416,
  "Disciplinary Action": 447,
  "Escape Plan": 775,

  // Pyro
  "Flame Thrower": 21,
  Backburner: 40,
  Degreaser: 215,
  Phlogistinator: 594,
  Rainblower: 741,
  "Dragon's Fury": 1178,
  "Pyro's Shotgun": 12,
  "Flare Gun": 39,
  Detonator: 351,
  Manmelter: 595,
  "Scorch Shot": 740,
  "Thermal Thruster": 1179,
  "Gas Passer": 1180,
  "Fire Axe": 2,
  Axtinguisher: 38,
  Homewrecker: 153,
  Powerjack: 214,
  "Back Scratcher": 326,
  "Sharpened Volcano Fragment": 348,
  "Postal Pummeler": 457,
  Maul: 466,
  "Third Degree": 593,
  Lollichop: 739,
  "Neon Annihilator": 813,
  "Hot Hand": 1181,

  // Demoman
  "Grenade Launcher": 19,
  "Loch-n-Load": 308,
  "Ali Baba's Wee Booties": 405,
  Bootlegger: 608,
  "Loose Cannon": 996,
  "Iron Bomber": 1151,
  "Stickybomb Launcher": 20,
  "Scottish Resistance": 130,
  "Chargin' Targe": 131,
  "Sticky Jumper": 265,
  "Splendid Screen": 406,
  "Tide Turner": 1099,
  "Quickiebomb Launcher": 1150,
  Bottle: 1,
  Eyelander: 132,
  "Scotsman's Skullcutter": 172,
  "Horseless Headless Horsemann's Headtaker": 266,
  "Ullapool Caber": 307,
  "Claidheamh Mòr": 327,
  "Persian Persuader": 404,
  "Nessie's Nine Iron": 482,
  "Scottish Handshake": 609,

  // Heavy
  Minigun: 15,
  Natascha: 41,
  "Iron Curtain": 298,
  "Brass Beast": 312,
  Tomislav: 424,
  "Huo-Long Heater": 811,
  "Heavy's Shotgun": 11,
  Sandvich: 42,
  "Dalokohs Bar": 159,
  "Buffalo Steak Sandvich": 311,
  "Family Business": 425,
  Fishcake: 433,
  "Robo-Sandvich": 863,
  "Second Banana": 1190,
  Fists: 5,
  "Killing Gloves of Boxing": 43,
  "Gloves of Running Urgently": 239,
  "Warrior's Spirit": 310,
  "Fists of Steel": 331,
  "Eviction Notice": 426,
  "Apoco-Fists": 587,
  "Holiday Punch": 656,
  "Bread Bite": 1100,

  // Engineer
  "Engineer's Shotgun": 9,
  "Frontier Justice": 141,
  Widowmaker: 527,
  "Pomson 6000": 588,
  "Rescue Ranger": 997,
  "Engineer's Pistol": 22,
  Wrangler: 140,
  "Short Circuit": 528,
  Wrench: 7,
  Gunslinger: 142,
  "Southern Hospitality": 155,
  "Golden Wrench": 169,
  Jag: 329,
  "Eureka Effect": 589,

  // Medic
  "Syringe Gun": 17,
  Blutsauger: 36,
  "Crusader's Crossbow": 305,
  Overdose: 412,
  "Medi Gun": 29,
  Kritzkrieg: 35,
  "Quick-Fix": 411,
  Vaccinator: 998,
  Bonesaw: 8,
  Ubersaw: 37,
  "Vita-Saw": 173,
  Amputator: 304,
  "Solemn Vow": 413,

  // Sniper
  "Sniper Rifle": 14,
  Huntsman: 56,
  "Sydney Sleeper": 230,
  "Bazaar Bargain": 402,
  Machina: 526,
  "Hitman's Heatmaker": 752,
  "AWPer Hand": 851,
  "Fortified Compound": 1092,
  Classic: 1098,
  SMG: 16,
  Razorback: 57,
  Jarate: 58,
  "Darwin's Danger Shield": 231,
  "Cozy Camper": 642,
  "Cleaner's Carbine": 751,
  Kukri: 3,
  "Tribalman's Shiv": 171,
  Bushwacka: 232,
  Shahanshah: 401,

  // Spy
  Revolver: 24,
  Ambassador: 61,
  "Big Kill": 161,
  "L'Etranger": 224,
  Enforcer: 460,
  Diamondback: 525,
  Sapper: 735,
  "Red-Tape Recorder": 810,
  "Ap-Sap": 933,
  "Snack Attack": 1102,
  Knife: 4,
  "Your Eternal Reward": 225,
  "Conniver's Kunai": 356,
  "Wanga Prick": 574,
  "Sharp Dresser": 638,
  "Spy-cicle": 649,
  "Black Rose": 727,
};

/**
 * Fabricators encode tier via a fixed leading code rather than the
 * killstreak-prefix word itself — confirmed only for Specialized (2) and
 * Professional (3) against two different weapons each (Panic Attack, Big
 * Kill); no tier-1 "Killstreak Fabricator" has been observed to confirm
 * (it may not exist as a tradable item at all — basic kits don't need a
 * fabricator to craft).
 */
export const FABRICATOR_TIER_CODE: Partial<Record<number, number>> = {
  2: 6523,
  3: 6526,
};
