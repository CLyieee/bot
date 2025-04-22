const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

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

// Tier display names and emojis
const TIER_INFO = {
  low: { name: "Low Tier", emoji: "🥉", color: "#CD7F32" },
  mid: { name: "Mid Tier", emoji: "🥈", color: "#C0C0C0" },
  high: { name: "High Tier", emoji: "🥇", color: "#FFD700" },
  boss: { name: "Boss Tier", emoji: "👑", color: "#FF5733" },
};

module.exports = {
  name: "dinos",
  description:
    "View your dinosaur collection with interactive sorting and filtering",
  aliases: ["dinosaurs", "collection"],
  usage: "!dinos [user] [sort:value|rarity|name|level] [filter:tier|rarity]",
  async execute(message, args) {
    // Check if a user is mentioned
    const target = message.mentions.users.first() || message.author;
    const userId = target.id;
    const member = message.guild.members.cache.get(userId);
    const displayName = getDisplayName(member);

    // Get dinosaur collection
    const collection = (await db.get(`dinos_${userId}`)) || {};

    // Check if collection is empty
    if (Object.keys(collection).length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle(
          `${
            target.id === message.author.id ? "Your" : `${displayName}'s`
          } ARK Collection`
        )
        .setDescription(
          target.id === message.author.id
            ? "**You don't have any dinosaurs in your collection yet!**\n\nUse `!catch` to catch some dinosaurs and start your collection."
            : `**${displayName} doesn't have any dinosaurs in their collection yet.**`
        )
        .setThumbnail("https://i.imgur.com/ZrJnNDq.png") // Default dino image
        .addFields({
          name: "Getting Started",
          value:
            "• Use `!shop` to buy cryopods\n• Use `!catch` to catch dinosaurs\n• Use `!pray` for better chances at rare dinos",
        })
        .setFooter({
          text: "Your adventure awaits!",
          iconURL: message.client.user.displayAvatarURL(),
        });

      return message.channel.send({ embeds: [emptyEmbed] });
    }

    // Get catch stats
    const catchStats = (await db.get(`catchStats_${userId}`)) || {
      attempts: 0,
      catches: 0,
    };

    // Parse arguments for sorting and filtering
    let sortOption = "rarity"; // Default: sort by rarity
    let filterOption = "all"; // Default: show all
    let filterValue = null;

    for (const arg of args) {
      if (arg.startsWith("sort:")) {
        const sortType = arg.substring(5).toLowerCase();
        if (["value", "rarity", "name", "level", "count"].includes(sortType)) {
          sortOption = sortType;
        }
      } else if (arg.startsWith("filter:")) {
        const filterParts = arg.substring(7).split("=");
        if (filterParts.length === 2) {
          filterOption = filterParts[0].toLowerCase();
          filterValue = filterParts[1].toLowerCase();
        }
      }
    }

    // Process and sort collection
    const sortedDinos = processCollection(
      collection,
      sortOption,
      filterOption,
      filterValue
    );

    // Calculate collection statistics
    const stats = calculateCollectionStats(collection);
    const catchRate =
      catchStats.attempts > 0
        ? Math.round((catchStats.catches / catchStats.attempts) * 100)
        : 0;

    // Create pages with 5 dinos per page
    const itemsPerPage = 5;
    const pages = [];
    for (let i = 0; i < sortedDinos.length; i += itemsPerPage) {
      pages.push(sortedDinos.slice(i, i + itemsPerPage));
    }

    // Function to generate embed for a specific page
    const generateEmbed = (pageIndex) => {
      const embed = new EmbedBuilder()
        .setColor(target.id === message.author.id ? "#9b59b6" : "#3498db")
        .setTitle(`${displayName}'s ARK Dinosaur Collection`)
        .setDescription(
          `**🦖 Total Dinosaurs:** ${stats.total} (${stats.unique} unique species)\n` +
            `**💰 Collection Value:** ${formatNumber(
              stats.totalValue
            )} atlyss coins\n` +
            `**📊 Rarity Breakdown:** ${formatRarityBreakdown(stats)}\n` +
            `**Sorting by:** \`${sortOption}\` | **Page:** ${pageIndex + 1}/${
              pages.length
            }`
        )
        .setThumbnail(target.displayAvatarURL({ dynamic: true }));

      // Add dinos from current page
      const currentPage = pages[pageIndex];
      if (currentPage && currentPage.length > 0) {
        currentPage.forEach((dino) => {
          const tierInfo = TIER_INFO[dino.tier];
          const formattedLevel = dino.level ? `Lvl ${dino.level}` : "";

          embed.addFields({
            name: `${tierInfo.emoji} ${dino.name} ${formattedLevel} ${
              RARITY_EMOJIS[dino.rarity]
            } ${dino.count > 1 ? `(x${dino.count})` : ""}`,
            value:
              `**Value:** ${formatNumber(dino.value)} coins each\n` +
              `**Skill:** ${
                dino.skill
                  ? `${dino.skill.name} - ${dino.skill.description}`
                  : "None"
              }\n` +
              `**Stats:** ${
                dino.stats
                  ? `❤️ ${dino.stats.hp} HP | ⚔️ ${dino.stats.attack} ATK | 🛡️ ${dino.stats.defense} DEF`
                  : "No stats available"
              }`,
            inline: false,
          });
        });
      } else {
        embed.addFields({
          name: "No dinosaurs found",
          value: "No dinosaurs match your current filter criteria.",
          inline: false,
        });
      }

      // Add footer with catch rate
      embed
        .setFooter({
          text: `Catch Rate: ${catchStats.catches}/${catchStats.attempts} (${catchRate}%) | Use '!dino [name]' for details`,
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return embed;
    };

    // Create navigation buttons
    const createButtons = (currentPage) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("first")
          .setLabel("First")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId("previous")
          .setLabel("◀️ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === pages.length - 1),
        new ButtonBuilder()
          .setCustomId("last")
          .setLabel("Last")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === pages.length - 1)
      );

      // Add sort buttons
      const sortRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("sort_rarity")
          .setLabel("Sort by Rarity")
          .setStyle(
            sortOption === "rarity"
              ? ButtonStyle.Success
              : ButtonStyle.Secondary
          ),
        new ButtonBuilder()
          .setCustomId("sort_value")
          .setLabel("Sort by Value")
          .setStyle(
            sortOption === "value" ? ButtonStyle.Success : ButtonStyle.Secondary
          ),
        new ButtonBuilder()
          .setCustomId("sort_name")
          .setLabel("Sort by Name")
          .setStyle(
            sortOption === "name" ? ButtonStyle.Success : ButtonStyle.Secondary
          )
      );

      return [row, sortRow];
    };

    // Send the initial message with first page
    let currentPage = 0;
    const initialEmbed = generateEmbed(currentPage);
    const initialButtons = createButtons(currentPage);

    const response = await message.channel.send({
      embeds: [initialEmbed],
      components: initialButtons,
    });

    // Create collector for button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000, // 2 minute timeout
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on("collect", async (interaction) => {
      // Handle navigation buttons
      if (interaction.customId === "first") {
        currentPage = 0;
      } else if (interaction.customId === "previous") {
        currentPage = Math.max(0, currentPage - 1);
      } else if (interaction.customId === "next") {
        currentPage = Math.min(pages.length - 1, currentPage + 1);
      } else if (interaction.customId === "last") {
        currentPage = pages.length - 1;
      } else if (interaction.customId.startsWith("sort_")) {
        // Handle sorting buttons
        sortOption = interaction.customId.replace("sort_", "");
        // Re-sort the collection with the new option
        const resortedDinos = processCollection(
          collection,
          sortOption,
          filterOption,
          filterValue
        );

        // Recreate pages
        pages.length = 0;
        for (let i = 0; i < resortedDinos.length; i += itemsPerPage) {
          pages.push(resortedDinos.slice(i, i + itemsPerPage));
        }

        currentPage = 0;
      }

      // Update the message
      await interaction.update({
        embeds: [generateEmbed(currentPage)],
        components: createButtons(currentPage),
      });
    });

    // When collector expires, remove buttons
    collector.on("end", async () => {
      try {
        await response.edit({
          components: [],
        });
      } catch (error) {
        console.error("Error updating message after collector ended:", error);
      }
    });
  },
};

