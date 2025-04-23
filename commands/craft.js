const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

// Potion recipes
const POTION_RECIPES = {
  // Catch Rate Potions
  catch_minor: {
    name: "Minor Catch Rate Potion",
    emoji: "🧪",
    color: "#3498db", // Blue
    image: "https://www.dododex.com/media/item/Lesser_Antidote.png",
    duration: 15 * 60 * 1000, // 15 minutes
    description: "Increases dinosaur catch rate by 5% for 15 minutes",
    effect: {
      type: "catch_rate",
      value: 5,
    },
    ingredients: [
      { name: "Rare Flower", amount: 3 },
      { name: "Berry", amount: 10 },
      { name: "Narcotic", amount: 5 },
    ],
    category: "catching",
  },
  catch_standard: {
    name: "Standard Catch Rate Potion",
    emoji: "🧪",
    color: "#2980b9", // Darker blue
    image: "https://www.dododex.com/media/item/Antidote.png",
    duration: 30 * 60 * 1000, // 30 minutes
    description: "Increases dinosaur catch rate by 10% for 30 minutes",
    effect: {
      type: "catch_rate",
      value: 10,
    },
    ingredients: [
      { name: "Rare Flower", amount: 5 },
      { name: "Rare Mushroom", amount: 3 },
      { name: "Narcotic", amount: 8 },
      { name: "Biotoxin", amount: 1 },
    ],
    category: "catching",
  },
  catch_major: {
    name: "Major Catch Rate Potion",
    emoji: "⚗️",
    color: "#1abc9c", // Turquoise
    image: "https://www.dododex.com/media/item/Medical_Brew.png",
    duration: 60 * 60 * 1000, // 60 minutes
    description: "Increases dinosaur catch rate by 15% for 60 minutes",
    effect: {
      type: "catch_rate",
      value: 15,
    },
    ingredients: [
      { name: "Rare Flower", amount: 10 },
      { name: "Rare Mushroom", amount: 6 },
      { name: "Narcotic", amount: 15 },
      { name: "Biotoxin", amount: 3 },
      { name: "Element Dust", amount: 2 },
    ],
    category: "catching",
  },

  // Rare Find Potions
  rare_minor: {
    name: "Minor Rare Find Potion",
    emoji: "🧪",
    color: "#9b59b6", // Purple
    image: "https://www.dododex.com/media/item/Lesser_Antidote.png",
    duration: 15 * 60 * 1000, // 15 minutes
    description: "Increases rare dinosaur encounter rate by 5% for 15 minutes",
    effect: {
      type: "rare_catch_rate",
      value: 5,
    },
    ingredients: [
      { name: "Rare Flower", amount: 5 },
      { name: "Rare Mushroom", amount: 3 },
      { name: "Black Pearl", amount: 1 },
    ],
    category: "rare",
  },
  rare_standard: {
    name: "Standard Rare Find Potion",
    emoji: "🧪",
    color: "#8e44ad", // Darker purple
    image: "https://www.dododex.com/media/item/Antidote.png",
    duration: 30 * 60 * 1000, // 30 minutes
    description: "Increases rare dinosaur encounter rate by 10% for 30 minutes",
    effect: {
      type: "rare_catch_rate",
      value: 10,
    },
    ingredients: [
      { name: "Rare Flower", amount: 8 },
      { name: "Rare Mushroom", amount: 5 },
      { name: "Black Pearl", amount: 3 },
      { name: "Element Dust", amount: 1 },
    ],
    category: "rare",
  },
  rare_major: {
    name: "Major Rare Find Potion",
    emoji: "⚗️",
    color: "#8e44ad", // Darker purple
    image: "https://www.dododex.com/media/item/Medical_Brew.png",
    duration: 60 * 60 * 1000, // 60 minutes
    description: "Increases rare dinosaur encounter rate by 20% for 60 minutes",
    effect: {
      type: "rare_catch_rate",
      value: 20,
    },
    ingredients: [
      { name: "Rare Flower", amount: 15 },
      { name: "Rare Mushroom", amount: 10 },
      { name: "Black Pearl", amount: 5 },
      { name: "Element Dust", amount: 3 },
      { name: "Ancient Amber", amount: 1 },
    ],
    category: "rare",
  },

  // Lucky Potions (for expeditions)
  luck_minor: {
    name: "Minor Lucky Expedition Potion",
    emoji: "🍀",
    color: "#2ecc71", // Green
    image: "https://www.dododex.com/media/item/Enduro_Stew.png",
    duration: 15 * 60 * 1000, // 15 minutes
    description: "Increases expedition success chance by 5% for 15 minutes",
    effect: {
      type: "expedition_luck",
      value: 5,
    },
    ingredients: [
      { name: "Rare Flower", amount: 3 },
      { name: "Rare Mushroom", amount: 3 },
      { name: "Crystal", amount: 5 },
    ],
    category: "expedition",
  },
  luck_standard: {
    name: "Standard Lucky Expedition Potion",
    emoji: "🍀",
    color: "#27ae60", // Darker green
    image: "https://www.dododex.com/media/item/Lazarus_Chowder.png",
    duration: 30 * 60 * 1000, // 30 minutes
    description: "Increases expedition success chance by 10% for 30 minutes",
    effect: {
      type: "expedition_luck",
      value: 10,
    },
    ingredients: [
      { name: "Rare Flower", amount: 6 },
      { name: "Rare Mushroom", amount: 6 },
      { name: "Crystal", amount: 10 },
      { name: "Silica Pearls", amount: 5 },
    ],
    category: "expedition",
  },
  luck_major: {
    name: "Major Lucky Expedition Potion",
    emoji: "🍀",
    color: "#27ae60", // Darker green
    image: "https://www.dododex.com/media/item/Focal_Chili.png",
    duration: 60 * 60 * 1000, // 60 minutes
    description: "Increases expedition success chance by 15% for 60 minutes",
    effect: {
      type: "expedition_luck",
      value: 15,
    },
    ingredients: [
      { name: "Rare Flower", amount: 10 },
      { name: "Rare Mushroom", amount: 10 },
      { name: "Crystal", amount: 15 },
      { name: "Silica Pearls", amount: 10 },
      { name: "Element Dust", amount: 3 },
    ],
    category: "expedition",
  },

  // Resource Potions
  resource_minor: {
    name: "Minor Resource Potion",
    emoji: "🧰",
    color: "#e67e22", // Orange
    image: "https://www.dododex.com/media/item/Enduro_Stew.png",
    duration: 15 * 60 * 1000, // 15 minutes
    description: "Increases expedition resource yield by 10% for 15 minutes",
    effect: {
      type: "resource_yield",
      value: 10,
    },
    ingredients: [
      { name: "Metal", amount: 5 },
      { name: "Crystal", amount: 3 },
      { name: "Obsidian", amount: 3 },
    ],
    category: "expedition",
  },
  resource_standard: {
    name: "Standard Resource Potion",
    emoji: "🧰",
    color: "#d35400", // Darker orange
    image: "https://www.dododex.com/media/item/Lazarus_Chowder.png",
    duration: 30 * 60 * 1000, // 30 minutes
    description: "Increases expedition resource yield by 20% for 30 minutes",
    effect: {
      type: "resource_yield",
      value: 20,
    },
    ingredients: [
      { name: "Metal", amount: 10 },
      { name: "Crystal", amount: 6 },
      { name: "Obsidian", amount: 6 },
      { name: "Oil", amount: 5 },
    ],
    category: "expedition",
  },
  resource_major: {
    name: "Major Resource Potion",
    emoji: "🧰",
    color: "#d35400", // Darker orange
    image: "https://www.dododex.com/media/item/Battle_Tartare.png",
    duration: 60 * 60 * 1000, // 60 minutes
    description: "Increases expedition resource yield by 30% for 60 minutes",
    effect: {
      type: "resource_yield",
      value: 30,
    },
    ingredients: [
      { name: "Metal", amount: 20 },
      { name: "Crystal", amount: 12 },
      { name: "Obsidian", amount: 12 },
      { name: "Oil", amount: 10 },
      { name: "Element Dust", amount: 2 },
    ],
    category: "expedition",
  },

  // Special Potions
  guaranteed_catch: {
    name: "Guaranteed Catch Serum",
    emoji: "💉",
    color: "#e74c3c", // Red
    image: "https://www.dododex.com/media/item/Shadow_Steak_Saute.png",
    duration: -1, // One-time use
    description: "Guarantees a successful catch on your next attempt",
    effect: {
      type: "guaranteed_catch",
      value: 100,
    },
    ingredients: [
      { name: "Black Pearl", amount: 5 },
      { name: "Biotoxin", amount: 5 },
      { name: "Element Dust", amount: 5 },
      { name: "Ancient Amber", amount: 1 },
      { name: "Unicorn Horn", amount: 1 },
    ],
    category: "special",
  },
  rare_finder: {
    name: "Legendary Finder Elixir",
    emoji: "🔮",
    color: "#9b59b6", // Purple
    image: "https://www.dododex.com/media/item/Bug_Repellant.png",
    duration: 15 * 60 * 1000, // 15 minutes
    description:
      "Increases legendary dinosaur encounter rate by 10% for 15 minutes",
    effect: {
      type: "legendary_rate",
      value: 10,
    },
    ingredients: [
      { name: "Ancient Amber", amount: 2 },
      { name: "Black Pearl", amount: 10 },
      { name: "Element Dust", amount: 10 },
      { name: "Unicorn Horn", amount: 1 },
    ],
    category: "special",
  },
  element_brew: {
    name: "Element Infusion Brew",
    emoji: "⚡",
    color: "#3498db", // Blue
    image: "https://www.dododex.com/media/item/Element.png",
    duration: 30 * 60 * 1000, // 30 minutes
    description:
      "Increases all yields, catch rates, and success chances by 5% for 30 minutes",
    effect: {
      type: "all_boost",
      value: 5,
    },
    ingredients: [
      { name: "Element Dust", amount: 15 },
      { name: "Ancient Amber", amount: 3 },
      { name: "Black Pearl", amount: 15 },
      { name: "Artifact", amount: 1 },
    ],
    category: "special",
  },
};

