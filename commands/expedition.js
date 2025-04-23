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
  ComponentType,
} = require("discord.js");

// ARK resources by biome
const RESOURCES = {
  forest: [
    {
      name: "Wood",
      emoji: "🪵",
      image: "https://www.dododex.com/media/item/Wood.png",
      chance: 80,
      amount: [5, 15],
    },
    {
      name: "Thatch",
      emoji: "🌿",
      image: "https://www.dododex.com/media/item/Thatch.png",
      chance: 75,
      amount: [5, 20],
    },
    {
      name: "Fiber",
      emoji: "🧶",
      image: "https://www.dododex.com/media/item/Fiber.png",
      chance: 70,
      amount: [10, 25],
    },
    {
      name: "Berry",
      emoji: "🍇",
      image: "https://www.dododex.com/media/item/Mejoberry.png",
      chance: 65,
      amount: [5, 15],
    },
    {
      name: "Hide",
      emoji: "🧶",
      image: "https://www.dododex.com/media/item/Hide.png",
      chance: 50,
      amount: [3, 10],
    },
    {
      name: "Chitin",
      emoji: "🪲",
      image: "https://www.dododex.com/media/item/Chitin.png",
      chance: 25,
      amount: [2, 8],
    },
    {
      name: "Rare Flower",
      emoji: "🌸",
      image: "https://www.dododex.com/media/item/Rare_Flower.png",
      chance: 10,
      amount: [1, 3],
    },
    {
      name: "Rare Mushroom",
      emoji: "🍄",
      image: "https://www.dododex.com/media/item/Rare_Mushroom.png",
      chance: 10,
      amount: [1, 3],
    },
  ],
  mountain: [
    {
      name: "Stone",
      emoji: "🪨",
      image: "https://www.dododex.com/media/item/Stone.png",
      chance: 80,
      amount: [10, 20],
    },
    {
      name: "Metal",
      emoji: "🔩",
      image: "https://www.dododex.com/media/item/Metal.png",
      chance: 60,
      amount: [3, 10],
    },
    {
      name: "Crystal",
      emoji: "💎",
      image: "https://www.dododex.com/media/item/Crystal.png",
      chance: 40,
      amount: [2, 8],
    },
    {
      name: "Obsidian",
      emoji: "⬛",
      image: "https://www.dododex.com/media/item/Obsidian.png",
      chance: 35,
      amount: [2, 7],
    },
    {
      name: "Pelt",
      emoji: "🧥",
      image: "https://www.dododex.com/media/item/Pelt.png",
      chance: 30,
      amount: [2, 6],
    },
    {
      name: "Silica Pearls",
      emoji: "🔮",
      image: "https://www.dododex.com/media/item/Silica_Pearls.png",
      chance: 20,
      amount: [1, 5],
    },
    {
      name: "Element Shard",
      emoji: "✨",
      image: "https://www.dododex.com/media/item/Element_Shard.png",
      chance: 5,
      amount: [1, 3],
    },
  ],
  ocean: [
    {
      name: "Silica Pearls",
      emoji: "🔮",
      image: "https://www.dododex.com/media/item/Silica_Pearls.png",
      chance: 70,
      amount: [3, 12],
    },
    {
      name: "Oil",
      emoji: "🛢️",
      image: "https://www.dododex.com/media/item/Oil.png",
      chance: 60,
      amount: [2, 10],
    },
    {
      name: "Chitin",
      emoji: "🪲",
      image: "https://www.dododex.com/media/item/Chitin.png",
      chance: 50,
      amount: [3, 10],
    },
    {
      name: "Black Pearl",
      emoji: "⚫",
      image: "https://www.dododex.com/media/item/Black_Pearl.png",
      chance: 20,
      amount: [1, 5],
    },
    {
      name: "Organic Polymer",
      emoji: "🧪",
      image: "https://www.dododex.com/media/item/Organic_Polymer.png",
      chance: 15,
      amount: [1, 4],
    },
    {
      name: "Ambergris",
      emoji: "🟠",
      image: "https://www.dododex.com/media/item/Ambergris.png",
      chance: 8,
      amount: [1, 2],
    },
  ],
  desert: [
    {
      name: "Sand",
      emoji: "🏜️",
      image: "https://www.dododex.com/media/item/Sand.png",
      chance: 85,
      amount: [15, 30],
    },
    {
      name: "Stone",
      emoji: "🪨",
      image: "https://www.dododex.com/media/item/Stone.png",
      chance: 75,
      amount: [8, 15],
    },
    {
      name: "Crystal",
      emoji: "💎",
      image: "https://www.dododex.com/media/item/Crystal.png",
      chance: 35,
      amount: [2, 7],
    },
    {
      name: "Sulfur",
      emoji: "🟡",
      image: "https://www.dododex.com/media/item/Sulfur.png",
      chance: 30,
      amount: [2, 6],
    },
    {
      name: "Silk",
      emoji: "🧵",
      image: "https://www.dododex.com/media/item/Silk.png",
      chance: 25,
      amount: [1, 5],
    },
    {
      name: "Propellant",
      emoji: "💣",
      image: "https://www.dododex.com/media/item/Propellant.png",
      chance: 10,
      amount: [1, 3],
    },
    {
      name: "Death Worm Horn",
      emoji: "📯",
      image: "https://www.dododex.com/media/item/Death_Worm_Horn.png",
      chance: 5,
      amount: [1, 2],
    },
  ],
  snow: [
    {
      name: "Wood",
      emoji: "🪵",
      image: "https://www.dododex.com/media/item/Wood.png",
      chance: 70,
      amount: [5, 15],
    },
    {
      name: "Stone",
      emoji: "🪨",
      image: "https://www.dododex.com/media/item/Stone.png",
      chance: 65,
      amount: [5, 15],
    },
    {
      name: "Pelt",
      emoji: "🧥",
      image: "https://www.dododex.com/media/item/Pelt.png",
      chance: 60,
      amount: [5, 12],
    },
    {
      name: "Oil",
      emoji: "🛢️",
      image: "https://www.dododex.com/media/item/Oil.png",
      chance: 45,
      amount: [2, 8],
    },
    {
      name: "Obsidian",
      emoji: "⬛",
      image: "https://www.dododex.com/media/item/Obsidian.png",
      chance: 40,
      amount: [2, 7],
    },
    {
      name: "Crystal",
      emoji: "💎",
      image: "https://www.dododex.com/media/item/Crystal.png",
      chance: 35,
      amount: [2, 6],
    },
    {
      name: "Polymer",
      emoji: "⚪",
      image: "https://www.dododex.com/media/item/Polymer.png",
      chance: 15,
      amount: [1, 4],
    },
    {
      name: "Woolly Rhino Horn",
      emoji: "🦏",
      image: "https://www.dododex.com/media/item/Woolly_Rhino_Horn.png",
      chance: 5,
      amount: [1, 2],
    },
  ],
  cave: [
    {
      name: "Chitin",
      emoji: "🪲",
      image: "https://www.dododex.com/media/item/Chitin.png",
      chance: 70,
      amount: [5, 15],
    },
    {
      name: "Stone",
      emoji: "🪨",
      image: "https://www.dododex.com/media/item/Stone.png",
      chance: 65,
      amount: [5, 15],
    },
    {
      name: "Crystal",
      emoji: "💎",
      image: "https://www.dododex.com/media/item/Crystal.png",
      chance: 50,
      amount: [3, 10],
    },
    {
      name: "Metal",
      emoji: "🔩",
      image: "https://www.dododex.com/media/item/Metal.png",
      chance: 45,
      amount: [2, 8],
    },
    {
      name: "Obsidian",
      emoji: "⬛",
      image: "https://www.dododex.com/media/item/Obsidian.png",
      chance: 40,
      amount: [2, 7],
    },
    {
      name: "Rare Mushroom",
      emoji: "🍄",
      image: "https://www.dododex.com/media/item/Rare_Mushroom.png",
      chance: 35,
      amount: [2, 7],
    },
    {
      name: "Artifact",
      emoji: "🏺",
      image: "https://www.dododex.com/media/item/Artifact.png",
      chance: 10,
      amount: [1, 1],
    },
    {
      name: "Venom",
      emoji: "💉",
      image: "https://www.dododex.com/media/item/Venom.png",
      chance: 8,
      amount: [1, 3],
    },
  ],
};

