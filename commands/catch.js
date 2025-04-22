const db = require("../utils/database");
const {
  getDisplayName,
  formatNumber,
  checkCooldown,
} = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// ARK Dinosaurs with tiers, rarity, images and skills
const DINOSAURS = [
  // Low tier (Common)
  {
    name: "Dodo",
    emoji: "🦤",
    image: "https://www.dododex.com/media/creature/dodo.png",
    tier: "low",
    rarity: "common",
    value: 75, // Increased from 50
    chance: 25,
    skill: {
      name: "Egg Layer",
      description: "Has a 5% chance to generate an extra egg item daily",
      effect: "egg_bonus",
      power: 1,
    },
  },
  {
    name: "Dilophosaurus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/dilophosaurus.png",
    tier: "low",
    rarity: "common",
    value: 110, // Increased from 75
    chance: 20,
    skill: {
      name: "Venom Spit",
      description: "Gives a 3% attack bonus in battles",
      effect: "battle_attack",
      power: 3,
    },
  },
  {
    name: "Parasaur",
    emoji: "🦕",
    image: "https://www.dododex.com/media/creature/parasaur.png",
    tier: "low",
    rarity: "common",
    value: 150, // Increased from 100
    chance: 18,
    skill: {
      name: "Warning Call",
      description: "Increases chance to find rare items while hunting by 2%",
      effect: "hunt_rare",
      power: 2,
    },
  },
  {
    name: "Raptor",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/raptor.png",
    tier: "low",
    rarity: "common",
    value: 180, // Increased from 125
    chance: 15,
    skill: {
      name: "Pack Hunter",
      description: "Increases hunting success rate by 5%",
      effect: "hunt_success",
      power: 5,
    },
  },
  {
    name: "Pteranodon",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/pteranodon.png",
    tier: "low",
    rarity: "common",
    value: 220, // Increased from 150
    chance: 12,
    skill: {
      name: "Sky Scout",
      description: "Reduces hunting cooldown by 3%",
      effect: "hunt_cooldown",
      power: 3,
    },
  },
  // Additional Low tier (Common) dinosaurs
  {
    name: "Lystrosaurus",
    emoji: "🦎",
    image: "https://www.dododex.com/media/creature/lystrosaurus.png",
    tier: "low",
    rarity: "common",
    value: 90, // Increased from 60
    chance: 24,
    skill: {
      name: "Companionship",
      description: "Increases daily reward by 2%",
      effect: "daily_bonus",
      power: 2,
    },
  },
  {
    name: "Moschops",
    emoji: "🦕",
    image: "https://www.dododex.com/media/creature/moschops.png",
    tier: "low",
    rarity: "common",
    value: 125, // Increased from 85
    chance: 19,
    skill: {
      name: "Forager",
      description: "Has a 4% chance to find extra berries when hunting",
      effect: "berry_find",
      power: 4,
    },
  },
  {
    name: "Compy",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/compy.png",
    tier: "low",
    rarity: "common",
    value: 60, // Increased from 40
    chance: 26,
    skill: {
      name: "Tiny Hunter",
      description: "Gives a 2% bonus to coin earnings",
      effect: "coin_bonus",
      power: 2,
    },
  },
  {
    name: "Ichthyornis",
    emoji: "🐦",
    image: "https://www.dododex.com/media/creature/ichthyornis.png",
    tier: "low",
    rarity: "common",
    value: 165, // Increased from 110
    chance: 16,
    skill: {
      name: "Fish Catcher",
      description: "Has a 5% chance to find fish when hunting",
      effect: "fish_find",
      power: 5,
    },
  },
  {
    name: "Otter",
    emoji: "🦦",
    image: "https://www.dododex.com/media/creature/otter.png",
    tier: "low",
    rarity: "common",
    value: 200, // Increased from 140
    chance: 13,
    skill: {
      name: "Insulation",
      description: "Has a 4% chance to find pearls daily",
      effect: "pearl_find",
      power: 4,
    },
  },
  // New common dinosaurs
  {
    name: "Dung Beetle",
    emoji: "🪲",
    image: "https://www.dododex.com/media/creature/dungbeetle.png",
    tier: "low",
    rarity: "common",
    value: 120,
    chance: 22,
    skill: {
      name: "Fertilizer Factory",
      description: "Has a 6% chance to produce fertilizer daily",
      effect: "fertilizer_production",
      power: 6,
    },
  },
  {
    name: "Achatina",
    emoji: "🐌",
    image: "https://www.dododex.com/media/creature/achatina.png",
    tier: "low",
    rarity: "common",
    value: 135,
    chance: 20,
    skill: {
      name: "Cementing Paste",
      description: "Has a 5% chance to produce paste materials daily",
      effect: "paste_production",
      power: 5,
    },
  },
  {
    name: "Dimorphodon",
    emoji: "🦇",
    image: "https://www.dododex.com/media/creature/dimorphodon.png",
    tier: "low",
    rarity: "common",
    value: 155,
    chance: 17,
    skill: {
      name: "Aerial Backup",
      description: "Has a 4% chance to assist in battles",
      effect: "battle_assist",
      power: 4,
    },
  },

  // Mid tier (Uncommon)
  {
    name: "Stegosaurus",
    emoji: "🦕",
    image: "https://www.dododex.com/media/creature/stegosaurus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 300, // Increased from 200
    chance: 10,
    skill: {
      name: "Plate Defense",
      description: "Gives a 6% defense bonus in battles",
      effect: "battle_defense",
      power: 6,
    },
  },
  {
    name: "Carnotaurus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/carnotaurus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 375, // Increased from 250
    chance: 8,
    skill: {
      name: "Charge",
      description: "Gives a 7% attack bonus in battles",
      effect: "battle_attack",
      power: 7,
    },
  },
  {
    name: "Argentavis",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/argentavis.png",
    tier: "mid",
    rarity: "uncommon",
    value: 450, // Increased from 300
    chance: 7,
    skill: {
      name: "Scavenger",
      description: "Increases chance to find metal when hunting by 8%",
      effect: "metal_find",
      power: 8,
    },
  },
  {
    name: "Ankylosaurus",
    emoji: "🦕",
    image: "https://www.dododex.com/media/creature/ankylosaurus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 525, // Increased from 350
    chance: 6,
    skill: {
      name: "Metal Harvester",
      description: "Has a 10% chance to find extra metal when mining",
      effect: "metal_bonus",
      power: 10,
    },
  },
  {
    name: "Baryonyx",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/baryonyx.png",
    tier: "mid",
    rarity: "uncommon",
    value: 600, // Increased from 400
    chance: 5,
    skill: {
      name: "Aquatic Hunter",
      description: "Has a 9% chance to find fish and aquatic loot",
      effect: "aquatic_loot",
      power: 9,
    },
  },
  // Additional Mid tier (Uncommon) dinosaurs
  {
    name: "Dire Bear",
    emoji: "🐻",
    image: "https://www.dododex.com/media/creature/direbear.png",
    tier: "mid",
    rarity: "uncommon",
    value: 330, // Increased from 220
    chance: 9.5,
    skill: {
      name: "Honey Gatherer",
      description: "Has a 7% chance to find honey daily",
      effect: "honey_find",
      power: 7,
    },
  },
  {
    name: "Tapejara",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/tapejara.png",
    tier: "mid",
    rarity: "uncommon",
    value: 410, // Increased from 275
    chance: 7.5,
    skill: {
      name: "Swift Flight",
      description: "Reduces all activity cooldowns by 5%",
      effect: "cooldown_reduction",
      power: 5,
    },
  },
  {
    name: "Megaloceros",
    emoji: "🦌",
    image: "https://www.dododex.com/media/creature/megaloceros.png",
    tier: "mid",
    rarity: "uncommon",
    value: 340, // Increased from 225
    chance: 9,
    skill: {
      name: "Swift Runner",
      description: "Increases hunting reward by 6%",
      effect: "hunt_bonus",
      power: 6,
    },
  },
  {
    name: "Carbonemys",
    emoji: "🐢",
    image: "https://www.dododex.com/media/creature/carbonemys.png",
    tier: "mid",
    rarity: "uncommon",
    value: 420, // Increased from 280
    chance: 7.3,
    skill: {
      name: "Shell Protection",
      description: "Gives an 8% defense bonus in battles",
      effect: "battle_defense",
      power: 8,
    },
  },
  {
    name: "Sarco",
    emoji: "🐊",
    image: "https://www.dododex.com/media/creature/sarco.png",
    tier: "mid",
    rarity: "uncommon",
    value: 480, // Increased from 320
    chance: 6.5,
    skill: {
      name: "Ambush Predator",
      description: "Increases critical hit chance in battles by 7%",
      effect: "critical_chance",
      power: 7,
    },
  },
  // New uncommon dinosaurs
  {
    name: "Beelzebufo",
    emoji: "🐸",
    image: "https://www.dododex.com/media/creature/beelzebufo.png",
    tier: "mid",
    rarity: "uncommon",
    value: 470,
    chance: 6.8,
    skill: {
      name: "Toxin Secretion",
      description: "Has a 9% chance to produce cementing paste daily",
      effect: "toxin_production",
      power: 9,
    },
  },
  {
    name: "Iguanodon",
    emoji: "🦎",
    image: "https://www.dododex.com/media/creature/iguanodon.png",
    tier: "mid",
    rarity: "uncommon",
    value: 390,
    chance: 8.2,
    skill: {
      name: "Seed Harvester",
      description: "Increases berry and seed gathering by 10%",
      effect: "seed_gathering",
      power: 10,
    },
  },
  {
    name: "Doedicurus",
    emoji: "🦔",
    image: "https://www.dododex.com/media/creature/doedicurus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 510,
    chance: 5.8,
    skill: {
      name: "Stone Collector",
      description: "Has a 12% chance to find extra stone when gathering",
      effect: "stone_gathering",
      power: 12,
    },
  },

  // High tier (Rare)
  {
    name: "Spinosaurus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/spinosaurus.png",
    tier: "high",
    rarity: "rare",
    value: 750, // Increased from 500
    chance: 4,
    skill: {
      name: "Aquatic Adaptation",
      description: "Has a 12% chance to find rare aquatic loot",
      effect: "rare_aquatic",
      power: 12,
    },
  },
  {
    name: "Rex",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/rex.png",
    tier: "high",
    rarity: "rare",
    value: 975, // Increased from 650
    chance: 3,
    skill: {
      name: "Apex Predator",
      description: "Gives a 15% attack bonus in battles",
      effect: "battle_attack",
      power: 15,
    },
  },
  {
    name: "Quetzal",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/quetzal.png",
    tier: "high",
    rarity: "rare",
    value: 1200, // Increased from 800
    chance: 2,
    skill: {
      name: "Sky Harvester",
      description: "Increases all gathering rewards by 10%",
      effect: "gather_all",
      power: 10,
    },
  },
  {
    name: "Mosasaurus",
    emoji: "🐊",
    image: "https://www.dododex.com/media/creature/mosasaurus.png",
    tier: "high",
    rarity: "rare",
    value: 1500, // Increased from 1000
    chance: 1.5,
    skill: {
      name: "Deep Sea Terror",
      description: "Has a 15% chance to find rare deep sea treasures",
      effect: "deep_sea_loot",
      power: 15,
    },
  },
  // Additional High tier (Rare) dinosaurs
  {
    name: "Therizinosaurus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/therizinosaurus.png",
    tier: "high",
    rarity: "rare",
    value: 825, // Increased from 550
    chance: 3.8,
    skill: {
      name: "Harvester",
      description: "Increases berry and fiber gathering by 14%",
      effect: "plant_gather",
      power: 14,
    },
  },
  {
    name: "Yutyrannus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/yutyrannus.png",
    tier: "high",
    rarity: "rare",
    value: 1050, // Increased from 700
    chance: 2.5,
    skill: {
      name: "Leadership",
      description: "Increases all other dinosaur skills by 8%",
      effect: "skill_boost",
      power: 8,
    },
  },
  {
    name: "Basilosaurus",
    emoji: "🐋",
    image: "https://www.dododex.com/media/creature/basilosaurus.png",
    tier: "high",
    rarity: "rare",
    value: 1125, // Increased from 750
    chance: 2.2,
    skill: {
      name: "Oil Harvester",
      description: "Has a 13% chance to find oil when gathering",
      effect: "oil_find",
      power: 13,
    },
  },
  {
    name: "Allosaurus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/allosaurus.png",
    tier: "high",
    rarity: "rare",
    value: 900, // Increased from 600
    chance: 3.5,
    skill: {
      name: "Pack Coordination",
      description: "Increases attack and defense by 9% in battles",
      effect: "battle_all",
      power: 9,
    },
  },
  {
    name: "Megalodon",
    emoji: "🦈",
    image: "https://www.dododex.com/media/creature/megalodon.png",
    tier: "high",
    rarity: "rare",
    value: 1275, // Increased from 850
    chance: 1.8,
    skill: {
      name: "Ocean Hunter",
      description: "Has a 14% chance to find rare ocean treasures",
      effect: "ocean_treasure",
      power: 14,
    },
  },
  // New rare dinosaurs
  {
    name: "Snow Owl",
    emoji: "🦉",
    image: "https://www.dododex.com/media/creature/snowowl.png",
    tier: "high",
    rarity: "rare",
    value: 1350,
    chance: 1.7,
    skill: {
      name: "Thermal Vision",
      description: "Increases chance to find hidden treasures by 15%",
      effect: "treasure_detection",
      power: 15,
    },
  },
  {
    name: "Brontosaurus",
    emoji: "🦕",
    image: "https://www.dododex.com/media/creature/brontosaurus.png",
    tier: "high",
    rarity: "rare",
    value: 1100,
    chance: 2.3,
    skill: {
      name: "Berry Harvester",
      description:
        "Increases berry gathering by 16% and produces extra berries daily",
      effect: "mass_harvester",
      power: 16,
    },
  },
  {
    name: "Woolly Rhino",
    emoji: "🦏",
    image: "https://www.dododex.com/media/creature/woollyrhino.png",
    tier: "high",
    rarity: "rare",
    value: 1180,
    chance: 2.0,
    skill: {
      name: "Charging Horn",
      description: "Has a 13% chance to deal double damage in battle",
      effect: "charge_attack",
      power: 13,
    },
  },

  // Boss tier (Legendary)
  {
    name: "Giganotosaurus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/giganotosaurus.png",
    tier: "boss",
    rarity: "legendary",
    value: 5250, // Increased from 3500
    chance: 0.8, // Adjusted chance
    skill: {
      name: "Rage",
      description: "Gives a 20% attack bonus in battles",
      effect: "battle_attack",
      power: 20,
    },
  },
  {
    name: "Rock Drake",
    emoji: "🐉",
    image: "https://www.dododex.com/media/creature/rockdrake.png",
    tier: "boss",
    rarity: "legendary",
    value: 6000, // Increased from 4000
    chance: 0.5, // Adjusted chance
    skill: {
      name: "Camouflage",
      description: "Increases rare item finding chance by 18%",
      effect: "rare_find",
      power: 18,
    },
  },
  {
    name: "Wyvern",
    emoji: "🐉",
    image: "https://www.dododex.com/media/creature/wyvern.png",
    tier: "boss",
    rarity: "legendary",
    value: 7500, // Increased from 5000
    chance: 0.4, // Adjusted chance
    skill: {
      name: "Elemental Breath",
      description: "Gives a 25% attack bonus in battles",
      effect: "battle_attack",
      power: 25,
    },
  },
  {
    name: "Reaper King",
    emoji: "👑",
    image: "https://www.dododex.com/media/creature/reaperking.png",
    tier: "boss",
    rarity: "legendary",
    value: 9000, // Increased from 6000
    chance: 0.25, // Adjusted chance
    skill: {
      name: "Acidic Blood",
      description: "Has a 20% chance to deal additional damage in battles",
      effect: "damage_over_time",
      power: 20,
    },
  },
  {
    name: "Phoenix",
    emoji: "🔥",
    image: "https://www.dododex.com/media/creature/phoenix.png",
    tier: "boss",
    rarity: "legendary",
    value: 12000, // Increased from 8000
    chance: 0.15, // Adjusted chance
    skill: {
      name: "Rebirth",
      description: "Has a 15% chance to avoid defeat in battle once per day",
      effect: "avoid_defeat",
      power: 15,
    },
  },
  {
    name: "Titanosaur",
    emoji: "🦕",
    image: "https://www.dododex.com/media/creature/titanosaur.png",
    tier: "boss",
    rarity: "legendary",
    value: 15000, // Increased from 10000
    chance: 0.08, // Adjusted chance
    skill: {
      name: "Colossal Strength",
      description: "Increases all stats by 20% in battles",
      effect: "all_stats",
      power: 20,
    },
  },
  // Additional Boss tier (Legendary) dinosaurs
  {
    name: "Griffin",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/griffin.png",
    tier: "boss",
    rarity: "legendary",
    value: 5400, // Increased from 3600
    chance: 0.6, // Adjusted chance
    skill: {
      name: "Diving Attack",
      description: "Has a 22% chance for critical hits in battles",
      effect: "critical_chance",
      power: 22,
    },
  },
  {
    name: "Managarmr",
    emoji: "🐺",
    image: "https://www.dododex.com/media/creature/managarmr.png",
    tier: "boss",
    rarity: "legendary",
    value: 6600, // Increased from 4400
    chance: 0.45, // Adjusted chance
    skill: {
      name: "Ice Breath",
      description: "Has a 18% chance to freeze enemies in battle",
      effect: "freeze_enemy",
      power: 18,
    },
  },
  {
    name: "Ice Titan",
    emoji: "❄️",
    image: "https://www.dododex.com/media/creature/icetitan.png",
    tier: "boss",
    rarity: "legendary",
    value: 10500, // Increased from 7000
    chance: 0.2, // Adjusted chance
    skill: {
      name: "Frozen Armor",
      description: "Gives a 25% defense bonus in battles",
      effect: "battle_defense",
      power: 25,
    },
  },
  {
    name: "Forest Titan",
    emoji: "🌲",
    image: "https://www.dododex.com/media/creature/foresttitan.png",
    tier: "boss",
    rarity: "legendary",
    value: 10500, // Increased from 7000
    chance: 0.2, // Adjusted chance
    skill: {
      name: "Nature's Wrath",
      description: "Increases all gathering rates by 25%",
      effect: "gather_all",
      power: 25,
    },
  },
  {
    name: "Desert Titan",
    emoji: "🏜️",
    image: "https://www.dododex.com/media/creature/deserttitan.png",
    tier: "boss",
    rarity: "legendary",
    value: 10500, // Increased from 7000
    chance: 0.2, // Adjusted chance
    skill: {
      name: "Lightning Strike",
      description: "Has a 22% chance to stun enemies in battle",
      effect: "stun_enemy",
      power: 22,
    },
  },
  {
    name: "King Titan",
    emoji: "👑",
    image: "https://www.dododex.com/media/creature/kingtitan.png",
    tier: "boss",
    rarity: "legendary",
    value: 18000, // Increased from 12000
    chance: 0.05, // Adjusted chance
    skill: {
      name: "Titan's Might",
      description:
        "Increases all stats by 30% and gives immunity to status effects",
      effect: "titan_power",
      power: 30,
    },
  },
  // New legendary dinosaurs from Dododex
  {
    name: "Shadow Magmasaur",
    emoji: "🌋",
    image: "https://www.dododex.com/media/creature/magmasaur.png",
    tier: "boss",
    rarity: "legendary",
    value: 13500, // Increased from 9000
    chance: 0.12,
    skill: {
      name: "Magma Burst",
      description: "Deals 25% area damage to all opponents in battle",
      effect: "area_damage",
      power: 25,
    },
  },
  {
    name: "Primal Megachelon",
    emoji: "🐢",
    image: "https://www.dododex.com/media/creature/megachelon.png",
    tier: "boss",
    rarity: "legendary",
    value: 12750, // Increased from 8500
    chance: 0.15,
    skill: {
      name: "Living Fortress",
      description: "Reduces damage taken by 30% when health is below 50%",
      effect: "defensive_stance",
      power: 30,
    },
  },
  {
    name: "Alpha Bloodstalker",
    emoji: "🕸️",
    image: "https://www.dododex.com/media/creature/bloodstalker.png",
    tier: "boss",
    rarity: "legendary",
    value: 11250, // Increased from 7500
    chance: 0.18,
    skill: {
      name: "Blood Drain",
      description: "Heals for 20% of damage dealt in battles",
      effect: "life_steal",
      power: 20,
    },
  },
  {
    name: "Crystal Wyvern Queen",
    emoji: "💎",
    image: "https://www.dododex.com/media/creature/crystal-wyvern.png",
    tier: "boss",
    rarity: "legendary",
    value: 14250, // Increased from 9500
    chance: 0.1,
    skill: {
      name: "Crystal Nova",
      description: "Has a 18% chance to deal triple damage in battles",
      effect: "mega_critical",
      power: 18,
    },
  },
  {
    name: "Astral Astrocetus",
    emoji: "🌌",
    image: "https://www.dododex.com/media/creature/astrocetus.png",
    tier: "boss",
    rarity: "legendary",
    value: 13200, // Increased from 8800
    chance: 0.12,
    skill: {
      name: "Cosmic Surge",
      description: "Increases all stats by 15% for every turn in battle",
      effect: "escalating_power",
      power: 15,
    },
  },
  {
    name: "Chaos Ferox",
    emoji: "🦊",
    image: "https://www.dododex.com/media/creature/ferox.png",
    tier: "boss",
    rarity: "legendary",
    value: 10800, // Increased from 7200
    chance: 0.2,
    skill: {
      name: "Transformation",
      description: "Doubles attack after the first turn in battle",
      effect: "transform",
      power: 22,
    },
  },
  {
    name: "Alpha Tropeognathus",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/tropeognathus.png",
    tier: "boss",
    rarity: "legendary",
    value: 10200, // Increased from 6800
    chance: 0.22,
    skill: {
      name: "Jet Stream",
      description: "Attacks first in battle with a 15% damage boost",
      effect: "first_strike",
      power: 15,
    },
  },
  {
    name: "Tek Shadowmane",
    emoji: "🦁",
    image: "https://www.dododex.com/media/creature/shadowmane.png",
    tier: "boss",
    rarity: "legendary",
    value: 13800, // Increased from 9200
    chance: 0.1,
    skill: {
      name: "Stealth Strike",
      description: "Has a 20% chance to ignore enemy attack completely",
      effect: "phase_shift",
      power: 20,
    },
  },
  {
    name: "Omega Voidwyrm",
    emoji: "🐉",
    image: "https://www.dododex.com/media/creature/voidwyrm.png",
    tier: "boss",
    rarity: "legendary",
    value: 16500, // Increased from 11000
    chance: 0.07,
    skill: {
      name: "Void Absorption",
      description: "Absorbs 25% of enemy attacks and converts to health",
      effect: "damage_conversion",
      power: 25,
    },
  },
  {
    name: "Demonic Deinonychus",
    emoji: "👹",
    image: "https://www.dododex.com/media/creature/deinonychus.png",
    tier: "boss",
    rarity: "legendary",
    value: 12600, // Increased from 8400
    chance: 0.14,
    skill: {
      name: "Blood Frenzy",
      description: "Each attack increases damage by 10% (stacks up to 40%)",
      effect: "growing_fury",
      power: 10,
    },
  },
  {
    name: "Spectral Argentavis",
    emoji: "👻",
    image: "https://www.dododex.com/media/creature/argentavis.png",
    tier: "boss",
    rarity: "legendary",
    value: 11700, // Increased from 7800
    chance: 0.17,
    skill: {
      name: "Soul Harvest",
      description: "Gains 10% of defeated enemy's stats permanently",
      effect: "stat_steal",
      power: 10,
    },
  },
  {
    name: "Ancient Megalania",
    emoji: "🦎",
    image: "https://www.dododex.com/media/creature/megalania.png",
    tier: "boss",
    rarity: "legendary",
    value: 11400, // Increased from 7600
    chance: 0.18,
    skill: {
      name: "Toxic Bite",
      description: "Attacks poison enemies for 15% health over 3 turns",
      effect: "poison",
      power: 15,
    },
  },
  {
    name: "Nemesis Rex",
    emoji: "☠️",
    image: "https://www.dododex.com/media/creature/rex.png",
    tier: "boss",
    rarity: "legendary",
    value: 14700, // Increased from 9800
    chance: 0.09,
    skill: {
      name: "Apex Hunter",
      description: "Deals 35% more damage to legendary dinosaurs",
      effect: "apex_killer",
      power: 35,
    },
  },
  {
    name: "Celestial Gasbags",
    emoji: "🎈",
    image: "https://www.dododex.com/media/creature/gasbags.png",
    tier: "boss",
    rarity: "legendary",
    value: 9750, // Increased from 6500
    chance: 0.25,
    skill: {
      name: "Toxic Cloud",
      description: "Has a 22% chance to reduce enemy accuracy by 40%",
      effect: "blind",
      power: 22,
    },
  },
  {
    name: "Abyssal Tusoteuthis",
    emoji: "🦑",
    image: "https://www.dododex.com/media/creature/tusoteuthis.png",
    tier: "boss",
    rarity: "legendary",
    value: 12150, // Increased from 8100
    chance: 0.16,
    skill: {
      name: "Crushing Grip",
      description: "Prevents enemy from attacking for 1 turn with 18% chance",
      effect: "immobilize",
      power: 18,
    },
  },
  {
    name: "Mythic Moeder",
    emoji: "🌊",
    image: "https://www.dododex.com/media/creature/moeder.png",
    tier: "boss",
    rarity: "legendary",
    value: 17250, // Increased from 11500
    chance: 0.06,
    skill: {
      name: "Tidal Wave",
      description: "Has a 15% chance to hit all enemies with 75% damage",
      effect: "tidal_surge",
      power: 15,
    },
  },
  // New legendary dinosaurs
  {
    name: "Master Controller",
    emoji: "🧠",
    image: "https://www.dododex.com/media/creature/mastercontroller.png",
    tier: "boss",
    rarity: "legendary",
    value: 19000,
    chance: 0.04,
    skill: {
      name: "Mind Control",
      description: "Has a 15% chance to make enemy skip their turn",
      effect: "mind_control",
      power: 15,
    },
  },
  {
    name: "Alpha Rockwell",
    emoji: "🦠",
    image: "https://www.dododex.com/media/creature/rockwell.png",
    tier: "boss",
    rarity: "legendary",
    value: 18500,
    chance: 0.045,
    skill: {
      name: "Mutation",
      description: "Transforms for 3 turns gaining 40% to all stats",
      effect: "mutation",
      power: 40,
    },
  },
  {
    name: "Genesis",
    emoji: "🧬",
    image: "https://www.dododex.com/media/creature/genesis.png",
    tier: "boss",
    rarity: "legendary",
    value: 20000,
    chance: 0.03,
    skill: {
      name: "Creator's Will",
      description:
        "Gains immunity to negative effects and 20% damage reflection",
      effect: "creator_aura",
      power: 20,
    },
  },
];