// Basic crafting materials that can be created from raw resources
const CRAFTING_MATERIALS = {
  narcotic: {
    name: "Narcotic",
    emoji: "💊",
    image: "https://www.dododex.com/media/item/Narcotic.png",
    description: "Basic crafting material used in potions",
    ingredients: [
      { name: "Berry", amount: 5 },
      { name: "Spoiled Meat", amount: 1 },
    ],
  },
  spoiled_meat: {
    name: "Spoiled Meat",
    emoji: "🥩",
    image: "https://www.dododex.com/media/item/Spoiled_Meat.png",
    description: "Created by letting meat spoil over time",
    autoCreated: true, // Automatically created over time
  },
  polymer: {
    name: "Polymer",
    emoji: "⚪",
    image: "https://www.dododex.com/media/item/Polymer.png",
    description: "Advanced crafting material",
    ingredients: [
      { name: "Organic Polymer", amount: 2 },
      { name: "Obsidian", amount: 1 },
    ],
  },
};

// Potion categories for organization
const POTION_CATEGORIES = {
  catching: {
    name: "Catching Potions",
    description: "Potions that improve your chances of catching dinosaurs",
    emoji: "🦖",
  },
  rare: {
    name: "Rarity Potions",
    description: "Potions that increase your chances of finding rare dinosaurs",
    emoji: "✨",
  },
  expedition: {
    name: "Expedition Potions",
    description: "Potions that improve expedition success and resources",
    emoji: "🧭",
  },
  special: {
    name: "Special Potions",
    description: "Powerful, unique potions with extraordinary effects",
    emoji: "⚡",
  },
};