// Rare special items that can be found on any expedition
const RARE_ITEMS = [
  {
    name: "Ancient Amber",
    emoji: "🔶",
    image: "https://www.dododex.com/media/item/Ancient_Amber.png",
    chance: 3,
    amount: [1, 2],
  },
  {
    name: "Element Dust",
    emoji: "✨",
    image: "https://www.dododex.com/media/item/Element_Dust.png",
    chance: 2,
    amount: [1, 5],
  },
  {
    name: "Biotoxin",
    emoji: "☠️",
    image: "https://www.dododex.com/media/item/Biotoxin.png",
    chance: 2,
    amount: [1, 3],
  },
  {
    name: "Unicorn Horn",
    emoji: "🦄",
    image: "https://www.dododex.com/media/item/Unicorn_Horn.png",
    chance: 0.5,
    amount: [1, 1],
  },
];

// Expedition biome information
const BIOMES = {
  forest: {
    name: "Forest",
    emoji: "🌲",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/0/09/Redwoods.jpg",
    description: "Lush forests filled with wood, fiber, and various berries.",
    cooldown: 30 * 60 * 1000, // 30 minutes
    duration: 10 * 60 * 1000, // 10 minutes
    dangerLevel: 1,
    preferredDinos: [
      "Therizinosaurus",
      "Brontosaurus",
      "Stegosaurus",
      "Mammoth",
    ],
  },
  mountain: {
    name: "Mountain",
    emoji: "⛰️",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/5/5e/Mountains_%28Ragnarok%29.jpg",
    description: "Rocky highlands rich in stone, metal and crystal deposits.",
    cooldown: 45 * 60 * 1000, // 45 minutes
    duration: 15 * 60 * 1000, // 15 minutes
    dangerLevel: 2,
    preferredDinos: ["Ankylosaurus", "Doedicurus", "Argentavis", "Rock Drake"],
  },
  ocean: {
    name: "Ocean",
    emoji: "🌊",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/a/a4/Ocean_Overview.jpg",
    description: "Deep waters containing pearls, oil, and aquatic treasures.",
    cooldown: 60 * 60 * 1000, // 60 minutes
    duration: 20 * 60 * 1000, // 20 minutes
    dangerLevel: 3,
    preferredDinos: ["Mosasaurus", "Tusoteuthis", "Basilosaurus", "Megachelon"],
  },
  desert: {
    name: "Desert",
    emoji: "🏜️",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/f/f3/Scorched_Earth_Panorama.jpg",
    description: "Arid wasteland with unique resources like sulfur and silk.",
    cooldown: 40 * 60 * 1000, // 40 minutes
    duration: 15 * 60 * 1000, // 15 minutes
    dangerLevel: 2,
    preferredDinos: ["Thorny Dragon", "Mantis", "Rock Drake", "Jerboa"],
  },
  snow: {
    name: "Snow",
    emoji: "❄️",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/0/0d/Snow.jpg",
    description: "Frigid mountains with oil deposits, crystal, and polymer.",
    cooldown: 50 * 60 * 1000, // 50 minutes
    duration: 15 * 60 * 1000, // 15 minutes
    dangerLevel: 3,
    preferredDinos: ["Woolly Rhino", "Mammoth", "Yutyrannus", "Snow Owl"],
  },
  cave: {
    name: "Cave",
    emoji: "🕳️",
    image:
      "https://static.wikia.nocookie.net/arksurvivalevolved_gamepedia/images/b/b0/Central_Cave.jpg",
    description:
      "Dark caverns hiding artifacts, rare mushrooms and dangerous creatures.",
    cooldown: 90 * 60 * 1000, // 90 minutes
    duration: 30 * 60 * 1000, // 30 minutes
    dangerLevel: 4,
    preferredDinos: ["Megatherium", "Baryonyx", "Dire Bear", "Thylacoleo"],
  },
};

