// filepath: c:\bot\commands\sell.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Rarity colors for display
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

// Price multipliers for selling
const SELL_MULTIPLIERS = {
  // For dinosaurs
  dinosaur: {
    default: 0.7, // 70% of value
    all: 0.75, // 75% if selling all
    rarity: {
      common: 0.6,
      uncommon: 0.65,
      rare: 0.7,
      legendary: 0.75,
    },
  },
  // For animals
  animal: {
    default: 0.6, // 60% of value
    all: 0.65, // 65% if selling all
    rarity: {
      common: 0.5,
      uncommon: 0.55,
      rare: 0.6,
      legendary: 0.65,
    },
  },
};

module.exports = {
  name: "sell",
  description: "Sell dinosaurs or animals from your collection",
  usage: "!sell [dino/animal] [name/rarity/all] [amount]",
  aliases: ["s"],
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user provided enough arguments
    if (!args.length) {
      return message.reply(
        "Please specify what you want to sell. Usage: `!sell [dino/animal] [name/rarity/all] [amount]`\n" +
          "Examples:\n" +
          "`!sell dino Dodo 3` - Sell 3 Dodos\n" +
          "`!sell dino Dodo all` - Sell all Dodos\n" +
          "`!sell dino common` - Sell all common dinosaurs\n" +
          "`!sell dino all` - Sell all dinosaurs\n" +
          "`!sell animal all` - Sell all animals from zoo"
      );
    }

    // Parse collection type (dino or animal)
    const collectionType = args[0].toLowerCase();
    if (
      collectionType !== "dino" &&
      collectionType !== "dinosaur" &&
      collectionType !== "animal" &&
      collectionType !== "animals" &&
      collectionType !== "zoo"
    ) {
      return message.reply(
        "Please specify whether you want to sell `dino` or `animal`. Example: `!sell dino Dodo 5`"
      );
    }

    // Standardize collection type
    const type =
      collectionType === "dino" || collectionType === "dinosaur"
        ? "dinosaur"
        : "animal";

    // Get the appropriate collection and multiplier
    const collectionKey =
      type === "dinosaur" ? `dinos_${userId}` : `animals_${userId}`;
    const multiplier = SELL_MULTIPLIERS[type];

    // Get user's collection
    const collection = (await db.get(collectionKey)) || {};

    // Check if collection is empty
    if (Object.keys(collection).length === 0) {
      return message.reply(
        `Your ${type} collection is empty! ${
          type === "dinosaur"
            ? "Use `!catch` to catch some dinosaurs."
            : "Use `!hunt` to catch some animals."
        }`
      );
    }

    // Handle different sell scenarios
    if (args.length === 1) {
      return message.reply(
        `Please specify what you want to sell. Try: \`!sell ${type} [name/rarity/all] [amount]\``
      );
    }

    const target = args[1].toLowerCase();

    // Selling all of collection type
    if (target === "all") {
      return sellAll(
        message,
        userId,
        displayName,
        collection,
        type,
        collectionKey
      );
    }

    // Selling by rarity
    if (["common", "uncommon", "rare", "legendary"].includes(target)) {
      return sellByRarity(
        message,
        userId,
        displayName,
        collection,
        type,
        collectionKey,
        target
      );
    }

    // Selling specific creature by name
    const creatureName = args[1];
    const amount =
      args[2]?.toLowerCase() === "all" ? "all" : parseInt(args[2] || 1);

    return sellSpecific(
      message,
      userId,
      displayName,
      collection,
      type,
      collectionKey,
      creatureName,
      amount
    );
  },
};

