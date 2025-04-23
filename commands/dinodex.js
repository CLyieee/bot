const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Import DINOSAURS array from catch.js
const { DINOSAURS } = require("./catch");

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

// Tier emojis and names
const TIER_INFO = {
  low: { name: "Low Tier", emoji: "🥉", color: "#CD7F32" },
  mid: { name: "Mid Tier", emoji: "🥈", color: "#C0C0C0" },
  high: { name: "High Tier", emoji: "🥇", color: "#FFD700" },
  boss: { name: "Boss Tier", emoji: "👑", color: "#FF5733" },
};

module.exports = {
  name: "dinodex",
  description: "View detailed information about all dinosaurs in the game",
  aliases: ["dd", "dinoinfo"],
  usage:
    "!dinodex [search term] [sort:value|rarity|tier|name] [filter:tier=low|mid|high|boss] [filter:rarity=common|uncommon|rare|legendary]",

  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Parse arguments for sorting and filtering
    let searchTerm = "";
    let sortOption = "rarity"; // Default: sort by rarity
    let filterOption = "all"; // Default: show all
    let filterValue = null;

    for (const arg of args) {
      if (arg.startsWith("sort:")) {
        const sortType = arg.substring(5).toLowerCase();
        if (["value", "rarity", "tier", "name", "power"].includes(sortType)) {
          sortOption = sortType;
        }
      } else if (arg.startsWith("filter:")) {
        const filterParts = arg.substring(7).split("=");
        if (filterParts.length === 2) {
          filterOption = filterParts[0].toLowerCase();
          filterValue = filterParts[1].toLowerCase();
        }
      } else {
        // If not a command, treat as search term
        if (searchTerm.length > 0) {
          searchTerm += " ";
        }
        searchTerm += arg;
      }
    }

    // Process and sort dinosaurs
    const sortedDinos = processDinosaurs(
      DINOSAURS,
      sortOption,
      filterOption,
      filterValue,
      searchTerm
    );

    // Check if any dinosaurs match the filter/search
    if (sortedDinos.length === 0) {
      const noMatchEmbed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("🦖 ARK Dinodex")
        .setDescription(`No dinosaurs found matching your search criteria.`)
        .addFields({
          name: "Try Again",
          value: "Try a different search term or remove some filters.",
          inline: false,
        })
        .setFooter({
          text: "Use !dinodex for a list of all dinosaurs",
          iconURL: message.client.user.displayAvatarURL(),
        });

      return message.channel.send({ embeds: [noMatchEmbed] });
    }

    // If searching for a specific dinosaur and only one result, show detailed view
    if (searchTerm && sortedDinos.length === 1) {
      return showSingleDinoInfo(message, sortedDinos[0], userId);
    }

    // Create pages with 5 dinos per page
    const itemsPerPage = 5;
    const pages = [];
    for (let i = 0; i < sortedDinos.length; i += itemsPerPage) {
      pages.push(sortedDinos.slice(i, i + itemsPerPage));
    }

    let currentPage = 0;

    // Function to generate embed for a specific page
    const generateEmbed = (pageIndex) => {
      const embed = new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🦖 ARK Dinodex")
        .setDescription(
          `Total Entries: **${sortedDinos.length}** dinosaurs\n` +
            `**Sorting by:** \`${sortOption}\` | **Page:** ${pageIndex + 1}/${
              pages.length
            }`
        )
        .setThumbnail("https://i.imgur.com/ZrJnNDq.png");

      // Add dinos from current page
      const currentPage = pages[pageIndex];
      if (currentPage && currentPage.length > 0) {
        currentPage.forEach((dino) => {
          const tierInfo = TIER_INFO[dino.tier];

          embed.addFields({
            name: `${dino.emoji} ${dino.name} ${RARITY_EMOJIS[dino.rarity]}`,
            value:
              `**Tier:** ${tierInfo.emoji} ${tierInfo.name}\n` +
              `**Rarity:** ${
                dino.rarity.charAt(0).toUpperCase() + dino.rarity.slice(1)
              }\n` +
              `**Value:** ${formatNumber(dino.value)} coins\n` +
              `**Skill:** ${
                dino.skill
                  ? `${dino.skill.name} - ${dino.skill.description}`
                  : "None"
              }\n` +
              `**Skill Power:** ${dino.skill ? dino.skill.power : 0}/30`,
            inline: false,
          });
        });
      }

      embed
        .setFooter({
          text: `Page ${pageIndex + 1}/${
            pages.length
          } • Use !dinodex [name] for details`,
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return embed;
    };

    // Function to create navigation buttons
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
          .setCustomId("sort_tier")
          .setLabel("Sort by Tier")
          .setStyle(
            sortOption === "tier" ? ButtonStyle.Success : ButtonStyle.Secondary
          )
      );

      return [row, sortRow];
    };

    // Send initial embed
    const embed = generateEmbed(currentPage);
    const buttons = createButtons(currentPage);
    const msg = await message.channel.send({
      embeds: [embed],
      components: buttons,
    });

    // Create collector for button interactions
    const collector = msg.createMessageComponentCollector({
      time: 5 * 60 * 1000, // 5 minutes
    });

    collector.on("collect", async (interaction) => {
      // Make sure only the user who initiated the command can use the buttons
      if (interaction.user.id !== userId) {
        return interaction.reply({
          content:
            "You can't use these buttons! Use `!dinodex` to view your own.",
          ephemeral: true,
        });
      }

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
        const resortedDinos = processDinosaurs(
          DINOSAURS,
          sortOption,
          filterOption,
          filterValue,
          searchTerm
        );

        // Recreate pages
        pages.length = 0;
        for (let i = 0; i < resortedDinos.length; i += itemsPerPage) {
          pages.push(resortedDinos.slice(i, i + itemsPerPage));
        }

        // Reset to first page
        currentPage = 0;
      }

      // Update embed with new page
      const newEmbed = generateEmbed(currentPage);
      const newButtons = createButtons(currentPage);
      await interaction.update({
        embeds: [newEmbed],
        components: newButtons,
      });
    });

    collector.on("end", () => {
      // Remove buttons when collector expires
      msg.edit({ components: [] }).catch(console.error);
    });
  },
};