module.exports = {
  name: "expedition",
  description: "Send your dinosaurs on an expedition to gather resources",
  aliases: ["explore", "gather"],
  usage: "!expedition [biome] [dinosaur name]",
  cooldown: 5 * 1000, // 5 second command cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user has dinosaurs
    const collection = await db.get(`dinos_${userId}`);
    if (!collection || Object.keys(collection).length === 0) {
      return message.reply(
        "You don't have any dinosaurs to send on an expedition! Use `!catch` to catch some first."
      );
    }

    // If no arguments, show expedition menu
    if (args.length === 0) {
      return showExpeditionMenu(message, userId, displayName);
    }

    // Get biome argument
    const biomeArg = args[0].toLowerCase();
    let selectedBiome = null;

    // Find matching biome
    for (const [biomeId, biomeData] of Object.entries(BIOMES)) {
      if (biomeId === biomeArg || biomeData.name.toLowerCase() === biomeArg) {
        selectedBiome = { id: biomeId, ...biomeData };
        break;
      }
    }

    // If no valid biome provided
    if (!selectedBiome) {
      return message.reply(
        `Invalid biome! Available biomes are: ${Object.keys(BIOMES)
          .map((b) => `\`${b}\``)
          .join(", ")}`
      );
    }

    // Check if user has an active expedition in this biome
    const activeExpeditions = (await db.get(`expeditions_${userId}`)) || {};
    if (activeExpeditions[selectedBiome.id]) {
      const expedition = activeExpeditions[selectedBiome.id];

      // Check if expedition is still ongoing
      if (expedition.returnTime > Date.now()) {
        const timeLeft = Math.ceil(
          (expedition.returnTime - Date.now()) / 1000 / 60
        );
        return message.reply(
          `Your ${expedition.dinosaur} is still exploring the ${selectedBiome.name}! It will return in approximately ${timeLeft} minutes.`
        );
      } else {
        // Expedition is complete, collect rewards
        return completeExpedition(
          message,
          userId,
          displayName,
          selectedBiome.id,
          expedition
        );
      }
    }

    // Check for cooldown
    const lastExpeditions =
      (await db.get(`expeditionCooldowns_${userId}`)) || {};
    if (lastExpeditions[selectedBiome.id]) {
      const cooldownCheck = checkCooldown(
        lastExpeditions[selectedBiome.id],
        selectedBiome.cooldown
      );
      if (cooldownCheck.onCooldown) {
        return message.reply(
          `This area is still being replenished with resources! Try again in **${cooldownCheck.timeLeft}**.`
        );
      }
    }

    // Get dinosaur name from remaining arguments
    const dinoName = args.slice(1).join(" ");

    // If no dinosaur name provided, show available dinosaurs
    if (!dinoName) {
      return showAvailableDinos(message, userId, displayName, selectedBiome);
    }

    // Find matching dinosaur in collection
    let matchedDino = null;
    let exactMatch = false;

    for (const [name, data] of Object.entries(collection)) {
      if (name.toLowerCase() === dinoName.toLowerCase()) {
        matchedDino = { name, ...data };
        exactMatch = true;
        break;
      } else if (
        name.toLowerCase().includes(dinoName.toLowerCase()) &&
        !exactMatch
      ) {
        matchedDino = { name, ...data };
      }
    }

    // If no matching dinosaur found
    if (!matchedDino) {
      return message.reply(
        `You don't have a dinosaur named "${dinoName}". Use \`!dinos\` to see your collection.`
      );
    }

    // Start the expedition
    startExpedition(message, userId, displayName, selectedBiome, matchedDino);
  },
};

