const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Animal rarity tiers and colors
const RARITIES = {
  common: { color: "#CCCCCC", emoji: "⚪", value: 1 },
  uncommon: { color: "#1ABC9C", emoji: "🟢", value: 3 },
  rare: { color: "#3498DB", emoji: "🔵", value: 8 },
  legendary: { color: "#9B59B6", emoji: "🟣", value: 15 },
};

module.exports = {
  name: "zoo",
  description: "See all your collected animals",
  usage: "!zoo [user]",
  async execute(message, args) {
    // Determine target user - either mentioned user or message author
    const target = message.mentions.users.first() || message.author;
    const userId = target.id;
    const displayName =
      target.id === message.author.id
        ? getDisplayName(message.member)
        : getDisplayName(message.guild.members.cache.get(target.id));

    // Get animal collection from database
    let animals = (await db.get(`animals_${userId}`)) || {};

    // Check if zoo is empty
    if (Object.keys(animals).length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle(`${displayName}'s Zoo`)
        .setDescription(`This zoo is empty! Use \`!hunt\` to catch animals.`)
        .setThumbnail("https://i.imgur.com/KILibqU.png")
        .setFooter({
          text: "Hunt animals to fill your zoo!",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [emptyEmbed] });
    }

    // Calculate zoo statistics
    const stats = calculateZooStats(animals);

    // Create embedded message
    const embed = new EmbedBuilder()
      .setColor("#8e44ad")
      .setTitle(`${displayName}'s Zoo`)
      .setDescription(
        `Total unique animals: **${stats.uniqueAnimals}**\nTotal animals: **${
          stats.totalAnimals
        }**\nZoo value: **${formatNumber(stats.totalValue)}**`
      )
      .setThumbnail("https://i.imgur.com/KILibqU.png")
      .setFooter({
        text: "Use !hunt to catch more animals!",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Add fields for each rarity
    addRarityFields(embed, animals, stats);

    message.channel.send({ embeds: [embed] });
  },
};

// Calculate zoo stats
function calculateZooStats(animals) {
  const stats = {
    uniqueAnimals: 0,
    totalAnimals: 0,
    totalValue: 0,
    commonCount: 0,
    uncommonCount: 0,
    rareCount: 0,
    legendaryCount: 0,
  };

  // Count animals by type and calculate total value
  for (const [animalName, animalData] of Object.entries(animals)) {
    const count = animalData.count || 0;
    const rarity = animalData.rarity || "common";

    // Update counts
    stats.uniqueAnimals++;
    stats.totalAnimals += count;

    // Update rarity counts
    switch (rarity) {
      case "common":
        stats.commonCount += count;
        break;
      case "uncommon":
        stats.uncommonCount += count;
        break;
      case "rare":
        stats.rareCount += count;
        break;
      case "legendary":
        stats.legendaryCount += count;
        break;
    }

    // Add to value
    stats.totalValue += count * RARITIES[rarity].value;
  }

  return stats;
}

// Add fields for each rarity category
function addRarityFields(embed, animals, stats) {
  // Create list of animals by rarity
  const animalsByRarity = {
    legendary: [],
    rare: [],
    uncommon: [],
    common: [],
  };

  // Sort animals by rarity
  for (const [animalName, animalData] of Object.entries(animals)) {
    const rarity = animalData.rarity || "common";
    animalsByRarity[rarity].push({
      name: animalName,
      count: animalData.count || 0,
    });
  }

  // Add fields in order of rarity (highest first)
  // Legendary animals
  if (stats.legendaryCount > 0) {
    const legendaryList = formatAnimalList(animalsByRarity.legendary);
    embed.addFields({
      name: `${RARITIES.legendary.emoji} Legendary Animals (${stats.legendaryCount})`,
      value: legendaryList,
    });
  }

  // Rare animals
  if (stats.rareCount > 0) {
    const rareList = formatAnimalList(animalsByRarity.rare);
    embed.addFields({
      name: `${RARITIES.rare.emoji} Rare Animals (${stats.rareCount})`,
      value: rareList,
    });
  }

  // Uncommon animals
  if (stats.uncommonCount > 0) {
    const uncommonList = formatAnimalList(animalsByRarity.uncommon);
    embed.addFields({
      name: `${RARITIES.uncommon.emoji} Uncommon Animals (${stats.uncommonCount})`,
      value: uncommonList,
    });
  }

  // Common animals
  if (stats.commonCount > 0) {
    const commonList = formatAnimalList(animalsByRarity.common);
    embed.addFields({
      name: `${RARITIES.common.emoji} Common Animals (${stats.commonCount})`,
      value: commonList,
    });
  }
}

// Format animal list for display
function formatAnimalList(animals) {
  // Sort by count (highest first)
  animals.sort((a, b) => b.count - a.count);

  // Format each animal
  return (
    animals
      .map((animal) => `${animal.name} x${animal.count}`)
      .join("\n")
      .substring(0, 1024) || "None"
  );
}