module.exports = {
  name: "craft",
  description:
    "Craft potions and items using resources gathered from expeditions",
  aliases: ["brewing", "alchemy", "potions"],
  usage: "!craft [potion name] or !craft list",
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Get user's resources
    const resources = (await db.get(`resources_${userId}`)) || {};

    // If no arguments, show the crafting menu
    if (args.length === 0) {
      return showCraftingMenu(message, userId, displayName);
    }

    const subCommand = args[0].toLowerCase();

    // Command to list potions
    if (subCommand === "list" || subCommand === "potions") {
      return showPotionsList(message, userId, displayName, args[1]);
    }

    // Command to show inventory
    if (
      subCommand === "inventory" ||
      subCommand === "resources" ||
      subCommand === "mats"
    ) {
      return showResources(message, userId, displayName);
    }

    // Command to show recipe for a specific potion
    if (subCommand === "recipe" || subCommand === "info") {
      const potionName = args.slice(1).join(" ").toLowerCase();
      return showPotionRecipe(message, userId, displayName, potionName);
    }

    // Command to craft a potion
    const potionToCraft = args.join(" ").toLowerCase();
    let matchedPotion = null;
    let exactMatch = false;

    // Find matching potion
    for (const [id, potion] of Object.entries(POTION_RECIPES)) {
      if (potion.name.toLowerCase() === potionToCraft) {
        matchedPotion = { id, ...potion };
        exactMatch = true;
        break;
      } else if (potion.name.toLowerCase().includes(potionToCraft)) {
        matchedPotion = { id, ...potion };
        if (!exactMatch) break;
      }
    }

    // If no potion matched
    if (!matchedPotion) {
      return message.reply(
        `I couldn't find a potion named "${potionToCraft}". Use \`!craft list\` to see available potions.`
      );
    }

    // Craft the potion
    craftPotion(message, userId, displayName, matchedPotion);
  },
};