// Format rarity breakdown for display
function formatRarityBreakdown(stats) {
  return [
    `${RARITY_EMOJIS.legendary} ${stats.legendaryCount || 0}`,
    `${RARITY_EMOJIS.rare} ${stats.rareCount || 0}`,
    `${RARITY_EMOJIS.uncommon} ${stats.uncommonCount || 0}`,
    `${RARITY_EMOJIS.common} ${stats.commonCount || 0}`,
  ].join(" | ");
}

// Process collection with sorting and filtering
function processCollection(collection, sortOption, filterOption, filterValue) {
  const dinoArray = [];

  // Convert collection to array and add basic properties
  for (const [dinoName, dinoData] of Object.entries(collection)) {
    dinoArray.push({
      name: dinoName,
      tier: dinoData.tier || "low",
      rarity: dinoData.rarity || "common",
      count: dinoData.count || 1,
      value: dinoData.value || 0,
      image: dinoData.image || "",
      skill: dinoData.skill || null,
      level: dinoData.level || 1,
      stats: dinoData.stats || {
        hp: 100,
        attack: 10,
        defense: 5,
      },
    });
  }

  // Apply filtering
  let filteredArray = dinoArray;

  if (filterOption === "tier" && filterValue) {
    filteredArray = dinoArray.filter((dino) => dino.tier === filterValue);
  } else if (filterOption === "rarity" && filterValue) {
    filteredArray = dinoArray.filter((dino) => dino.rarity === filterValue);
  }

  // Apply sorting
  const rarityValues = { legendary: 4, rare: 3, uncommon: 2, common: 1 };

  if (sortOption === "value") {
    filteredArray.sort((a, b) => b.value - a.value);
  } else if (sortOption === "rarity") {
    filteredArray.sort((a, b) => {
      if (rarityValues[b.rarity] !== rarityValues[a.rarity]) {
        return rarityValues[b.rarity] - rarityValues[a.rarity];
      }
      return b.value - a.value; // Secondary sort by value
    });
  } else if (sortOption === "name") {
    filteredArray.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOption === "level") {
    filteredArray.sort((a, b) => (b.level || 1) - (a.level || 1));
  } else if (sortOption === "count") {
    filteredArray.sort((a, b) => b.count - a.count);
  }

  return filteredArray;
}

// Calculate collection statistics
function calculateCollectionStats(collection) {
  let total = 0;
  let unique = 0;
  let totalValue = 0;
  let skillCount = 0;
  let commonCount = 0;
  let uncommonCount = 0;
  let rareCount = 0;
  let legendaryCount = 0;

  for (const [dinoName, dinoData] of Object.entries(collection)) {
    const count = dinoData.count || 1;
    const value = dinoData.value || 0;
    const rarity = dinoData.rarity || "common";

    total += count;
    unique++;
    totalValue += count * value;

    // Count dinosaurs with skills
    if (dinoData.skill) {
      skillCount++;
    }

    // Count by rarity
    if (rarity === "common") commonCount += count;
    else if (rarity === "uncommon") uncommonCount += count;
    else if (rarity === "rare") rareCount += count;
    else if (rarity === "legendary") legendaryCount += count;
  }

  return {
    total,
    unique,
    totalValue,
    skillCount,
    commonCount,
    uncommonCount,
    rareCount,
    legendaryCount,
  };
}