// Show detailed information for a single dinosaur
async function showSingleDinoInfo(message, dinosaur, userId) {
  // Generate fancy skill power bar
  const skillBarLength = 20;
  const filledBars = dinosaur.skill
    ? Math.min(Math.floor(dinosaur.skill.power / 1.5), skillBarLength)
    : 0;
  const emptyBars = skillBarLength - filledBars;

  const skillBar = dinosaur.skill
    ? `${"█".repeat(filledBars)}${"-".repeat(emptyBars)}`
    : "No skill available";

  // Get base stats based on tier
  const tierStats = {
    low: { hp: 100, attack: 10, defense: 5 },
    mid: { hp: 150, attack: 15, defense: 10 },
    high: { hp: 200, attack: 20, defense: 15 },
    boss: { hp: 250, attack: 25, defense: 20 },
  };

  const baseStats = tierStats[dinosaur.tier];

  // Get user's collection to check if they own this dinosaur
  const collection = await db.get(`dinos_${userId}`);
  const userOwns = collection && collection[dinosaur.name];
  const ownedCount = userOwns ? collection[dinosaur.name].count || 0 : 0;
  const userLevel = userOwns ? collection[dinosaur.name].level || 1 : 1;

  // Calculate catch probability
  const catchProbability = calculateCatchProbability(dinosaur);

  // Create detailed embed
  const embed = new EmbedBuilder()
    .setColor(RARITY_COLORS[dinosaur.rarity])
    .setTitle(`${dinosaur.emoji} ${dinosaur.name}`)
    .setDescription(
      `${
        userOwns
          ? `You own **${ownedCount}x** of this dinosaur!`
          : "You don't own this dinosaur yet."
      }`
    )
    .addFields(
      {
        name: "Classification",
        value: `**Tier:** ${TIER_INFO[dinosaur.tier].emoji} ${
          TIER_INFO[dinosaur.tier].name
        }\n**Rarity:** ${RARITY_EMOJIS[dinosaur.rarity]} ${
          dinosaur.rarity.charAt(0).toUpperCase() + dinosaur.rarity.slice(1)
        }`,
        inline: true,
      },
      {
        name: "Base Stats",
        value: `❤️ **HP:** ${baseStats.hp}\n⚔️ **Attack:** ${baseStats.attack}\n🛡️ **Defense:** ${baseStats.defense}`,
        inline: true,
      },
      {
        name: "Value & Rarity",
        value: `💰 **Value:** ${formatNumber(
          dinosaur.value
        )} coins\n🎲 **Spawn Chance:** ${
          dinosaur.chance
        }%\n🎯 **Catch Difficulty:** ${catchProbability}`,
        inline: false,
      }
    )
    .setImage(dinosaur.image);

  // Add skill information if present
  if (dinosaur.skill) {
    embed.addFields(
      {
        name: `💫 Skill: ${dinosaur.skill.name}`,
        value: `${dinosaur.skill.description}`,
        inline: false,
      },
      {
        name: "Skill Power",
        value: `\`${skillBar}\` ${dinosaur.skill.power}/30`,
        inline: false,
      }
    );
  }

  // Add ownership information if the user owns this dinosaur
  if (userOwns) {
    const userDino = collection[dinosaur.name];
    embed.addFields({
      name: "Your Dinosaur",
      value: `**Level:** ${userLevel}\n**Count:** ${ownedCount}x\n${
        userDino.stats
          ? `**Current Stats:** ❤️ ${userDino.stats.hp} HP | ⚔️ ${userDino.stats.attack} ATK | 🛡️ ${userDino.stats.defense} DEF`
          : ""
      }`,
      inline: false,
    });
  }

  embed.setFooter({
    text: "Use !dinodex for a list of all dinosaurs",
    iconURL: message.client.user.displayAvatarURL(),
  });

  return message.channel.send({ embeds: [embed] });
}