// Show main crafting menu
async function showCraftingMenu(message, userId, displayName) {
  const embed = new EmbedBuilder()
    .setColor("#3498db")
    .setTitle("🧪 ARK Crafting & Alchemy")
    .setDescription(`Welcome to the Crafting Station, ${displayName}!`)
    .setThumbnail("https://www.dododex.com/media/item/Industrial_Cooker.png");

  // Add category sections
  for (const [categoryId, category] of Object.entries(POTION_CATEGORIES)) {
    embed.addFields({
      name: `${category.emoji} ${category.name}`,
      value: `${category.description}\nView with \`!craft list ${categoryId}\``,
      inline: true,
    });
  }

  embed.addFields({
    name: "Available Commands",
    value:
      "`!craft list` - View all available potions\n" +
      "`!craft list [category]` - View potions in a specific category\n" +
      "`!craft inventory` - View your resources\n" +
      "`!craft recipe [potion]` - View recipe for a specific potion\n" +
      "`!craft [potion name]` - Craft a specific potion",
    inline: false,
  });

  // Show active potions
  const activeBuffs = (await db.get(`buffs_${userId}`)) || [];
  if (activeBuffs.length > 0) {
    const currentBuffs = activeBuffs.filter(
      (buff) => buff.expiry > Date.now() || buff.expiry === -1
    );

    if (currentBuffs.length > 0) {
      let buffsText = "";

      for (const buff of currentBuffs) {
        const timeLeft =
          buff.expiry === -1
            ? "until used"
            : `<t:${Math.floor(buff.expiry / 1000)}:R>`;
        buffsText += `${buff.emoji} **${buff.name}**: ${buff.description} (Expires ${timeLeft})\n`;
      }

      embed.addFields({
        name: "Active Potions",
        value: buffsText,
        inline: false,
      });
    }
  }

  return message.channel.send({ embeds: [embed] });
}

// Show list of available potions
async function showPotionsList(message, userId, displayName, category = null) {
  // Get user's resources
  const resources = (await db.get(`resources_${userId}`)) || {};

  let potions;
  let title;
  let color;

  if (category && POTION_CATEGORIES[category]) {
    // Filter potions by category
    potions = Object.entries(POTION_RECIPES)
      .filter(([id, potion]) => potion.category === category)
      .map(([id, potion]) => ({ id, ...potion }));

    title = `${POTION_CATEGORIES[category].emoji} ${POTION_CATEGORIES[category].name}`;
    color = "#3498db";
  } else {
    // Show all potions
    potions = Object.entries(POTION_RECIPES).map(([id, potion]) => ({
      id,
      ...potion,
    }));
    title = "🧪 All Available Potions";
    color = "#9b59b6";
  }

  // Sort potions by category
  potions.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`Here are the potions you can craft, ${displayName}:`)
    .setThumbnail("https://www.dododex.com/media/item/Beer_Jar.png");

  // Group potions by category for display
  const potionsByCategory = {};

  for (const potion of potions) {
    if (!potionsByCategory[potion.category]) {
      potionsByCategory[potion.category] = [];
    }

    // Check if user has ingredients
    const canCraft = checkIngredients(resources, potion.ingredients);
    const statusEmoji = canCraft ? "✅" : "❌";

    potionsByCategory[potion.category].push(
      `${statusEmoji} ${potion.emoji} **${potion.name}**`
    );
  }

  // Add each category to the embed
  for (const [categoryId, categoryPotions] of Object.entries(
    potionsByCategory
  )) {
    if (categoryPotions.length > 0) {
      const categoryInfo = POTION_CATEGORIES[categoryId];

      embed.addFields({
        name: `${categoryInfo.emoji} ${categoryInfo.name}`,
        value: categoryPotions.join("\n"),
        inline: false,
      });
    }
  }

  embed.addFields({
    name: "How to Craft",
    value:
      "Use `!craft recipe [potion name]` to see ingredients\nUse `!craft [potion name]` to craft a potion",
    inline: false,
  });

  embed.setFooter({
    text: "✅ = You have the ingredients | ❌ = Missing some ingredients",
    iconURL: message.client.user.displayAvatarURL(),
  });

  return message.channel.send({ embeds: [embed] });
}