// Show expedition menu with all available biomes
async function showExpeditionMenu(message, userId, displayName) {
  const embed = new EmbedBuilder()
    .setColor("#3498db")
    .setTitle("🧭 ARK Expeditions")
    .setDescription(
      `${displayName}, choose a biome to send your dinosaurs on an expedition:`
    )
    .setThumbnail("https://www.dododex.com/media/item/Compass.png");

  // Add biome options
  for (const [biomeId, biomeData] of Object.entries(BIOMES)) {
    embed.addFields({
      name: `${biomeData.emoji} ${biomeData.name}`,
      value: `${biomeData.description}\n**Danger Level:** ${"⚠️".repeat(
        biomeData.dangerLevel
      )}\n**Cooldown:** ${
        biomeData.cooldown / (60 * 1000)
      } minutes\n**Use:** \`!expedition ${biomeId}\``,
      inline: false,
    });
  }

  // Check active expeditions
  const activeExpeditions = (await db.get(`expeditions_${userId}`)) || {};

  if (Object.keys(activeExpeditions).length > 0) {
    let activeText = "**Active Expeditions:**\n";

    for (const [biomeId, expedition] of Object.entries(activeExpeditions)) {
      const timeLeft = Math.ceil(
        (expedition.returnTime - Date.now()) / 1000 / 60
      );
      const biome = BIOMES[biomeId];

      if (timeLeft > 0) {
        activeText += `${biome.emoji} **${biome.name}**: ${expedition.dinosaur} (${timeLeft} minutes remaining)\n`;
      } else {
        activeText += `${biome.emoji} **${biome.name}**: ${expedition.dinosaur} (Ready to collect!)\n`;
      }
    }

    embed.addFields({
      name: "🔍 Active Expeditions",
      value: activeText,
      inline: false,
    });
  }

  embed.setFooter({
    text: "Use !expedition [biome] to see eligible dinosaurs",
    iconURL: message.client.user.displayAvatarURL(),
  });

  return message.channel.send({ embeds: [embed] });
}