// Cryopods from shop with images
const CRYOPODS = [
  {
    id: "cryopod_basic",
    name: "Basic Cryopod",
    emoji: "🔵",
    image: "https://www.dododex.com/media/item/Cryopod.png",
    catchRate: 0.4,
    tierBonus: { low: 0.1, mid: 0, high: -0.1, boss: -0.2 },
  },
  {
    id: "cryopod_advanced",
    name: "Advanced Cryopod",
    emoji: "🟣",
    image: "https://www.dododex.com/media/item/Cryopod.png",
    catchRate: 0.6,
    tierBonus: { low: 0.15, mid: 0.1, high: 0, boss: -0.1 },
  },
  {
    id: "cryopod_tek",
    name: "TEK Cryopod",
    emoji: "⚪",
    image: "https://www.dododex.com/media/item/Cryopod.png",
    catchRate: 0.8,
    tierBonus: { low: 0.2, mid: 0.15, high: 0.1, boss: 0 },
  },
  {
    id: "cryopod_artifact",
    name: "Artifact Cryopod",
    emoji: "🟡",
    image: "https://www.dododex.com/media/item/Cryopod.png",
    catchRate: 0.95,
    tierBonus: { low: 0.3, mid: 0.2, high: 0.15, boss: 0.1 },
  },
];