// Show user's resources
async function showResources(message, userId, displayName) {
  const resources = (await db.get(`resources_${userId}`)) || {};

  if (Object.keys(resources).length === 0) {
    return message.reply(
      "You don't have any resources yet! Use `!expedition` to send your dinosaurs to gather resources."
    );
  }

  const embed = new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("🎒 Resource Inventory")
    .setDescription(`${displayName}'s expedition resources:`)
    .setThumbnail("https://www.dododex.com/media/item/Inventory.png");

  // Group resources by type
  const resourceGroups = {
    common: [],
    uncommon: [],
    rare: [],
  };

  // Sort resources into groups
  for (const [name, data] of Object.entries(resources)) {
    const amount = data.amount || 0;
    if (amount > 0) {
      // Categorize by rarity (based on some known rare resources)
      let group = "common";

      if (
        [
          "Black Pearl",
          "Element Dust",
          "Ancient Amber",
          "Artifact",
          "Unicorn Horn",
          "Death Worm Horn",
          "Venom",
          "Biotoxin",
        ].includes(name)
      ) {
        group = "rare";
      } else if (
        [
          "Crystal",
          "Oil",
          "Silica Pearls",
          "Obsidian",
          "Polymer",
          "Metal",
          "Rare Flower",
          "Rare Mushroom",
        ].includes(name)
      ) {
        group = "uncommon";
      }

      resourceGroups[group].push(`${data.emoji} **${name}**: ${amount}`);
    }
  }

  // Add each group to embed if not empty
  if (resourceGroups.rare.length > 0) {
    embed.addFields({
      name: "🌟 Rare Resources",
      value: resourceGroups.rare.join("\n"),
      inline: false,
    });
  }

  if (resourceGroups.uncommon.length > 0) {
    embed.addFields({
      name: "✨ Uncommon Resources",
      value: resourceGroups.uncommon.join("\n"),
      inline: false,
    });
  }

  if (resourceGroups.common.length > 0) {
    embed.addFields({
      name: "📦 Common Resources",
      value: resourceGroups.common.join("\n"),
      inline: false,
    });
  }

  embed.setFooter({
    text: "Use !expedition to gather more resources | !craft list to view potions",
    iconURL: message.client.user.displayAvatarURL(),
  });

  return message.channel.send({ embeds: [embed] });
}

// Show recipe for a specific potion
async function showPotionRecipe(message, userId, displayName, potionName) {
  if (!potionName) {
    return message.reply(
      "Please specify a potion name. Example: `!craft recipe Minor Catch Rate Potion`"
    );
  }

  // Get user's resources
  const resources = (await db.get(`resources_${userId}`)) || {};

  // Find matching potion
  let matchedPotion = null;

  for (const [id, potion] of Object.entries(POTION_RECIPES)) {
    if (potion.name.toLowerCase().includes(potionName)) {
      matchedPotion = { id, ...potion };
      break;
    }
  }

  if (!matchedPotion) {
    return message.reply(
      `I couldn't find a potion named "${potionName}". Use \`!craft list\` to see available potions.`
    );
  }

  const embed = new EmbedBuilder()
    .setColor(matchedPotion.color || "#3498db")
    .setTitle(`${matchedPotion.emoji} ${matchedPotion.name} Recipe`)
    .setDescription(matchedPotion.description)
    .setThumbnail(matchedPotion.image);

  // Add ingredients list
  let ingredientsList = "";
  let canCraft = true;

  for (const ingredient of matchedPotion.ingredients) {
    const userHas = resources[ingredient.name]
      ? resources[ingredient.name].amount || 0
      : 0;
    const hasEnough = userHas >= ingredient.amount;

    if (!hasEnough) canCraft = false;

    const emoji = hasEnough ? "✅" : "❌";
    const resourceEmoji = resources[ingredient.name]
      ? resources[ingredient.name].emoji
      : "📦";

    ingredientsList += `${emoji} ${resourceEmoji} **${ingredient.name}**: ${userHas}/${ingredient.amount}\n`;
  }

  embed.addFields(
    {
      name: "Required Ingredients",
      value: ingredientsList,
      inline: false,
    },
    {
      name: "Effect",
      value: matchedPotion.description,
      inline: true,
    },
    {
      name: "Duration",
      value:
        matchedPotion.duration === -1
          ? "One-time use"
          : `${matchedPotion.duration / (60 * 1000)} minutes`,
      inline: true,
    },
    {
      name: "How to Craft",
      value: canCraft
        ? `You have all the ingredients! Type \`!craft ${matchedPotion.name}\` to create this potion.`
        : "You're missing some ingredients. Send your dinosaurs on expeditions to gather more resources!",
      inline: false,
    }
  );

  return message.channel.send({ embeds: [embed] });
}

