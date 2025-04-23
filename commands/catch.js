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
  {
    name: "Hesperornis",
    emoji: "🐧",
    image: "https://www.dododex.com/media/creature/hesperornis.png",
    tier: "low",
    rarity: "common",
    value: 140,
    chance: 19,
    skill: {
      name: "Fisher",
      description: "Has a 7% chance to produce organic polymer daily",
      effect: "polymer_production",
      power: 7,
    },
  },
  {
    name: "Pegomastax",
    emoji: "🦎",
    image: "https://www.dododex.com/media/creature/pegomastax.png",
    tier: "low",
    rarity: "common",
    value: 85,
    chance: 25,
    skill: {
      name: "Thief",
      description: "Has a 3% chance to steal extra items when hunting",
      effect: "steal_bonus",
      power: 3,
    },
  },
  {
    name: "Jerboa",
    emoji: "🐭",
    image: "https://www.dododex.com/media/creature/jerboa.png",
    tier: "low",
    rarity: "common",
    value: 95,
    chance: 23,
    skill: {
      name: "Weather Warning",
      description: "Increases weather-based rewards by 4%",
      effect: "weather_sense",
      power: 4,
    },
  },
  {
    name: "Mesopithecus",
    emoji: "🐒",
    image: "https://www.dododex.com/media/creature/mesopithecus.png",
    tier: "low",
    rarity: "common",
    value: 105,
    chance: 21,
    skill: {
      name: "Berry Gatherer",
      description: "Increases berry gathering efficiency by 5%",
      effect: "berry_gathering",
      power: 5,
    },
  },
  {
    name: "Microraptor",
    emoji: "🐦",
    image: "https://www.dododex.com/media/creature/microraptor.png",
    tier: "low",
    rarity: "common",
    value: 145,
    chance: 18,
    skill: {
      name: "Surprise Attack",
      description: "Has a 6% chance to attack first in battles",
      effect: "first_strike",
      power: 6,
    },
  },
  {
    name: "Phiomia",
    emoji: "🐘",
    image: "https://www.dododex.com/media/creature/phiomia.png",
    tier: "low",
    rarity: "common",
    value: 115,
    chance: 21,
    skill: {
      name: "Resource Carrier",
      description: "Increases weight capacity by 8% when gathering",
      effect: "carry_weight",
      power: 8,
    },
  },
  {
    name: "Featherlight",
    emoji: "✨",
    image: "https://www.dododex.com/media/creature/featherlight.png",
    tier: "low",
    rarity: "common",
    value: 175,
    chance: 15,
    skill: {
      name: "Light Source",
      description: "Increases rare item find chance by 3% in dark areas",
      effect: "light_bonus",
      power: 3,
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
  {
    name: "Thylacoleo",
    emoji: "🦁",
    image: "https://www.dododex.com/media/creature/thylacoleo.png",
    tier: "mid",
    rarity: "uncommon",
    value: 450,
    chance: 7.1,
    skill: {
      name: "Ambush Hunter",
      description: "Has a 10% chance to perform critical hits in battle",
      effect: "critical_strike",
      power: 10,
    },
  },
  {
    name: "Pulmonoscorpius",
    emoji: "🦂",
    image: "https://www.dododex.com/media/creature/pulmonoscorpius.png",
    tier: "mid",
    rarity: "uncommon",
    value: 360,
    chance: 8.6,
    skill: {
      name: "Venom Sting",
      description: "Attacks have a 7% chance to poison enemies in battle",
      effect: "poison_attack",
      power: 7,
    },
  },
  {
    name: "Pachyrhinosaurus",
    emoji: "🦏",
    image: "https://www.dododex.com/media/creature/pachyrhinosaurus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 380,
    chance: 8.3,
    skill: {
      name: "Defensive Charge",
      description: "Gives a 9% defense bonus in battles",
      effect: "battle_defense",
      power: 9,
    },
  },
  {
    name: "Kaprosuchus",
    emoji: "🐊",
    image: "https://www.dododex.com/media/creature/kaprosuchus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 405,
    chance: 7.8,
    skill: {
      name: "Surprise Attack",
      description: "Has an 11% chance to attack first in battle",
      effect: "first_strike",
      power: 11,
    },
  },
  {
    name: "Castoroides",
    emoji: "🦫",
    image: "https://www.dododex.com/media/creature/castoroides.png",
    tier: "mid",
    rarity: "uncommon",
    value: 495,
    chance: 6.0,
    skill: {
      name: "Wood Harvester",
      description: "Increases wood gathering by 13%",
      effect: "wood_gathering",
      power: 13,
    },
  },
  {
    name: "Procoptodon",
    emoji: "🦘",
    image: "https://www.dododex.com/media/creature/procoptodon.png",
    tier: "mid",
    rarity: "uncommon",
    value: 440,
    chance: 7.2,
    skill: {
      name: "High Jump",
      description: "Reduces traveling cooldowns by 8%",
      effect: "travel_cooldown",
      power: 8,
    },
  },
  {
    name: "Gallimimus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/gallimimus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 350,
    chance: 8.8,
    skill: {
      name: "Speed Demon",
      description: "Has a 12% chance to avoid attacks in battle",
      effect: "evasion",
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
  {
    name: "Karkinos",
    emoji: "🦀",
    image: "https://www.dododex.com/media/creature/karkinos.png",
    tier: "high",
    rarity: "rare",
    value: 980,
    chance: 2.9,
    skill: {
      name: "Crushing Claws",
      description: "Has a 16% chance to stun opponents in battle",
      effect: "stun_attack",
      power: 16,
    },
  },
  {
    name: "Megalosaurus",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/megalosaurus.png",
    tier: "high",
    rarity: "rare",
    value: 935,
    chance: 3.1,
    skill: {
      name: "Night Hunter",
      description: "Gains 18% attack bonus during night hunts",
      effect: "night_power",
      power: 18,
    },
  },
  {
    name: "Gasbags",
    emoji: "🎈",
    image: "https://www.dododex.com/media/creature/gasbags.png",
    tier: "high",
    rarity: "rare",
    value: 1050,
    chance: 2.4,
    skill: {
      name: "Floating Transport",
      description: "Increases inventory capacity by 17% when gathering",
      effect: "extra_capacity",
      power: 17,
    },
  },
  {
    name: "Mantis",
    emoji: "🦗",
    image: "https://www.dododex.com/media/creature/mantis.png",
    tier: "high",
    rarity: "rare",
    value: 1080,
    chance: 2.3,
    skill: {
      name: "Tool User",
      description: "Increases all resource gathering by 15%",
      effect: "tool_efficiency",
      power: 15,
    },
  },
  {
    name: "Thorny Dragon",
    emoji: "🦎",
    image: "https://www.dododex.com/media/creature/thornydragon.png",
    tier: "high",
    rarity: "rare",
    value: 1025,
    chance: 2.6,
    skill: {
      name: "Spike Defense",
      description: "Deals 14% damage back to attackers in battle",
      effect: "reflect_damage",
      power: 14,
    },
  },
  {
    name: "Tapejara",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/tapejara.png",
    tier: "high",
    rarity: "rare",
    value: 1130,
    chance: 2.1,
    skill: {
      name: "Agile Flier",
      description: "Has a 13% chance to avoid attacks in battle",
      effect: "aerial_dodge",
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
  {
    name: "Alpha Rex",
    emoji: "☠️",
    image: "https://www.dododex.com/media/creature/rex-alpha.png",
    tier: "boss",
    rarity: "legendary",
    value: 9800,
    chance: 0.23,
    skill: {
      name: "Alpha Dominance",
      description: "Increases all damage dealt by 27% in battles",
      effect: "alpha_damage",
      power: 27,
    },
  },
  {
    name: "Enraged Triceratops",
    emoji: "🔥",
    image: "https://www.dododex.com/media/creature/triceratops.png",
    tier: "boss",
    rarity: "legendary",
    value: 8500,
    chance: 0.27,
    skill: {
      name: "Piercing Charge",
      description: "Has a 20% chance to ignore enemy defenses",
      effect: "armor_pierce",
      power: 20,
    },
  },
  {
    name: "Broodmother",
    emoji: "🕷️",
    image: "https://www.dododex.com/media/creature/broodmother.png",
    tier: "boss",
    rarity: "legendary",
    value: 16800,
    chance: 0.06,
    skill: {
      name: "Spider Minions",
      description: "Summons allies with 19% chance in battle",
      effect: "summon_minions",
      power: 19,
    },
  },
  {
    name: "Megapithecus",
    emoji: "🦍",
    image: "https://www.dododex.com/media/creature/megapithecus.png",
    tier: "boss",
    rarity: "legendary",
    value: 16200,
    chance: 0.07,
    skill: {
      name: "Boulder Throw",
      description: "Deals 28% area damage to all opponents",
      effect: "area_attack",
      power: 28,
    },
  },
  {
    name: "Dragon",
    emoji: "🐲",
    image: "https://www.dododex.com/media/creature/dragon.png",
    tier: "boss",
    rarity: "legendary",
    value: 17800,
    chance: 0.05,
    skill: {
      name: "Fire Breath",
      description: "Deals 30% damage over time to enemies",
      effect: "fire_damage",
      power: 30,
    },
  },
  {
    name: "Crystal Wyvern",
    emoji: "💎",
    image: "https://www.dododex.com/media/creature/crystal-wyvern.png",
    tier: "boss",
    rarity: "legendary",
    value: 8900,
    chance: 0.26,
    skill: {
      name: "Crystal Beam",
      description: "Has a 21% chance to stun opponents for one turn",
      effect: "crystal_stun",
      power: 21,
    },
  },
  {
    name: "Corrupted Giganotosaurus",
    emoji: "☢️",
    image:
      "https://www.dododex.com/media/creature/corrupted-giganotosaurus.png",
    tier: "boss",
    rarity: "legendary",
    value: 16000,
    chance: 0.075,
    skill: {
      name: "Corruption",
      description: "Reduces enemy healing effects by 25% in battle",
      effect: "healing_reduction",
      power: 25,
    },
  },
  {
    name: "Snow Owl",
    emoji: "🦉",
    image: "https://www.dododex.com/media/creature/snowowl.png",
    tier: "high",
    rarity: "rare",
    value: 1230,
    chance: 1.9,
    skill: {
      name: "Thermal Vision",
      description: "Increases chance to find hidden items by 16%",
      effect: "detect_hidden",
      power: 16,
    },
  },
  {
    name: "Velonasaur",
    emoji: "🦖",
    image: "https://www.dododex.com/media/creature/velonasaur.png",
    tier: "high",
    rarity: "rare",
    value: 1190,
    chance: 2.0,
    skill: {
      name: "Quill Shot",
      description: "Deals 15% damage to all enemies in battle",
      effect: "ranged_attack",
      power: 15,
    },
  },
  {
    name: "Bloodstalker",
    emoji: "🕸️",
    image: "https://www.dododex.com/media/creature/bloodstalker.png",
    tier: "high",
    rarity: "rare",
    value: 1340,
    chance: 1.75,
    skill: {
      name: "Web Snare",
      description: "Has a 14% chance to immobilize opponents",
      effect: "immobilize",
      power: 14,
    },
  },
  {
    name: "Megachelon",
    emoji: "🐢",
    image: "https://www.dododex.com/media/creature/megachelon.png",
    tier: "high",
    rarity: "rare",
    value: 1380,
    chance: 1.6,
    skill: {
      name: "Living Platform",
      description: "Increases gathering yield by 17% for team members",
      effect: "team_gathering",
      power: 17,
    },
  },
  {
    name: "X-Yutyrannus",
    emoji: "🧬",
    image: "https://www.dododex.com/media/creature/yutyrannus-x.png",
    tier: "boss",
    rarity: "legendary",
    value: 8400,
    chance: 0.28,
    skill: {
      name: "X-Mutation",
      description: "Boosts team attack by 23% in battles",
      effect: "team_attack",
      power: 23,
    },
  },
  {
    name: "Shadowmane",
    emoji: "🦁",
    image: "https://www.dododex.com/media/creature/shadowmane.png",
    tier: "high",
    rarity: "rare",
    value: 1450,
    chance: 1.55,
    skill: {
      name: "Shadow Stalker",
      description: "Has a 16% chance to turn invisible and avoid damage",
      effect: "invisibility",
      power: 16,
    },
  },
  {
    name: "Maewing",
    emoji: "🦆",
    image: "https://www.dododex.com/media/creature/maewing.png",
    tier: "mid",
    rarity: "uncommon",
    value: 520,
    chance: 5.5,
    skill: {
      name: "Nurturing",
      description: "Increases XP gain from all sources by 7%",
      effect: "xp_boost",
      power: 7,
    },
  },
  {
    name: "Noglin",
    emoji: "🧠",
    image: "https://www.dododex.com/media/creature/noglin.png",
    tier: "boss",
    rarity: "legendary",
    value: 7800,
    chance: 0.35,
    skill: {
      name: "Mind Control",
      description: "Has a 12% chance to take control of enemy attacks",
      effect: "mind_control",
      power: 12,
    },
  },
  {
    name: "Amargasaurus",
    emoji: "🦕",
    image: "https://www.dododex.com/media/creature/amargasaurus.png",
    tier: "high",
    rarity: "rare",
    value: 1290,
    chance: 1.8,
    skill: {
      name: "Sail Strike",
      description: "Has a 15% chance to deal bonus elemental damage",
      effect: "elemental_damage",
      power: 15,
    },
  },
  {
    name: "Dinopithecus",
    emoji: "🐒",
    image: "https://www.dododex.com/media/creature/dinopithecus.png",
    tier: "mid",
    rarity: "uncommon",
    value: 480,
    chance: 6.4,
    skill: {
      name: "Primate Pack",
      description: "Increases team coordination in battles by 9%",
      effect: "team_coordination",
      power: 9,
    },
  },
  {
    name: "Andrewsarchus",
    emoji: "🐗",
    image: "https://www.dododex.com/media/creature/andrewsarchus.png",
    tier: "high",
    rarity: "rare",
    value: 1320,
    chance: 1.7,
    skill: {
      name: "Saddle Gunner",
      description: "Has a 15% chance for bonus ranged damage",
      effect: "ranged_bonus",
      power: 15,
    },
  },
  {
    name: "Fenrir",
    emoji: "🐺",
    image: "https://www.dododex.com/media/creature/fenrir.png",
    tier: "boss",
    rarity: "legendary",
    value: 13500,
    chance: 0.13,
    skill: {
      name: "Frost Bite",
      description: "Has a 24% chance to freeze enemies in battle",
      effect: "frost_attack",
      power: 24,
    },
  },
  {
    name: "Fjordhawk",
    emoji: "🦅",
    image: "https://www.dododex.com/media/creature/fjordhawk.png",
    tier: "low",
    rarity: "common",
    value: 160,
    chance: 16,
    skill: {
      name: "Item Recovery",
      description: "Has a 6% chance to recover lost items when defeated",
      effect: "item_recovery",
      power: 6,
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

// Create action buttons for storing or selling caught dinosaur
function createActionButtons() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("store")
      .setLabel("Store Dinosaur")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🏆"),
    new ButtonBuilder()
      .setCustomId("sell")
      .setLabel("Sell Dinosaur")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("💰")
  );

  return row;
}

// Store the last caught dinosaur for button interactions
const lastCaught = {};

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

  // Create initial encounter embed
  const encounterEmbed = new EmbedBuilder()
    .setColor(RARITY_COLORS[dinosaur.rarity])
    .setTitle("🦖 Wild Dinosaur Appeared!")
    .setDescription(
      `A wild **${dinosaur.name}** appeared!\n\nWhat will ${displayName} do?`
    )
    .addFields(
      { name: "Dinosaur", value: `${dinosaur.name}`, inline: true },
      {
        name: "Rarity",
        value: `${RARITY_EMOJIS[dinosaur.rarity]} ${dinosaur.rarity}`,
        inline: true,
      },
      {
        name: "Catch Difficulty",
        value: getCatchDifficultyBar(catchChance),
        inline: false,
      }
    )
    .setImage(dinosaur.image)
    .setFooter({
      text: boost
        ? `Using ${boost.name} for better chances!`
        : "Choose your action!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Create action buttons - Catch or Battle
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("throw_cryopod")
      .setLabel(`Throw ${cryopod.name}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔵"),
    new ButtonBuilder()
      .setCustomId("battle")
      .setLabel("Battle")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⚔️")
  );

  const encounterMsg = await message.channel.send({
    embeds: [encounterEmbed],
    components: [actionRow],
  });

  // Store encounter data
  const encounterId = `${userId}-${Date.now()}`;
  const encounterData = {
    userId,
    dinosaur,
    cryopod,
    boost,
    catchChance,
    battled: false,
    weakened: false,
    messageId: encounterMsg.id,
  };

  // Set up collector for button interactions
  const filter = (i) =>
    (i.customId === "throw_cryopod" || i.customId === "battle") &&
    i.user.id === userId;

  const collector = encounterMsg.createMessageComponentCollector({
    filter,
    time: 60000, // 1 minute to decide
  });

  collector.on("collect", async (i) => {
    if (i.customId === "throw_cryopod") {
      // User chose to throw the cryopod immediately
      collector.stop();
      await processCryopodThrow(encounterMsg, encounterData, displayName);
    } else if (i.customId === "battle") {
      // User chose to battle first
      collector.stop();
      await startWildBattle(encounterMsg, encounterData, displayName);
    }
  });

  // If no choice is made, default to throwing the cryopod
  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await processCryopodThrow(encounterMsg, encounterData, displayName);
    }
  });
}

// Process the cryopod throw and determine if catch is successful
async function processCryopodThrow(message, encounterData, displayName) {
  const { userId, dinosaur, cryopod, boost, catchChance, battled, weakened } =
    encounterData;

  // Adjust catch chance if dinosaur was weakened in battle
  let finalCatchChance = catchChance;
  if (weakened) {
    finalCatchChance = Math.min(0.95, catchChance * 1.75); // 75% bonus, max 95%
  }

  // Create throwing animation embed
  const throwEmbed = new EmbedBuilder()
    .setColor(RARITY_COLORS[dinosaur.rarity])
    .setTitle("🎯 Cryopod Thrown!")
    .setDescription(
      `${displayName} throws a **${cryopod.name}** at the wild ${dinosaur.emoji} **${dinosaur.name}**!`
    )
    .setImage(dinosaur.image)
    .setThumbnail(cryopod.image)
    .setFooter({
      text: weakened ? "The dinosaur was weakened in battle!" : "Good luck!",
      iconURL: message.client.user.displayAvatarURL(),
    });

  await message.edit({ embeds: [throwEmbed], components: [] });

  // Wait for dramatic effect
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Pokemon-style catch sequence with shaking animation
  const pokeBallShakes = determineCatchShakes(finalCatchChance);
  const success = pokeBallShakes === 3; // 3 shakes = successful catch

  // Animate the ball shakes
  for (let i = 1; i <= pokeBallShakes; i++) {
    const shakeEmbed = new EmbedBuilder()
      .setColor(RARITY_COLORS[dinosaur.rarity])
      .setTitle(`${cryopod.name} is shaking...`)
      .setDescription(
        `${displayName}'s ${cryopod.name} shakes ${getShakeText(i)}...`
      )
      .setImage(dinosaur.image)
      .setThumbnail(cryopod.image);

    await message.edit({ embeds: [shakeEmbed] });

    // Pause between shakes
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Display final result
  if (success) {
    // Store the caught dinosaur for button interaction
    lastCaught[userId] = {
      dinosaur: dinosaur,
      cryopod: cryopod,
      messageId: message.id,
      timestamp: Date.now(),
    };

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setColor("#2ecc71") // Green for success
      .setTitle("🎊 Gotcha!")
      .setDescription(
        `${dinosaur.emoji} **${dinosaur.name}** was caught!\n\nThe **${cryopod.name}** worked perfectly.\n\n**Choose what to do with your dinosaur:**`
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
      .setImage(dinosaur.image)
      .setThumbnail(cryopod.image)
      .setFooter({
        text: `Catch chance was ${Math.round(finalCatchChance * 100)}%`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await message.edit({
      embeds: [successEmbed],
      components: [createActionButtons()],
    });

    // Set up collector for button interactions
    const filter = (i) =>
      (i.customId === "store" || i.customId === "sell") && i.user.id === userId;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "store") {
        // Add dinosaur to collection
        await addDinosaurToCollection(userId, dinosaur);

        await i.update({
          content: `${displayName} stored the **${dinosaur.name}** in their collection!`,
          components: [],
        });
      } else if (i.customId === "sell") {
        // Add value to user's balance
        await db.add(`cash_${userId}`, dinosaur.value);

        await i.update({
          content: `${displayName} sold the **${
            dinosaur.name
          }** for **${formatNumber(dinosaur.value)} coins**!`,
          components: [],
        });
      }

      // Remove from lastCaught
      delete lastCaught[userId];
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0 && lastCaught[userId]) {
        // If user didn't respond, store by default
        await addDinosaurToCollection(userId, dinosaur);

        await message.edit({
          content: `No choice made, the **${dinosaur.name}** was automatically stored in your collection!`,
          components: [],
        });

        // Remove from lastCaught
        delete lastCaught[userId];
      }
    });
  } else {
    // Failed catch
    const escapeText = getEscapeText(pokeBallShakes);

    // Create failure embed
    const failureEmbed = new EmbedBuilder()
      .setColor("#e74c3c") // Red for failure
      .setTitle("💥 Oh no! The dinosaur broke free!")
      .setDescription(
        `${escapeText}\n\n${dinosaur.emoji} **${dinosaur.name}** escaped from the **${cryopod.name}**!`
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
        text: `Catch chance was ${Math.round(finalCatchChance * 100)}%`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await message.edit({ embeds: [failureEmbed] });
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

// Start a battle with the wild dinosaur
async function startWildBattle(message, encounterData, displayName) {
  const { userId, dinosaur } = encounterData;

  // Get user's dinosaur collection
  const userDinos = (await db.get(`dinos_${userId}`)) || {};

  if (Object.keys(userDinos).length === 0) {
    // User doesn't have any dinosaurs to battle with
    await message.edit({
      content:
        "You don't have any dinosaurs to battle with! Try catching this one directly.",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("throw_direct")
            .setLabel(`Throw Cryopod`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔵")
        ),
      ],
    });

    // Set up collector for direct throw button
    const filter = (i) => i.customId === "throw_direct" && i.user.id === userId;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      collector.stop();
      await processCryopodThrow(message, encounterData, displayName);
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await processCryopodThrow(message, encounterData, displayName);
      }
    });

    return;
  }

  // Create a selection menu for dinosaurs
  const selectEmbed = new EmbedBuilder()
    .setColor(RARITY_COLORS[dinosaur.rarity])
    .setTitle("🦖 Choose Your Dinosaur")
    .setDescription(
      `${displayName}, select a dinosaur to battle the wild **${dinosaur.name}**!`
    )
    .setImage(dinosaur.image)
    .setFooter({
      text: "You have 30 seconds to select a dinosaur",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Get top 5 dinosaurs, sorted by tier and power
  const sortedDinos = Object.entries(userDinos)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => {
      // Sort by tier (boss > high > mid > low)
      const tierOrder = { boss: 3, high: 2, mid: 1, low: 0 };
      const tierDiff = tierOrder[b.tier || "low"] - tierOrder[a.tier || "low"];
      if (tierDiff !== 0) return tierDiff;

      // Then sort by level if tier is the same
      const levelDiff = (b.level || 1) - (a.level || 1);
      if (levelDiff !== 0) return levelDiff;

      // Then sort by skill power if level is the same
      const powerA = a.skill?.power || 0;
      const powerB = b.skill?.power || 0;
      return powerB - powerA;
    })
    .slice(0, 5); // Get top 5

  // Create buttons for each dinosaur
  const dinoButtons = [];
  const rows = [];

  sortedDinos.forEach((dino, idx) => {
    const button = new ButtonBuilder()
      .setCustomId(`select_dino_${idx}`)
      .setLabel(`${dino.name} (Lvl ${dino.level || 1})`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji(dino.emoji);

    dinoButtons.push(button);

    // Add details to embed
    selectEmbed.addFields({
      name: `${idx + 1}. ${dino.emoji} ${dino.name} (Lvl ${dino.level || 1})`,
      value: `**Tier:** ${
        dino.tier.charAt(0).toUpperCase() + dino.tier.slice(1)
      }
**Rarity:** ${dino.rarity.charAt(0).toUpperCase() + dino.rarity.slice(1)}
**Skill:** ${dino.skill ? dino.skill.name : "None"}`,
      inline: true,
    });
  });

  // Add "Use Best Dinosaur" button
  const useBestButton = new ButtonBuilder()
    .setCustomId(`use_best_dino`)
    .setLabel(`Use Best Dinosaur`)
    .setStyle(ButtonStyle.Success)
    .setEmoji("⭐");

  dinoButtons.push(useBestButton);

  // Split buttons into rows (max 3 buttons per row)
  for (let i = 0; i < dinoButtons.length; i += 3) {
    const row = new ActionRowBuilder().addComponents(
      dinoButtons.slice(i, Math.min(i + 3, dinoButtons.length))
    );
    rows.push(row);
  }

  // Send selection message
  await message.edit({
    embeds: [selectEmbed],
    components: rows,
  });

  // Create collector for dinosaur selection
  const filter = (i) =>
    (i.customId.startsWith("select_dino_") || i.customId === "use_best_dino") &&
    i.user.id === userId;

  const collector = message.createMessageComponentCollector({
    filter,
    time: 30000, // 30 seconds to select
  });

  collector.on("collect", async (i) => {
    collector.stop();

    let selectedDino;
    if (i.customId === "use_best_dino") {
      // Find the best dinosaur
      selectedDino = findBestDino(userDinos);
    } else {
      // Extract the index from the button ID
      const selectedIndex = parseInt(i.customId.split("_")[2]);
      if (
        !isNaN(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < sortedDinos.length
      ) {
        selectedDino = sortedDinos[selectedIndex];
      } else {
        // Fallback to the best dinosaur if something goes wrong
        selectedDino = findBestDino(userDinos);
      }
    }

    // Create battle preparation embed
    const battlePrepEmbed = new EmbedBuilder()
      .setColor(RARITY_COLORS[dinosaur.rarity])
      .setTitle("⚔️ Wild Dinosaur Battle!")
      .setDescription(
        `${displayName} sent out **${selectedDino.name}** to battle the wild **${dinosaur.name}**!`
      )
      .addFields(
        {
          name: `Your ${selectedDino.emoji} ${selectedDino.name} (Lvl ${
            selectedDino.level || 1
          })`,
          value: `Rarity: ${RARITY_EMOJIS[selectedDino.rarity]} ${
            selectedDino.rarity
          }
Tier: ${selectedDino.tier.toUpperCase()}
${selectedDino.skill ? `Skill: ${selectedDino.skill.name}` : ""}`,
          inline: true,
        },
        {
          name: `Wild ${dinosaur.emoji} ${dinosaur.name}`,
          value: `Rarity: ${RARITY_EMOJIS[dinosaur.rarity]} ${dinosaur.rarity}
Tier: ${dinosaur.tier.toUpperCase()}
${dinosaur.skill ? `Skill: ${dinosaur.skill.name}` : ""}`,
          inline: true,
        }
      )
      .setThumbnail(selectedDino.image || "https://i.imgur.com/ZrJnNDq.png");

    await i.update({ embeds: [battlePrepEmbed], components: [] });

    // Wait 2 seconds before starting battle
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create modified copies of dinosaurs for battle
    const wildDinoStats = createWildDinoStats(dinosaur);
    const userDinoStats = createUserDinoStats(selectedDino);

    // Execute battle
    await executeBattle(
      message,
      selectedDino,
      dinosaur,
      userDinoStats,
      wildDinoStats,
      encounterData,
      displayName
    );
  });

  // Handle selection timeout
  collector.on("end", async (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      // If no selection was made, use the best dinosaur
      const bestDino = findBestDino(userDinos);

      await message.edit({
        content: `No selection made in time. Using your best dinosaur: **${bestDino.name}**!`,
        components: [],
      });

      // Create battle preparation embed
      const battlePrepEmbed = new EmbedBuilder()
        .setColor(RARITY_COLORS[dinosaur.rarity])
        .setTitle("⚔️ Wild Dinosaur Battle!")
        .setDescription(
          `${displayName} sent out **${bestDino.name}** to battle the wild **${dinosaur.name}**!`
        )
        .addFields(
          {
            name: `Your ${bestDino.emoji} ${bestDino.name} (Lvl ${
              bestDino.level || 1
            })`,
            value: `Rarity: ${RARITY_EMOJIS[bestDino.rarity]} ${bestDino.rarity}
Tier: ${bestDino.tier.toUpperCase()}
${bestDino.skill ? `Skill: ${bestDino.skill.name}` : ""}`,
            inline: true,
          },
          {
            name: `Wild ${dinosaur.emoji} ${dinosaur.name}`,
            value: `Rarity: ${RARITY_EMOJIS[dinosaur.rarity]} ${dinosaur.rarity}
Tier: ${dinosaur.tier.toUpperCase()}
${dinosaur.skill ? `Skill: ${dinosaur.skill.name}` : ""}`,
            inline: true,
          }
        )
        .setThumbnail(bestDino.image || "https://i.imgur.com/ZrJnNDq.png");

      await message.edit({ embeds: [battlePrepEmbed], components: [] });

      // Wait 2 seconds before starting battle
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create modified copies of dinosaurs for battle
      const wildDinoStats = createWildDinoStats(dinosaur);
      const userDinoStats = createUserDinoStats(bestDino);

      // Execute battle
      await executeBattle(
        message,
        bestDino,
        dinosaur,
        userDinoStats,
        wildDinoStats,
        encounterData,
        displayName
      );
    }
  });
}

// Execute the battle between user's dinosaur and wild dinosaur
async function executeBattle(
  message,
  userDino,
  wildDino,
  userDinoStats,
  wildDinoStats,
  encounterData,
  displayName
) {
  const { userId } = encounterData; // Extract userId from encounterData to fix the error

  // Simplified battle loop
  let battleTurn = 0;
  let battleLogs = [];
  let battleOver = false;

  while (!battleOver && battleTurn < 10) {
    // Max 10 turns
    battleTurn++;

    // Player's turn
    if (battleTurn % 2 === 1) {
      // User attacking wild dino
      const damage = calculateDamage(userDinoStats, wildDinoStats);
      wildDinoStats.hp -= damage;

      // Check for critical hit (15% chance)
      const isCritical = Math.random() < 0.15;
      if (isCritical) {
        battleLogs.push(
          `💥 **CRITICAL HIT!** ${userDino.emoji} ${userDino.name} attacks for ${damage} damage!`
        );
      } else {
        battleLogs.push(
          `${userDino.emoji} ${userDino.name} attacks for ${damage} damage!`
        );
      }

      // Check if user has a skill and add flavor text
      if (userDino.skill && Math.random() < 0.3) {
        battleLogs.push(`✨ ${userDino.name} used ${userDino.skill.name}!`);
      }

      if (wildDinoStats.hp <= 0) {
        battleLogs.push(
          `Wild ${wildDino.emoji} ${wildDino.name} was defeated!`
        );
        battleOver = true;
      }
    } else {
      // Wild dino attacking user
      const damage = calculateDamage(wildDinoStats, userDinoStats);
      userDinoStats.hp -= damage;

      // Check for critical hit (10% chance for wild dino)
      const isCritical = Math.random() < 0.1;
      if (isCritical) {
        battleLogs.push(
          `💥 **CRITICAL HIT!** Wild ${wildDino.emoji} ${wildDino.name} attacks for ${damage} damage!`
        );
      } else {
        battleLogs.push(
          `Wild ${wildDino.emoji} ${wildDino.name} attacks for ${damage} damage!`
        );
      }

      // Check if wild dino has a skill and add flavor text
      if (wildDino.skill && Math.random() < 0.2) {
        battleLogs.push(
          `❗ Wild ${wildDino.name} used ${wildDino.skill.name}!`
        );
      }

      if (userDinoStats.hp <= 0) {
        battleLogs.push(`${userDino.emoji} ${userDino.name} was defeated!`);
        battleOver = true;
      }
    }

    // Update battle status with improved UI
    const battleEmbed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle(`⚔️ Battle Turn ${battleTurn}`)
      .addFields(
        {
          name: `Your ${userDino.emoji} ${userDino.name} (Lvl ${
            userDino.level || 1
          })`,
          value: `HP: ${createHpBar(userDinoStats.hp, userDinoStats.maxHp)} ${
            userDinoStats.hp
          }/${userDinoStats.maxHp}
Attack: ⚔️ ${userDinoStats.attack}
Defense: 🛡️ ${userDinoStats.defense}`,
          inline: true,
        },
        {
          name: `Wild ${wildDino.emoji} ${wildDino.name}`,
          value: `HP: ${createHpBar(wildDinoStats.hp, wildDinoStats.maxHp)} ${
            wildDinoStats.hp
          }/${wildDinoStats.maxHp}
Attack: ⚔️ ${wildDinoStats.attack}
Defense: 🛡️ ${wildDinoStats.defense}`,
          inline: true,
        },
        {
          name: "Battle Log",
          value: battleLogs.slice(-3).join("\n"),
          inline: false,
        }
      )
      .setImage(wildDino.image);

    await message.edit({ embeds: [battleEmbed] });

    // Add pause between turns
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Battle results
  let battleWon = wildDinoStats.hp <= 0;

  // Update encounter data
  encounterData.battled = true;
  encounterData.weakened = battleWon;

  // Create battle results embed with improved UI
  const resultsEmbed = new EmbedBuilder()
    .setColor(battleWon ? "#2ecc71" : "#e74c3c")
    .setTitle(battleWon ? "🎉 Battle Won!" : "😓 Battle Lost!")
    .setDescription(
      battleWon
        ? `${displayName}'s ${userDino.emoji} ${userDino.name} defeated the wild ${wildDino.emoji} ${wildDino.name}!\nThe wild dinosaur was weakened, making it **75% easier to catch**!`
        : `The wild ${wildDino.emoji} ${wildDino.name} was too strong!\nYou can still try to catch it, but it won't be weakened.`
    )
    .addFields({
      name: "Battle Result",
      value: battleWon
        ? `✅ Victory! The wild dinosaur is weakened and easier to catch now!
Catch chance increase: +75% (maxed at 95%)`
        : `❌ Defeat! The wild dinosaur is still at full strength!
Better luck next time!`,
      inline: false,
    })
    .setImage(wildDino.image)
    .setFooter({
      text: "Now's your chance to catch it!",
      iconURL: message.client.user.displayAvatarURL(),
    });

  // Add coins and XP if battle was won
  if (battleWon) {
    // Calculate coins based on dinosaur value and rarity
    const coinMultipliers = {
      common: 0.05,
      uncommon: 0.08,
      rare: 0.12,
      legendary: 0.15,
    };

    // Calculate coin reward (5-15% of dinosaur value based on rarity)
    const coinReward = Math.round(
      wildDino.value * (coinMultipliers[wildDino.rarity] || 0.05)
    );

    // Add coins to user balance
    await db.add(`cash_${userId}`, coinReward);

    // Add coin reward to embed
    resultsEmbed.addFields({
      name: "💰 Rewards",
      value: `You earned **${formatNumber(
        coinReward
      )} atlyss coins** for defeating the wild ${wildDino.name}!`,
      inline: false,
    });

    // Get updated collection to ensure we have the latest data
    const collection = (await db.get(`dinos_${userId}`)) || {};
    if (collection[userDino.name]) {
      // Initialize XP if not exists
      if (!collection[userDino.name].xp) collection[userDino.name].xp = 0;

      // Add random XP between 5-15
      const xpGain = Math.floor(Math.random() * 11) + 5;
      collection[userDino.name].xp += xpGain;

      // Check for level up (every 100 XP)
      const oldLevel = collection[userDino.name].level || 1;
      const newXpTotal = collection[userDino.name].xp;
      const newLevel = Math.floor(newXpTotal / 100) + 1;

      if (newLevel > oldLevel) {
        collection[userDino.name].level = newLevel;

        // Add level up information to the embed
        resultsEmbed.addFields({
          name: "🎆 Level Up!",
          value: `${userDino.emoji} ${userDino.name} gained ${xpGain} XP and leveled up to **Level ${newLevel}**!`,
          inline: false,
        });
      } else {
        // Just add XP information
        resultsEmbed.addFields({
          name: "Experience Gained",
          value: `${userDino.emoji} ${
            userDino.name
          } gained ${xpGain} XP! (${newXpTotal}/${
            newLevel * 100
          } XP to next level)`,
          inline: false,
        });
      }

      // Save updated collection
      await db.set(`dinos_${userId}`, collection);
    }
  }

  await message.edit({
    embeds: [resultsEmbed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("throw_after_battle")
          .setLabel(`Throw ${encounterData.cryopod.name}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔵")
      ),
    ],
  });

  // Set up collector for post-battle throw
  const filter = (i) =>
    i.customId === "throw_after_battle" && i.user.id === userId;
  const collector = message.createMessageComponentCollector({
    filter,
    time: 30000,
  });

  collector.on("collect", async (i) => {
    collector.stop();
    await processCryopodThrow(message, encounterData, displayName);
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await processCryopodThrow(message, encounterData, displayName);
    }
  });
}

// Helper functions for Pokemon-style catching

// Determine how many shakes the ball will make before success/failure
function determineCatchShakes(catchChance) {
  const roll = Math.random();

  // Pokemon-style: 3 shakes = catch, fewer shakes = escape
  if (roll <= catchChance) {
    return 3; // Successful capture (3 shakes)
  } else if (roll <= catchChance * 1.5) {
    return 2; // Escape after 2 shakes
  } else if (roll <= catchChance * 2) {
    return 1; // Escape after 1 shake
  } else {
    return 0; // Immediate escape
  }
}

// Get text description for each shake
function getShakeText(shakeNumber) {
  const shakeTexts = ["", "once", "twice", "three times"];

  return shakeTexts[shakeNumber];
}

// Get text description for escape based on number of shakes
function getEscapeText(shakes) {
  const escapeTexts = [
    "The dinosaur broke out immediately!",
    "The dinosaur broke free after 1 shake!",
    "So close! The dinosaur broke free after 2 shakes!",
  ];

  return escapeTexts[shakes] || "The dinosaur escaped!";
}

// Create a visual representation of catch difficulty
function getCatchDifficultyBar(catchChance) {
  let difficultyText;
  let difficultyBar = "";

  if (catchChance >= 0.8) {
    difficultyText = "Easy";
    difficultyBar = "🟩🟩🟩🟩🟩";
  } else if (catchChance >= 0.6) {
    difficultyText = "Moderate";
    difficultyBar = "🟩🟩🟩🟨⬜";
  } else if (catchChance >= 0.4) {
    difficultyText = "Challenging";
    difficultyBar = "🟩🟩🟨🟥⬜";
  } else if (catchChance >= 0.2) {
    difficultyText = "Hard";
    difficultyBar = "🟩🟨🟥🟥⬜";
  } else {
    difficultyText = "Very Hard";
    difficultyBar = "🟨🟥🟥🟥🟥";
  }

  return `${difficultyText} ${difficultyBar} (${Math.round(
    catchChance * 100
  )}%)`;
}

// Helper function to find the best dinosaur in user's collection
function findBestDino(dinos) {
  let bestDino = null;
  let highestScore = -1;

  for (const [name, data] of Object.entries(dinos)) {
    // Calculate score based on tier and skill power
    const tierScore = { low: 1, mid: 2, high: 3, boss: 4 }[data.tier || "low"];
    const powerScore = data.skill?.power || 0;
    const score = tierScore * 10 + powerScore;

    if (score > highestScore) {
      highestScore = score;
      bestDino = { name, ...data };
    }
  }

  return bestDino;
}

// Create battle stats for wild dinosaur
function createWildDinoStats(dinosaur) {
  // Use the tier-based stats from the dinobattle command
  const tierStats = {
    low: { hp: 100, attack: 10, defense: 5 },
    mid: { hp: 150, attack: 15, defense: 10 },
    high: { hp: 200, attack: 20, defense: 15 },
    boss: { hp: 250, attack: 25, defense: 20 },
  };

  const baseStats = tierStats[dinosaur.tier];

  return {
    name: dinosaur.name,
    emoji: dinosaur.emoji,
    tier: dinosaur.tier,
    rarity: dinosaur.rarity,
    hp: baseStats.hp,
    maxHp: baseStats.hp,
    attack: baseStats.attack,
    defense: baseStats.defense,
    skill: dinosaur.skill,
  };
}

// Create battle stats for user's dinosaur
function createUserDinoStats(dinosaur) {
  // Use the tier-based stats from the dinobattle command
  const tierStats = {
    low: { hp: 100, attack: 10, defense: 5 },
    mid: { hp: 150, attack: 15, defense: 10 },
    high: { hp: 200, attack: 20, defense: 15 },
    boss: { hp: 250, attack: 25, defense: 20 },
  };

  const baseStats = tierStats[dinosaur.tier];
  const level = dinosaur.level || 1;

  // Apply level bonuses (5% per level)
  return {
    name: dinosaur.name,
    emoji: dinosaur.emoji,
    tier: dinosaur.tier,
    rarity: dinosaur.rarity,
    hp: Math.floor(baseStats.hp * (1 + (level - 1) * 0.05)),
    maxHp: Math.floor(baseStats.hp * (1 + (level - 1) * 0.05)),
    attack: Math.floor(baseStats.attack * (1 + (level - 1) * 0.05)),
    defense: Math.floor(baseStats.defense * (1 + (level - 1) * 0.05)),
    skill: dinosaur.skill,
  };
}

// Calculate battle damage
function calculateDamage(attacker, defender) {
  // Similar to dinobattle system
  const rarityMultiplier = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.4,
    legendary: 1.8,
  };

  const tierMultiplier = {
    low: 1.0,
    mid: 1.3,
    high: 1.6,
    boss: 2.0,
  };

  // Calculate base damage using rarity and tier
  const baseDamage =
    attacker.attack *
    rarityMultiplier[attacker.rarity] *
    tierMultiplier[attacker.tier];

  // Apply random variation (±20%)
  const variation = Math.random() * 0.4 - 0.2;

  // Apply defense reduction
  const defenseReduction = 0.25;

  // Calculate final damage
  let damage = Math.floor(
    baseDamage *
      (1 + variation) *
      (1 - defenseReduction * (defender.defense / 100))
  );

  // Ensure minimum damage of 1
  damage = Math.max(1, damage);

  return damage;
}

// Create HP bar for battles
function createHpBar(currentHp, maxHp) {
  const percent = Math.max(0, (currentHp / maxHp) * 100);
  const fullBlocks = Math.floor(percent / 20); // 5 blocks total

  let hpBar = "";

  if (percent > 60) {
    hpBar = "🟩".repeat(fullBlocks);
  } else if (percent > 30) {
    hpBar = "🟨".repeat(fullBlocks);
  } else {
    hpBar = "🟥".repeat(fullBlocks);
  }

  hpBar += "⬜".repeat(5 - fullBlocks);

  return hpBar;
}

// Add dinosaur to user's collection
async function addDinosaurToCollection(userId, dinosaur) {
  // Get user's dinosaur collection
  const collection = (await db.get(`dinos_${userId}`)) || {};

  // Calculate base stats based on tier
  const tierStats = {
    low: { hp: 100, attack: 10, defense: 5 },
    mid: { hp: 150, attack: 15, defense: 10 },
    high: { hp: 200, attack: 20, defense: 15 },
    boss: { hp: 250, attack: 25, defense: 20 },
  };
  const baseStats = tierStats[dinosaur.tier];

  // If dinosaur already exists in collection, increment count
  if (collection[dinosaur.name]) {
    collection[dinosaur.name].count =
      (collection[dinosaur.name].count || 1) + 1;
  } else {
    // Otherwise add new dinosaur to collection
    collection[dinosaur.name] = {
      emoji: dinosaur.emoji,
      image: dinosaur.image,
      tier: dinosaur.tier,
      rarity: dinosaur.rarity,
      value: dinosaur.value,
      count: 1,
      level: 1,
      stats: { ...baseStats },
      baseStats: { ...baseStats },
    };

    // Add skill if dinosaur has one
    if (dinosaur.skill) {
      collection[dinosaur.name].skill = { ...dinosaur.skill };
    }
  }

  // Save updated collection
  await db.set(`dinos_${userId}`, collection);
}