// Show available dinosaurs for a specific biome
async function showAvailableDinos(message, userId, displayName, biome) {
  const collection = await db.get(`dinos_${userId}`);

  // Convert collection to array for easier manipulation
  const dinoArray = [];
  for (const [name, data] of Object.entries(collection)) {
    dinoArray.push({
      name: name,
      tier: data.tier || "low",
      rarity: data.rarity || "common",
      skill: data.skill || null,
    });
  }

  // Get preferred dinos for this biome
  const preferredDinos = biome.preferredDinos || [];

  // Check if dino is preferred for this biome
  const isPreferred = (dinoName) => {
    return preferredDinos.some((name) => dinoName.includes(name));
  };

  // Sort dinosaurs - preferred ones first, then by rarity
  const rarityValues = { legendary: 4, rare: 3, uncommon: 2, common: 1 };
  dinoArray.sort((a, b) => {
    const aPref = isPreferred(a.name) ? 1 : 0;
    const bPref = isPreferred(b.name) ? 1 : 0;

    if (aPref !== bPref) {
      return bPref - aPref;
    }

    return rarityValues[b.rarity] - rarityValues[a.rarity];
  });

  const rarity_emojis = {
    common: "⚪",
    uncommon: "🟢",
    rare: "🔵",
    legendary: "🟣",
  };

  const embed = new EmbedBuilder()
    .setColor("#3498db")
    .setTitle(`${biome.emoji} ${biome.name} Expedition`)
    .setDescription(
      `${displayName}, choose a dinosaur to send to the ${biome.name.toLowerCase()}:`
    )
    .setThumbnail(biome.image);

  let dinoList = "";
  for (const dino of dinoArray.slice(0, 15)) {
    // Show up to 15 dinos
    const preferred = isPreferred(dino.name);
    const prefEmoji = preferred ? "⭐ " : "";
    const skillInfo = dino.skill ? ` - ${dino.skill.name}` : "";

    dinoList += `${prefEmoji}${rarity_emojis[dino.rarity]} **${
      dino.name
    }**${skillInfo}${preferred ? " (Bonus efficiency)" : ""}\n`;
  }

  if (dinoArray.length > 15) {
    dinoList += `\n...and ${dinoArray.length - 15} more`;
  }

  embed.addFields(
    {
      name: "Available Dinosaurs",
      value: dinoList || "No dinosaurs available.",
      inline: false,
    },
    {
      name: "Recommended Dinosaurs",
      value:
        preferredDinos.map((d) => `- ${d}`).join("\n") || "None specified.",
      inline: false,
    },
    {
      name: "How to Start",
      value: `Type \`!expedition ${biome.id} [dinosaur name]\` to send a dinosaur on an expedition.`,
      inline: false,
    }
  );

  return message.channel.send({ embeds: [embed] });
}