// Check if user has all required ingredients
function checkIngredients(resources, ingredients) {
  for (const ingredient of ingredients) {
    const userHas = resources[ingredient.name]
      ? resources[ingredient.name].amount || 0
      : 0;
    if (userHas < ingredient.amount) {
      return false;
    }
  }
  return true;
}

// Craft a potion
async function craftPotion(message, userId, displayName, potion) {
  // Get user's resources
  const resources = (await db.get(`resources_${userId}`)) || {};

  // Check if user has all ingredients
  const hasIngredients = checkIngredients(resources, potion.ingredients);

  if (!hasIngredients) {
    return showPotionRecipe(message, userId, displayName, potion.name);
  }

  // Deduct ingredients from resources
  for (const ingredient of potion.ingredients) {
    resources[ingredient.name].amount -= ingredient.amount;
  }

  // Save updated resources
  await db.set(`resources_${userId}`, resources);

  // Add potion to user's buffs
  const expiry = potion.duration === -1 ? -1 : Date.now() + potion.duration;
  const potionBuff = {
    id: `potion_${Date.now()}`,
    name: potion.name,
    emoji: potion.emoji,
    description: potion.description,
    effect: potion.effect,
    expiry: expiry,
    imageUrl: potion.image,
  };

  // Get existing buffs and add the new potion
  const buffs = (await db.get(`buffs_${userId}`)) || [];
  buffs.push(potionBuff);
  await db.set(`buffs_${userId}`, buffs);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor(potion.color || "#2ecc71")
    .setTitle(`${potion.emoji} Potion Crafted Successfully!`)
    .setDescription(`${displayName} successfully crafted a **${potion.name}**!`)
    .setThumbnail(potion.image)
    .addFields(
      {
        name: "Effect",
        value: potion.description,
        inline: false,
      },
      {
        name: "Duration",
        value:
          potion.duration === -1
            ? "One-time use (until consumed)"
            : `${
                potion.duration / (60 * 1000)
              } minutes (expires <t:${Math.floor(
                (Date.now() + potion.duration) / 1000
              )}:R>)`,
        inline: false,
      }
    );

  // Add list of ingredients used
  let ingredientText = "";
  for (const ingredient of potion.ingredients) {
    const emoji = resources[ingredient.name]?.emoji || "📦";
    ingredientText += `${emoji} **${ingredient.name}** x${ingredient.amount}\n`;
  }

  embed.addFields({
    name: "Ingredients Used",
    value: ingredientText,
    inline: false,
  });

  // Add instruction on how to use based on potion type
  let usageText =
    "Your potion has been added to your active buffs automatically! ";

  if (
    potion.effect.type === "catch_rate" ||
    potion.effect.type === "rare_catch_rate"
  ) {
    usageText += "It will be applied when you use the `!catch` command.";
  } else if (
    potion.effect.type === "expedition_luck" ||
    potion.effect.type === "resource_yield"
  ) {
    usageText +=
      "It will be applied when you start or complete expeditions with `!expedition`.";
  } else if (potion.effect.type === "guaranteed_catch") {
    usageText += "It will be used automatically on your next `!catch` attempt.";
  } else if (potion.effect.type === "all_boost") {
    usageText += "It will boost all your activities.";
  }

  embed.addFields({
    name: "How to Use",
    value: usageText,
    inline: false,
  });

  embed.setFooter({
    text: "Craft more potions with !craft | Check active potions with !status",
    iconURL: message.client.user.displayAvatarURL(),
  });

  return message.channel.send({ embeds: [embed] });
}
