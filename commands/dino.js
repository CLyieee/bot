// filepath: c:\bot\commands\dino.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Rarity colors
const RARITY_COLORS = {
  common: "#CCCCCC",
  uncommon: "#1ABC9C",
  rare: "#3498DB",
  legendary: "#9B59B6",
};

// Tier display names
const TIER_NAMES = {
  low: "Low Tier",
  mid: "Mid Tier",
  high: "High Tier",
  boss: "Boss Tier",
};

// Mapping for dinosaur names that don't match Dododex's naming conventions
const DODODEX_NAME_MAPPING = {
  tyrannosaurus: "tyrannosaurus-rex",
  "tyrannosaurus rex": "tyrannosaurus-rex",
  "t-rex": "tyrannosaurus-rex",
  trex: "tyrannosaurus-rex",
  stegosaurus: "stego",
  brontosaurus: "bronto",
  // Add more mappings as needed
};

// Skill rarity colors
const SKILL_COLORS = {
  low: "#1ABC9C", // Teal for low tier
  mid: "#3498DB", // Blue for mid tier
  high: "#9B59B6", // Purple for high tier
  boss: "#E74C3C", // Red for boss tier
};

module.exports = {
  name: "dino",
  description: "View detailed information about a specific dinosaur",
  aliases: ["dinosaur", "d"],
  usage: "!dino <dinosaur name>",
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    if (!args.length) {
      return message.reply(
        "Please specify a dinosaur name. Usage: `!dino <dinosaur name>`"
      );
    }

    // Get the search term (case-insensitive)
    const searchTerm = args.join(" ").toLowerCase();

    // Get dinosaur collection
    const collection = (await db.get(`dinos_${userId}`)) || {};

    // Check if collection is empty
    if (Object.keys(collection).length === 0) {
      return message.reply(
        "You don't have any dinosaurs in your collection yet! Use `!catch` to catch some."
      );
    }

    // Find the dinosaur in the collection
    let dinoName = null;
    let dinoData = null;

    for (const [name, data] of Object.entries(collection)) {
      if (name.toLowerCase().includes(searchTerm)) {
        dinoName = name;
        dinoData = data;
        break;
      }
    }

    // If no dinosaur was found
    if (!dinoData) {
      return message.reply(
        `You don't have a dinosaur that matches "${args.join(
          " "
        )}" in your collection.`
      );
    }

    // Get dinosaur properties
    const {
      count = 1,
      value = 0,
      tier = "low",
      rarity = "common",
      emoji = "🦖",
      skill = null,
    } = dinoData;

    // Create a URL-friendly name for the dododex image
    let dododexName = dinoName.toLowerCase();

    // Check if there's a special mapping for this dinosaur
    if (DODODEX_NAME_MAPPING[dododexName]) {
      dododexName = DODODEX_NAME_MAPPING[dododexName];
    } else {
      // Apply standard URL formatting
      dododexName = dododexName.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }

    // Generate dododex URL for the dinosaur image
    const imageUrl = `https://www.dododex.com/media/creature/${dododexName}.png`;

    // Create embed with the dinosaur image
    const embed = new EmbedBuilder()
      .setColor(RARITY_COLORS[rarity] || "#CCCCCC")
      .setTitle(`${emoji} ${dinoName}`)
      .setDescription(`You have **${count}x** ${dinoName} in your collection.`)
      .addFields(
        { name: "Tier", value: TIER_NAMES[tier] || "Unknown", inline: true },
        {
          name: "Rarity",
          value: rarity.charAt(0).toUpperCase() + rarity.slice(1),
          inline: true,
        },
        {
          name: "Value",
          value: `${formatNumber(value)} coins each`,
          inline: true,
        },
        {
          name: "Total Value",
          value: `${formatNumber(count * value)} coins`,
          inline: true,
        }
      )
      .setFooter({
        text: `${displayName}'s Collection`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Add skill information if present
    if (skill) {
      embed.addFields({
        name: `💫 Skill: ${skill.name}`,
        value: `${skill.description} (Power: ${skill.power})`,
        inline: false,
      });

      // Add colorful skill bar based on tier
      const skillBarLength = 20;
      const filledBars = Math.min(Math.floor(skill.power / 2), skillBarLength);
      const emptyBars = skillBarLength - filledBars;

      const skillBar = `${"█".repeat(filledBars)}${"-".repeat(emptyBars)}`;

      embed.addFields({
        name: "Skill Power",
        value: `\`${skillBar}\` ${skill.power}/30`,
        inline: false,
      });
    }

    // Set the dododex image URL
    embed.setImage(imageUrl);

    // Send the embed
    message.channel.send({ embeds: [embed] });
  },
};