// Boosts from shop with images
const BOOSTS = [
  {
    id: "narcoberry",
    name: "Narcoberries",
    emoji: "🫐",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/8/8c/Narcoberry.png",
    boostAmount: 0.1, // +10% catch rate
  },
  {
    id: "kibble",
    name: "Exceptional Kibble",
    emoji: "🥩",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/e/e5/Exceptional_Kibble.png",
    boostAmount: 0.15, // +15% catch rate
  },
];

// Rarity colors
const RARITY_COLORS = {
  common: "#CCCCCC",
  uncommon: "#1ABC9C",
  rare: "#3498DB",
  legendary: "#9B59B6",
};

// Rarity emojis
const RARITY_EMOJIS = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  legendary: "🟣",
};

module.exports = {
  name: "catch",
  description: "Use cryopods to catch ARK dinosaurs",
  usage: "!catch [cryopod] [boost]",
  cooldown: 10 * 1 * 1000, // 10 minutes cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if the user is on cooldown
    const lastCaught = await db.get(`catch_${userId}`);
    const cooldownCheck = checkCooldown(lastCaught, this.cooldown);

    if (cooldownCheck.onCooldown) {
      // Create a cooldown card using embeds
      const cooldownEmbed = new EmbedBuilder()
        .setColor("#e74c3c") // Red color for cooldown
        .setAuthor({
          name: `${displayName} | Catching Cooldown`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `You're still preparing your cryopods!\nTry again in **${cooldownCheck.timeLeft}**`
        )

        .setFooter({
          text: "Catching cooldown is 10 minutes",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // Get user's inventory
    const inventory = (await db.get(`inventory_${userId}`)) || {};

    // Check if user has any cryopods
    const hasCryopods = Object.keys(inventory).some((itemId) =>
      CRYOPODS.some(
        (pod) => pod.id === itemId && inventory[itemId]?.quantity > 0
      )
    );

    if (!hasCryopods) {
      return message.reply(
        "You don't have any cryopods! Use `!shop` to purchase some."
      );
    }

    // Select cryopod to use (from args or best available)
    let selectedCryopod = null;
    let selectedBoost = null;

    if (args && args.length > 0) {
      // Try to parse arguments to find cryopod and boosts
      for (const arg of args) {
        const lowerArg = arg.toLowerCase();

        // Check if arg matches a cryopod
        const cryopodMatch = CRYOPODS.find(
          (pod) =>
            pod.name.toLowerCase().includes(lowerArg) ||
            pod.id.toLowerCase().includes(lowerArg)
        );

        if (cryopodMatch && inventory[cryopodMatch.id]?.quantity > 0) {
          selectedCryopod = cryopodMatch;
          continue;
        }

        // Check if arg matches a boost
        const boostMatch = BOOSTS.find(
          (boost) =>
            boost.name.toLowerCase().includes(lowerArg) ||
            boost.id.toLowerCase().includes(lowerArg)
        );

        if (boostMatch && inventory[boostMatch.id]?.quantity > 0) {
          selectedBoost = boostMatch;
          continue;
        }
      }
    }

    // If no valid cryopod selected, pick best available
    if (!selectedCryopod) {
      // Find best available cryopod in inventory (highest catch rate)
      for (let i = CRYOPODS.length - 1; i >= 0; i--) {
        const pod = CRYOPODS[i];
        if (inventory[pod.id]?.quantity > 0) {
          selectedCryopod = pod;
          break;
        }
      }
    }

    // Final check before proceeding
    if (!selectedCryopod) {
      return message.reply(
        "You don't have any cryopods! Use `!shop` to purchase some."
      );
    }

    // Use up the cryopod
    inventory[selectedCryopod.id].quantity--;

    // Use boost if selected
    if (selectedBoost && inventory[selectedBoost.id]?.quantity > 0) {
      inventory[selectedBoost.id].quantity--;
    }

    // Update inventory
    await db.set(`inventory_${userId}`, inventory);

    // Set cooldown
    await db.set(`catch_${userId}`, Date.now());

    // Generate random dinosaur and attempt to catch
    await attemptCatch(
      message,
      userId,
      displayName,
      selectedCryopod,
      selectedBoost
    );
  },
};

// Select a random dinosaur based on chances
function selectRandomDinosaur(userId) {
  // Check for active prayer buff
  const prayBuff = db.get(`prayBuff_${userId}`);

  // If prayer buff is active and not expired
  const hasPrayerBuff = prayBuff && prayBuff.expiry > Date.now();

  // Apply rarity weights based on prayer buff
  let rarityWeights = {
    common: 1.0,
    uncommon: 1.0,
    rare: 1.0,
    legendary: 1.0,
  };

  if (hasPrayerBuff) {
    // Boost rare and legendary chances based on prayer boost percentage
    const boostMultiplier = 1 + prayBuff.rareBoost / 100;
    rarityWeights.rare *= boostMultiplier;
    rarityWeights.legendary *= boostMultiplier;

    // Slightly reduce common chances to balance
    rarityWeights.common *= 0.9;
  }

  const roll = Math.random() * 100;
  let chanceSum = 0;

  // Group dinosaurs by rarity for weighted selection
  const dinosByRarity = {
    common: DINOSAURS.filter((dino) => dino.rarity === "common"),
    uncommon: DINOSAURS.filter((dino) => dino.rarity === "uncommon"),
    rare: DINOSAURS.filter((dino) => dino.rarity === "rare"),
    legendary: DINOSAURS.filter((dino) => dino.rarity === "legendary"),
  };

  // Calculate total weighted chance
  const totalChance = DINOSAURS.reduce((sum, dino) => {
    return sum + dino.chance * rarityWeights[dino.rarity];
  }, 0);

  // Select dinosaur with weighted probability
  for (const dino of DINOSAURS) {
    // Apply rarity weight to this dino's chance
    const weightedChance =
      dino.chance * rarityWeights[dino.rarity] * (100 / totalChance);
    chanceSum += weightedChance;

    if (roll < chanceSum) {
      return {
        dinosaur: dino,
        hasPrayerBuff: hasPrayerBuff,
        prayBoost: hasPrayerBuff ? prayBuff.rareBoost : 0,
      };
    }
  }

  // Fallback to first dino (shouldn't happen)
  return {
    dinosaur: DINOSAURS[0],
    hasPrayerBuff: hasPrayerBuff,
    prayBoost: hasPrayerBuff ? prayBuff.rareBoost : 0,
  };
}

// Calculate catch success chance
function calculateCatchChance(cryopod, boost, dinosaur, userId) {
  // Base catch rate from cryopod
  let catchChance = cryopod.catchRate;

  // Add tier bonus/penalty
  catchChance += cryopod.tierBonus[dinosaur.tier] || 0;

  // Add boost if present
  if (boost) {
    catchChance += boost.boostAmount;
  }

  // Check for active buffs from the use command
  // Fix: Make sure buffs is an array before using filter
  const buffs = db.get(`buffs_${userId}`);
  const currentBuffs = Array.isArray(buffs)
    ? buffs.filter((buff) => buff.expiry > Date.now() || buff.expiry === -1)
    : [];

  if (currentBuffs.length > 0) {
    // Apply buffs based on their effect type and dinosaur rarity/tier
    for (const buff of currentBuffs) {
      // Check for guaranteed catch
      if (buff.effect.type === "guaranteed_catch") {
        catchChance = 1.0; // 100% catch rate

        // Remove the buff since it's one-time use
        const updatedBuffs = buffs.filter((b) => b.id !== buff.id);
        db.set(`buffs_${userId}`, updatedBuffs);

        break; // No need to process other buffs
      }

      // General catch rate increase
      if (buff.effect.type === "catch_rate") {
        catchChance += buff.effect.value / 100;
      }

      // Rare-specific catch rate increase
      if (
        buff.effect.type === "rare_catch_rate" &&
        (dinosaur.rarity === "rare" || dinosaur.rarity === "legendary")
      ) {
        catchChance += buff.effect.value / 100;
      }

      // High-tier specific catch rate increase
      if (
        buff.effect.type === "high_tier_catch_rate" &&
        (dinosaur.tier === "high" || dinosaur.tier === "boss")
      ) {
        catchChance += buff.effect.value / 100;
      }

      // Boss-tier specific catch rate increase
      if (buff.effect.type === "boss_catch_rate" && dinosaur.tier === "boss") {
        catchChance += buff.effect.value / 100;
      }
    }
  }

  // Ensure chance is between 0.05 (5%) and 0.95 (95%)
  return Math.max(0.05, Math.min(0.95, catchChance));
}

// Attempt to catch a dinosaur
async function attemptCatch(message, userId, displayName, cryopod, boost) {
  // Select random dinosaur
  const { dinosaur, hasPrayerBuff, prayBoost } = selectRandomDinosaur(userId);

  // Calculate catch chance
  const catchChance = calculateCatchChance(cryopod, boost, dinosaur, userId);

  // Determine if catch is successful
  const roll = Math.random();
  const success = roll <= catchChance;

  // Create initial encounter embed
  const encounterEmbed = new EmbedBuilder()
    .setColor(RARITY_COLORS[dinosaur.rarity])
    .setTitle("🦖 Wild Dinosaur Encounter!")
    .setDescription(
      `${displayName} encountered a wild **${dinosaur.name}**!\n\nPreparing **${cryopod.name}**...`
    )
    .addFields(
      { name: "Dinosaur", value: `${dinosaur.name}`, inline: true },
      {
        name: "Rarity",
        value: `${RARITY_EMOJIS[dinosaur.rarity]} ${dinosaur.rarity}`,
        inline: true,
      },
      { name: "Cryopod", value: `${cryopod.name}`, inline: true }
    )
    .setImage(dinosaur.image)
    .setThumbnail(cryopod.image)
    .setFooter({
      text: boost
        ? `Using ${boost.name} for better chances!`
        : "Good luck with your catch!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  const encounterMsg = await message.channel.send({ embeds: [encounterEmbed] });

  // Wait 2 seconds for suspense
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (success) {
    // Success! Add dinosaur to collection
    await addDinosaurToCollection(userId, dinosaur);

    // Add value to user's balance
    await db.add(`cash_${userId}`, dinosaur.value);

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setColor("#2ecc71") // Green for success
      .setTitle("🎉 Catch Successful!")
      .setDescription(
        `${displayName} successfully caught **${dinosaur.name}**!\n\nThe **${cryopod.name}** worked perfectly.`
      )
      .addFields(
        { name: "Dinosaur", value: `${dinosaur.name}`, inline: true },
        {
          name: "Rarity",
          value: `${RARITY_EMOJIS[dinosaur.rarity]} ${dinosaur.rarity}`,
          inline: true,
        },
        {
          name: "Value",
          value: `${formatNumber(dinosaur.value)} coins`,
          inline: true,
        }
      );

    // Add skill information
    if (dinosaur.skill) {
      successEmbed.addFields({
        name: `💫 Skill: ${dinosaur.skill.name}`,
        value: dinosaur.skill.description,
        inline: false,
      });
    }

    successEmbed
      .addFields({
        name: "Added to Collection",
        value: "Use `!dino " + dinosaur.name + "` to view details",
        inline: false,
      })
      .setImage(dinosaur.image)
      .setThumbnail(cryopod.image)
      .setFooter({
        text: `Catch chance was ${Math.round(catchChance * 100)}%`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await encounterMsg.edit({ embeds: [successEmbed] });
  } else {
    // Failed catch

    // Create failure embed
    const failureEmbed = new EmbedBuilder()
      .setColor("#e74c3c") // Red for failure
      .setTitle("❌ Catch Failed!")
      .setDescription(
        `${displayName}'s attempt to catch **${dinosaur.name}** failed!\n\nThe dinosaur broke free from the **${cryopod.name}** and escaped.`
      )
      .addFields(
        { name: "Dinosaur", value: `${dinosaur.name}`, inline: true },
        {
          name: "Rarity",
          value: `${RARITY_EMOJIS[dinosaur.rarity]} ${dinosaur.rarity}`,
          inline: true,
        },
        { name: "Cryopod Lost", value: `${cryopod.name}`, inline: true }
      )
      .setImage(dinosaur.image)
      .setThumbnail(cryopod.image)
      .setFooter({
        text: `Catch chance was ${Math.round(catchChance * 100)}%`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await encounterMsg.edit({ embeds: [failureEmbed] });
  }

  // Track catch attempt stats
  const catchStats = (await db.get(`catchStats_${userId}`)) || {
    attempts: 0,
    catches: 0,
  };
  catchStats.attempts++;

  if (success) {
    catchStats.catches++;
  }

  await db.set(`catchStats_${userId}`, catchStats);
}

// Add caught dinosaur to collection
async function addDinosaurToCollection(userId, dinosaur) {
  // Get dino collection
  const collection = (await db.get(`dinos_${userId}`)) || {};

  // Add or update dino in collection
  if (collection[dinosaur.name]) {
    collection[dinosaur.name].count++;
  } else {
    collection[dinosaur.name] = {
      emoji: dinosaur.emoji,
      image: dinosaur.image,
      tier: dinosaur.tier,
      rarity: dinosaur.rarity,
      value: dinosaur.value,
      skill: dinosaur.skill, // Add the skill to the collection
      count: 1,
    };
  }

  // Save collection
  await db.set(`dinos_${userId}`, collection);
}