// Process dinosaurs with sorting and filtering
function processDinosaurs(
  dinosaurs,
  sortOption,
  filterOption,
  filterValue,
  searchTerm
) {
  // Clone the array to avoid modifying the original
  let filteredDinos = [...dinosaurs];

  // Apply search if provided
  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    filteredDinos = filteredDinos.filter(
      (dino) =>
        dino.name.toLowerCase().includes(lowerSearch) ||
        (dino.skill && dino.skill.name.toLowerCase().includes(lowerSearch))
    );
  }

  // Apply filtering
  if (filterOption === "tier" && filterValue) {
    filteredDinos = filteredDinos.filter((dino) => dino.tier === filterValue);
  } else if (filterOption === "rarity" && filterValue) {
    filteredDinos = filteredDinos.filter((dino) => dino.rarity === filterValue);
  }

  // Apply sorting
  const rarityValues = { legendary: 4, rare: 3, uncommon: 2, common: 1 };
  const tierValues = { boss: 4, high: 3, mid: 2, low: 1 };

  if (sortOption === "value") {
    filteredDinos.sort((a, b) => b.value - a.value);
  } else if (sortOption === "rarity") {
    filteredDinos.sort((a, b) => {
      if (rarityValues[b.rarity] !== rarityValues[a.rarity]) {
        return rarityValues[b.rarity] - rarityValues[a.rarity];
      }
      return b.value - a.value; // Secondary sort by value
    });
  } else if (sortOption === "tier") {
    filteredDinos.sort((a, b) => {
      if (tierValues[b.tier] !== tierValues[a.tier]) {
        return tierValues[b.tier] - tierValues[a.tier];
      }
      return rarityValues[b.rarity] - rarityValues[a.rarity]; // Secondary sort by rarity
    });
  } else if (sortOption === "name") {
    filteredDinos.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOption === "power") {
    filteredDinos.sort((a, b) => {
      const powerA = a.skill?.power || 0;
      const powerB = b.skill?.power || 0;
      return powerB - powerA;
    });
  }

  return filteredDinos;
}

// Calculate catch probability text based on dinosaur properties
function calculateCatchProbability(dinosaur) {
  // Basic formula based on rarity and tier
  const rarityFactor = {
    common: 1.0,
    uncommon: 0.8,
    rare: 0.5,
    legendary: 0.2,
  };

  const tierFactor = {
    low: 1.0,
    mid: 0.8,
    high: 0.5,
    boss: 0.2,
  };

  // Calculate an approximate catch difficulty
  const baseProbability =
    rarityFactor[dinosaur.rarity] * tierFactor[dinosaur.tier];

  // Format as text with difficulty rating
  if (baseProbability >= 0.8) {
    return "Very Easy 🟩🟩🟩🟩🟩";
  } else if (baseProbability >= 0.6) {
    return "Easy 🟩🟩🟩🟩⬜";
  } else if (baseProbability >= 0.4) {
    return "Moderate 🟩🟩🟨⬜⬜";
  } else if (baseProbability >= 0.2) {
    return "Hard 🟨🟥🟥⬜⬜";
  } else {
    return "Very Hard 🟥🟥🟥🟥🟥";
  }
}