// Start an expedition with a specific dinosaur
async function startExpedition(message, userId, displayName, biome, dinosaur) {
  // Calculate expedition duration and return time
  const duration = biome.duration;
  const returnTime = Date.now() + duration;

  // Calculate success chance based on dinosaur rarity and biome preference
  let successChance = 70; // Base 70% success chance

  // Bonus based on rarity
  const rarityBonuses = {
    common: 0,
    uncommon: 5,
    rare: 10,
    legendary: 20,
  };
  successChance += rarityBonuses[dinosaur.rarity] || 0;

  // Bonus for preferred dinosaurs
  const isPreferred = biome.preferredDinos.some((name) =>
    dinosaur.name.includes(name)
  );
  if (isPreferred) {
    successChance += 15;
  }

  // Check for active buffs that affect expedition success
  const buffs = (await db.get(`buffs_${userId}`)) || [];
  const currentBuffs = Array.isArray(buffs)
    ? buffs.filter((buff) => buff.expiry > Date.now() || buff.expiry === -1)
    : [];

  let buffBonus = 0;
  for (const buff of currentBuffs) {
    if (buff.effect && buff.effect.type === "expedition_luck") {
      buffBonus += buff.effect.value;
    } else if (buff.effect && buff.effect.type === "all_boost") {
      buffBonus += buff.effect.value;
    }
  }

  // Apply buff bonus to success chance
  if (buffBonus > 0) {
    successChance += buffBonus;
  }

  // Cap at 95% maximum
  successChance = Math.min(95, successChance);

  // Create expedition object
  const expedition = {
    dinosaur: dinosaur.name,
    biome: biome.id,
    startTime: Date.now(),
    returnTime: returnTime,
    success: Math.random() * 100 < successChance, // Determine if expedition will be successful
    successChance: successChance,
    preferred: isPreferred,
    rarity: dinosaur.rarity,
    skill: dinosaur.skill,
  };

  // Store expedition in database
  const activeExpeditions = (await db.get(`expeditions_${userId}`)) || {};
  activeExpeditions[biome.id] = expedition;
  await db.set(`expeditions_${userId}`, activeExpeditions);

  // Create embed to show expedition started
  const minutesDuration = Math.ceil(duration / 1000 / 60);
  const embed = new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle(`${biome.emoji} Expedition Started`)
    .setDescription(
      `${displayName} sent their **${dinosaur.name}** on an expedition to the **${biome.name}**!`
    )
    .addFields(
      {
        name: "Expedition Details",
        value: `🦕 **Dinosaur:** ${dinosaur.name}\n🧭 **Destination:** ${
          biome.name
        }\n⏱️ **Duration:** ${minutesDuration} minutes\n🔄 **Return Time:** <t:${Math.floor(
          returnTime / 1000
        )}:R>`,
        inline: false,
      },
      {
        name: "Success Chance",
        value: `${successChance}%${
          isPreferred ? " (includes dinosaur bonus)" : ""
        }${buffBonus > 0 ? ` (includes ${buffBonus}% potion bonus)` : ""}`,
        inline: false,
      }
    )
    .setImage(biome.image)
    .setFooter({
      text: `Use "!expedition ${biome.id}" when the expedition is complete to collect resources`,
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Complete an expedition and collect rewards
async function completeExpedition(
  message,
  userId,
  displayName,
  biomeId,
  expedition
) {
  // Get active expeditions
  const activeExpeditions = (await db.get(`expeditions_${userId}`)) || {};

  // Remove this expedition
  delete activeExpeditions[biomeId];
  await db.set(`expeditions_${userId}`, activeExpeditions);

  // Set cooldown
  const cooldowns = (await db.get(`expeditionCooldowns_${userId}`)) || {};
  cooldowns[biomeId] = Date.now();
  await db.set(`expeditionCooldowns_${userId}`, cooldowns);

  // Get biome data
  const biome = BIOMES[biomeId];

  // Create embed for completion
  const embed = new EmbedBuilder()
    .setTitle(`${biome.emoji} Expedition Complete`)
    .setDescription(
      `${displayName}, your **${expedition.dinosaur}** has returned from the ${biome.name}!`
    )
    .setThumbnail(
      "https://www.dododex.com/media/item/Artifact_of_the_Hunter.png"
    );

  // Determine resources found
  if (expedition.success) {
    embed.setColor("#2ecc71"); // Green for success

    // Get resources for this biome
    const biomeResources = RESOURCES[biomeId];
    const resources = [];

    // Calculate number of resources to find (3-7 base)
    let resourceCount = Math.floor(Math.random() * 5) + 3;

    // Bonus resources based on dino rarity
    const rarityBonuses = {
      common: 0,
      uncommon: 1,
      rare: 2,
      legendary: 3,
    };
    resourceCount += rarityBonuses[expedition.rarity] || 0;

    // Check for active buffs that affect resource yield
    const buffs = (await db.get(`buffs_${userId}`)) || [];
    const currentBuffs = Array.isArray(buffs)
      ? buffs.filter((buff) => buff.expiry > Date.now() || buff.expiry === -1)
      : [];

    // Calculate buff-based efficiency bonus
    let buffEfficiencyBonus = 1.0;
    for (const buff of currentBuffs) {
      if (buff.effect && buff.effect.type === "resource_yield") {
        buffEfficiencyBonus += buff.effect.value / 100;
      } else if (buff.effect && buff.effect.type === "all_boost") {
        buffEfficiencyBonus += buff.effect.value / 100;
      }
    }

    // Efficiency bonus for preferred dinos
    const efficiencyMultiplier =
      (expedition.preferred ? 1.5 : 1) * buffEfficiencyBonus;

    // Determine which resources were found
    for (const resource of biomeResources) {
      if (resources.length >= resourceCount) break;

      if (Math.random() * 100 < resource.chance) {
        // Calculate amount found
        const [min, max] = resource.amount;
        let amount = Math.floor(Math.random() * (max - min + 1)) + min;

        // Apply efficiency bonus
        amount = Math.floor(amount * efficiencyMultiplier);

        resources.push({
          name: resource.name,
          emoji: resource.emoji,
          image: resource.image,
          amount: amount,
        });
      }
    }

    // Check for rare items (small chance)
    for (const rareItem of RARE_ITEMS) {
      // Apply skill bonuses to rare find chance
      let adjustedChance = rareItem.chance;
      if (
        expedition.skill &&
        (expedition.skill.effect === "rare_find" ||
          expedition.skill.effect === "treasure_detection")
      ) {
        adjustedChance += expedition.skill.power / 100;
      }

      // Apply buff bonuses
      for (const buff of currentBuffs) {
        if (buff.effect && buff.effect.type === "rare_find_bonus") {
          adjustedChance += buff.effect.value / 100;
        } else if (buff.effect && buff.effect.type === "all_boost") {
          adjustedChance += buff.effect.value / 100;
        }
      }

      if (Math.random() * 100 < adjustedChance) {
        const [min, max] = rareItem.amount;
        let amount = Math.floor(Math.random() * (max - min + 1)) + min;

        resources.push({
          name: rareItem.name,
          emoji: rareItem.emoji,
          image: rareItem.image,
          amount: amount,
          rare: true,
        });
      }
    }

    // Add resources to inventory
    const inventory = (await db.get(`resources_${userId}`)) || {};

    for (const resource of resources) {
      if (!inventory[resource.name]) {
        inventory[resource.name] = {
          emoji: resource.emoji,
          image: resource.image,
          amount: resource.amount,
        };
      } else {
        inventory[resource.name].amount += resource.amount;
      }
    }

    await db.set(`resources_${userId}`, inventory);

    // Generate resource list for embed
    let resourceList = "";
    for (const resource of resources) {
      resourceList += `${resource.emoji} **${resource.name}** x${
        resource.amount
      }${resource.rare ? " ⭐" : ""}\n`;
    }

    if (resources.length === 0) {
      resourceList = "No resources found.";
    }

    embed.addFields({
      name: "Resources Collected",
      value: resourceList,
      inline: false,
    });

    // Add buff information if any are active
    if (buffEfficiencyBonus > 1.0) {
      embed.addFields({
        name: "📈 Active Boost",
        value: `Resource yield increased by ${Math.round(
          (buffEfficiencyBonus - 1) * 100
        )}% from active potions`,
        inline: false,
      });
    }
  } else {
    // Failed expedition
    embed
      .setColor("#e74c3c") // Red for failure
      .addFields({
        name: "Expedition Failed",
        value: `Your ${expedition.dinosaur} was unable to gather any resources due to dangerous creatures in the area.`,
        inline: false,
      });
  }

  // Add cooldown information
  const cooldownMinutes = biome.cooldown / (60 * 1000);
  embed.setFooter({
    text: `This area will replenish in ${cooldownMinutes} minutes`,
    iconURL: message.client.user.displayAvatarURL(),
  });

  return message.channel.send({ embeds: [embed] });
}