// Sell all creatures of a specific type
async function sellAll(
  message,
  userId,
  displayName,
  collection,
  type,
  collectionKey
) {
  let totalValue = 0;
  let totalCount = 0;

  // Calculate total value and count
  for (const [creatureName, creatureData] of Object.entries(collection)) {
    const count = creatureData.count || 0;
    const value = creatureData.value || 0;
    const sellValue = Math.floor(value * SELL_MULTIPLIERS[type].all);

    totalCount += count;
    totalValue += count * sellValue;
  }

  if (totalCount === 0) {
    return message.reply(`You don't have any ${type}s to sell!`);
  }

  // Add coins to user
  await db.add(`cash_${userId}`, totalValue);

  // Clear collection
  await db.set(collectionKey, {});

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor("#2ecc71") // Green for success
    .setTitle(`💰 Sell Complete`)
    .setDescription(`${displayName} sold **all their ${type}s**!`)
    .addFields(
      {
        name: "Sold",
        value: `${totalCount}x ${type}s`,
        inline: true,
      },
      {
        name: "Earnings",
        value: `${formatNumber(totalValue)} atlyss coins`,
        inline: true,
      }
    )
    .setFooter({
      text: `You sold all your ${type}s for ${Math.round(
        SELL_MULTIPLIERS[type].all * 100
      )}% of their value`,
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  if (type === "dinosaur") {
    embed.setThumbnail("https://www.dododex.com/media/item/Cryopod.png");
  } else {
    embed.setThumbnail("https://i.imgur.com/KILibqU.png");
  }

  return message.channel.send({ embeds: [embed] });
}

// Sell all creatures of a specific rarity
async function sellByRarity(
  message,
  userId,
  displayName,
  collection,
  type,
  collectionKey,
  rarity
) {
  let totalValue = 0;
  let totalCount = 0;
  let creaturesToRemove = [];

  // Calculate value and find creatures to remove
  for (const [creatureName, creatureData] of Object.entries(collection)) {
    if (creatureData.rarity === rarity) {
      const count = creatureData.count || 0;
      const value = creatureData.value || 0;
      const sellValue = Math.floor(
        value * SELL_MULTIPLIERS[type].rarity[rarity]
      );

      totalCount += count;
      totalValue += count * sellValue;
      creaturesToRemove.push(creatureName);
    }
  }

  if (totalCount === 0) {
    return message.reply(`You don't have any ${rarity} ${type}s to sell!`);
  }

  // Add coins to user
  await db.add(`cash_${userId}`, totalValue);

  // Remove sold creatures
  for (const name of creaturesToRemove) {
    delete collection[name];
  }

  await db.set(collectionKey, collection);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor(RARITY_COLORS[rarity])
    .setTitle(`💰 Sell Complete`)
    .setDescription(
      `${displayName} sold **all their ${RARITY_EMOJIS[rarity]} ${rarity} ${type}s**!`
    )
    .addFields(
      {
        name: "Sold",
        value: `${totalCount}x ${rarity} ${type}s`,
        inline: true,
      },
      {
        name: "Earnings",
        value: `${formatNumber(totalValue)} atlyss coins`,
        inline: true,
      }
    )
    .setFooter({
      text: `You sold all your ${rarity} ${type}s for ${Math.round(
        SELL_MULTIPLIERS[type].rarity[rarity] * 100
      )}% of their value`,
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  if (type === "dinosaur") {
    embed.setThumbnail("https://www.dododex.com/media/item/Cryopod.png");
  } else {
    embed.setThumbnail("https://i.imgur.com/KILibqU.png");
  }

  return message.channel.send({ embeds: [embed] });
}

// Sell a specific creature
async function sellSpecific(
  message,
  userId,
  displayName,
  collection,
  type,
  collectionKey,
  targetName,
  amount
) {
  // Find creature in collection (case insensitive)
  let creatureName = null;
  let creatureData = null;

  // Try to match the creature name
  for (const [name, data] of Object.entries(collection)) {
    if (name.toLowerCase().includes(targetName.toLowerCase())) {
      creatureName = name;
      creatureData = data;
      break;
    }
  }

  if (!creatureName || !creatureData) {
    return message.reply(
      `You don't have any ${targetName} in your collection!`
    );
  }

  const availableCount = creatureData.count || 0;

  // Handle selling all of a specific creature
  if (amount === "all") {
    amount = availableCount;
  }

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    return message.reply("Please enter a valid amount to sell!");
  }

  if (amount > availableCount) {
    return message.reply(`You only have ${availableCount}x ${creatureName}!`);
  }

  // Calculate earnings
  const value = creatureData.value || 0;
  const sellValue = Math.floor(value * SELL_MULTIPLIERS[type].default);
  const totalEarnings = sellValue * amount;

  // Add coins to user
  await db.add(`cash_${userId}`, totalEarnings);

  // Update or remove creature from collection
  if (amount >= availableCount) {
    delete collection[creatureName];
  } else {
    collection[creatureName].count -= amount;
  }

  await db.set(collectionKey, collection);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor(RARITY_COLORS[creatureData.rarity])
    .setTitle(`💰 Sell Complete`)
    .setDescription(`${displayName} sold **${amount}x ${creatureName}**!`)
    .addFields(
      {
        name: "Sold",
        value: `${amount}x ${creatureName}`,
        inline: true,
      },
      {
        name: "Earnings",
        value: `${formatNumber(totalEarnings)} atlyss coins`,
        inline: true,
      },
      {
        name: "Remaining",
        value: `${availableCount - amount}x ${creatureName}`,
        inline: true,
      }
    )
    .setFooter({
      text: `You sold ${creatureName} for ${Math.round(
        SELL_MULTIPLIERS[type].default * 100
      )}% of its value`,
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  if (creatureData.image) {
    embed.setThumbnail(creatureData.image);
  }

  return message.channel.send({ embeds: [embed] });
}
