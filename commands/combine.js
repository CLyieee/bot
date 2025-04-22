// filepath: c:\bot\commands\combine.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Rarity colors for dinosaurs
const RARITY_COLORS = {
  common: "#CCCCCC",
  uncommon: "#1ABC9C",
  rare: "#3498DB",
  legendary: "#9B59B6",
};

// Rarity emojis for dinosaurs
const RARITY_EMOJIS = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  legendary: "🟣",
};

// Stat improvement percentages based on rarity
const STAT_IMPROVEMENTS = {
  common: {
    hp: 3,
    attack: 3,
    defense: 3,
  },
  uncommon: {
    hp: 5,
    attack: 5,
    defense: 5,
  },
  rare: {
    hp: 8,
    attack: 8,
    defense: 8,
  },
  legendary: {
    hp: 12,
    attack: 12,
    defense: 12,
  },
};

// Extra level bonus based on rarity
const LEVEL_BONUS = {
  common: 1,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

module.exports = {
  name: "combine",
  description:
    "Combine multiple dinosaurs of the same type to enhance their stats",
  aliases: ["fusion", "merge", "enhance"],
  usage: "!combine [dinosaur name] [quantity]",

  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if arguments were provided
    if (!args.length) {
      return message.reply(
        "Please specify which dinosaur you want to combine and how many to use. Example: `!combine Raptor 3`"
      );
    }

    // Get user's dinosaur collection
    const collection = (await db.get(`dinos_${userId}`)) || {};
    if (Object.keys(collection).length === 0) {
      return message.reply("You don't have any dinosaurs to combine!");
    }

    // Last argument might be the quantity
    let quantity = 2; // Default to combining 2 copies (minimum needed)
    const lastArg = args[args.length - 1];

    if (!isNaN(parseInt(lastArg))) {
      quantity = parseInt(lastArg);
      args.pop(); // Remove the quantity from args
    }

    // Quantity must be at least 2
    if (quantity < 2) {
      return message.reply("You need at least 2 dinosaurs to combine!");
    }

    // Remaining args are the dinosaur name
    const dinoName = args.join(" ");
    if (!dinoName) {
      return message.reply(
        "Please specify the name of the dinosaur you want to combine."
      );
    }

    // Find the dinosaur in collection (case insensitive partial match)
    let foundDino = null;
    let exactName = "";

    for (const [name, data] of Object.entries(collection)) {
      if (name.toLowerCase().includes(dinoName.toLowerCase())) {
        foundDino = data;
        exactName = name;
        break;
      }
    }

    if (!foundDino) {
      return message.reply(
        `You don't have a dinosaur named "${dinoName}" in your collection.`
      );
    }

    // Check if user has enough copies
    if (!foundDino.count || foundDino.count < quantity) {
      return message.reply(
        `You only have ${
          foundDino.count || 1
        }x ${exactName}, but you need ${quantity} to combine.`
      );
    }

    // Initialize base stats if they don't exist
    if (!foundDino.baseStats) {
      // Get tier stats
      const tierStats = {
        low: { hp: 100, attack: 10, defense: 5 },
        mid: { hp: 150, attack: 15, defense: 10 },
        high: { hp: 200, attack: 20, defense: 15 },
        boss: { hp: 250, attack: 25, defense: 20 },
      };

      foundDino.baseStats = {
        hp: tierStats[foundDino.tier || "low"].hp,
        attack: tierStats[foundDino.tier || "low"].attack,
        defense: tierStats[foundDino.tier || "low"].defense,
      };
    }

    // Initialize level if it doesn't exist
    if (!foundDino.level) {
      foundDino.level = 1;
    }

    // Initialize stats if they don't exist
    if (!foundDino.stats) {
      foundDino.stats = {
        hp: foundDino.baseStats.hp,
        attack: foundDino.baseStats.attack,
        defense: foundDino.baseStats.defense,
      };
    }

    // Calculate stat improvements
    const improvementPercent = STAT_IMPROVEMENTS[foundDino.rarity];
    const levelBonus = LEVEL_BONUS[foundDino.rarity] || 1;

    const oldStats = { ...foundDino.stats };
    const oldLevel = foundDino.level;

    // Calculate new stats with improvements
    foundDino.stats.hp += Math.floor(
      foundDino.stats.hp * (improvementPercent.hp / 100) * (quantity - 1)
    );
    foundDino.stats.attack += Math.floor(
      foundDino.stats.attack *
        (improvementPercent.attack / 100) *
        (quantity - 1)
    );
    foundDino.stats.defense += Math.floor(
      foundDino.stats.defense *
        (improvementPercent.defense / 100) *
        (quantity - 1)
    );

    // Add level bonus based on how many dinos were combined
    foundDino.level += levelBonus * (quantity - 1);

    // Improve skill power slightly if the dinosaur has a skill
    if (foundDino.skill && foundDino.skill.power) {
      // Cap skill power at 30
      foundDino.skill.power = Math.min(
        30,
        foundDino.skill.power + Math.floor((quantity - 1) / 2)
      );
    }

    // Reduce count by the combined quantity (minus 1 for the kept dinosaur)
    foundDino.count -= quantity - 1;

    // Update the collection
    collection[exactName] = foundDino;
    await db.set(`dinos_${userId}`, collection);

    // Create embed to show results
    const combineEmbed = new EmbedBuilder()
      .setColor(RARITY_COLORS[foundDino.rarity])
      .setTitle(`🧬 Dinosaur Fusion Complete`)
      .setDescription(
        `${displayName} successfully combined ${quantity}x ${exactName}!`
      )
      .setThumbnail(foundDino.image || "https://i.imgur.com/ZrJnNDq.png")
      .addFields(
        {
          name: "🦖 Enhanced Dinosaur",
          value: `${foundDino.emoji || "🦖"} **${exactName}**\n${
            RARITY_EMOJIS[foundDino.rarity]
          } ${
            foundDino.rarity.charAt(0).toUpperCase() + foundDino.rarity.slice(1)
          }\nLevel ${oldLevel} → Level ${foundDino.level}`,
          inline: false,
        },
        {
          name: "❤️ HP",
          value: `${oldStats.hp} → ${foundDino.stats.hp} (+${
            foundDino.stats.hp - oldStats.hp
          })`,
          inline: true,
        },
        {
          name: "⚔️ Attack",
          value: `${oldStats.attack} → ${foundDino.stats.attack} (+${
            foundDino.stats.attack - oldStats.attack
          })`,
          inline: true,
        },
        {
          name: "🛡️ Defense",
          value: `${oldStats.defense} → ${foundDino.stats.defense} (+${
            foundDino.stats.defense - oldStats.defense
          })`,
          inline: true,
        }
      );

    // Add skill improvement if applicable
    if (foundDino.skill) {
      combineEmbed.addFields({
        name: "✨ Skill: " + foundDino.skill.name,
        value: `${foundDino.skill.description}\nPower: ${foundDino.skill.power}`,
        inline: false,
      });
    }

    combineEmbed.setFooter({
      text: "DNA fusion successful! Use !dino to see your enhanced dinosaur.",
      iconURL: message.client.user.displayAvatarURL(),
    });

    return message.channel.send({ embeds: [combineEmbed] });
  },
};
