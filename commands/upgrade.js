// filepath: c:\bot\commands\upgrade.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Rarity colors
const RARITY_COLORS = {
  common: "#CCCCCC",
  uncommon: "#1ABC9C",
  rare: "#3498DB",
  epic: "#9B59B6",
  legendary: "#F1C40F",
  mythical: "#E74C3C",
};

// Rarity emojis
const RARITY_EMOJIS = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  epic: "🟣",
  legendary: "🟡",
  mythical: "🔴",
};

// Stars for weapon levels
function getStars(level) {
  if (level < 5) return "⭐".repeat(level);
  if (level < 10) return "⭐".repeat(5) + "🌟".repeat(level - 5);
  return "⭐".repeat(5) + "🌟".repeat(4) + "💫".repeat(level - 9);
}

// Calculate upgrade cost based on weapon level and rarity
function calculateUpgradeCost(weapon) {
  const baseCost = 500;
  const rarityMultipliers = {
    common: 1,
    uncommon: 1.5,
    rare: 2,
    epic: 3,
    legendary: 5,
    mythical: 8,
  };

  // Cost increases exponentially with level
  const levelMultiplier = Math.pow(1.3, weapon.level - 1);
  const rarityMultiplier = rarityMultipliers[weapon.rarity || "common"];

  return Math.floor(baseCost * levelMultiplier * rarityMultiplier);
}

// Calculate stat increase for a weapon upgrade
function calculateStatIncrease(weapon) {
  const rarity = weapon.rarity || "common";
  const rarityBonus = {
    common: 1,
    uncommon: 1.5,
    rare: 2,
    epic: 2.5,
    legendary: 3,
    mythical: 4,
  }[rarity];

  // Base increase is between 1-3 points per upgrade
  const baseIncrease = Math.random() * 2 + 1;
  const increase = Math.max(1, Math.floor(baseIncrease * rarityBonus));

  return increase;
}

// Max level based on rarity
const MAX_LEVELS = {
  common: 10,
  uncommon: 15,
  rare: 20,
  epic: 25,
  legendary: 30,
  mythical: 50,
};

module.exports = {
  name: "upgrade",
  description: "Upgrade your weapons to increase their power",
  usage: "!upgrade [weapon name]",
  aliases: ["enhance", "levelup"],
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Get user's weapons
    const weapons = (await db.get(`weapons_${userId}`)) || {};

    // Check if user has any weapons
    if (Object.keys(weapons).length === 0) {
      return message.reply(
        "You don't have any weapons to upgrade! Use `!buy list weapon` to browse weapons or `!forge` to craft a new weapon."
      );
    }

    // If no weapon specified, show all weapons that can be upgraded
    if (!args.length) {
      return showUpgradeOptions(message, weapons);
    }

    // Find the weapon by partial name match (case-insensitive)
    const weaponName = args.join(" ").toLowerCase();
    let matchedWeaponId = null;
    let matchedWeapon = null;

    for (const [weaponId, weapon] of Object.entries(weapons)) {
      if (weapon.name.toLowerCase().includes(weaponName)) {
        matchedWeaponId = weaponId;
        matchedWeapon = weapon;
        break;
      }
    }

    if (!matchedWeapon) {
      return message.reply(
        `Couldn't find a weapon with name "${args.join(
          " "
        )}" in your collection. Use \`!weapons\` to see your weapons.`
      );
    }

    // Check if weapon is at max level for its rarity
    const maxLevel = MAX_LEVELS[matchedWeapon.rarity || "common"];
    if (matchedWeapon.level >= maxLevel) {
      return message.reply(
        `Your **${matchedWeapon.name}** is already at maximum level (${maxLevel}) for its rarity!`
      );
    }

    // Calculate upgrade cost
    const upgradeCost = calculateUpgradeCost(matchedWeapon);

    // Check if user has enough coins
    const balance = (await db.get(`cash_${userId}`)) || 0;
    if (balance < upgradeCost) {
      return message.reply(
        `You don't have enough coins to upgrade this weapon! You need ${formatNumber(
          upgradeCost
        )} coins.`
      );
    }

    // Deduct the cost
    await db.add(`cash_${userId}`, -upgradeCost);

    // Calculate stat increases
    const dmgIncrease = calculateStatIncrease(matchedWeapon);

    // Apply the upgrade
    const oldMinDamage = matchedWeapon.damage[0];
    const oldMaxDamage = matchedWeapon.damage[1];

    matchedWeapon.level += 1;
    matchedWeapon.damage[0] += dmgIncrease;
    matchedWeapon.damage[1] += dmgIncrease;

    // Save the upgraded weapon
    weapons[matchedWeaponId] = matchedWeapon;
    await db.set(`weapons_${userId}`, weapons);

    // Create response embed
    const embed = new EmbedBuilder()
      .setColor(RARITY_COLORS[matchedWeapon.rarity || "common"])
      .setTitle("🔨 Weapon Upgraded!")
      .setDescription(
        `**${displayName}** upgraded their **${matchedWeapon.name}**!`
      )
      .addFields(
        {
          name: "Weapon Stats",
          value:
            `${matchedWeapon.emoji || "⚔️"} **${matchedWeapon.name}**\n` +
            `${RARITY_EMOJIS[matchedWeapon.rarity || "common"]} ${
              (matchedWeapon.rarity || "common").charAt(0).toUpperCase() +
              (matchedWeapon.rarity || "common").slice(1)
            }\n` +
            `Level: ${matchedWeapon.level} ${getStars(matchedWeapon.level)}\n` +
            `Damage: ${matchedWeapon.damage[0]}-${matchedWeapon.damage[1]} (↑ +${dmgIncrease})\n` +
            `Old Damage: ${oldMinDamage}-${oldMaxDamage}`,
        },
        {
          name: "Upgrade Cost",
          value: `${formatNumber(upgradeCost)} atlyss coins`,
        }
      )
      .setFooter({
        text: `Your new balance: ${formatNumber(
          balance - upgradeCost
        )} atlyss coins`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};

// Show available upgrade options
async function showUpgradeOptions(message, weapons) {
  const userId = message.author.id;
  const balance = (await db.get(`cash_${userId}`)) || 0;

  const embed = new EmbedBuilder()
    .setColor("#ff9900")
    .setTitle("🔨 Weapon Upgrade")
    .setDescription(
      "Upgrade your weapons to increase their power!\n" +
        "Use `!upgrade [weapon name]` to enhance a specific weapon.\n\n" +
        `Your Balance: **${formatNumber(balance)} atlyss coins**`
    )
    .setFooter({
      text: "Higher rarity weapons can reach higher levels",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Show user's weapons and their upgrade costs
  let weaponsList = "";
  const sortedWeapons = Object.entries(weapons).sort((a, b) => {
    // Sort by rarity (mythical first)
    const rarityOrder = [
      "mythical",
      "legendary",
      "epic",
      "rare",
      "uncommon",
      "common",
    ];
    const rarityA = rarityOrder.indexOf(a[1].rarity || "common");
    const rarityB = rarityOrder.indexOf(b[1].rarity || "common");

    if (rarityA !== rarityB) return rarityA - rarityB;

    // Then sort by level (highest first)
    return (b[1].level || 1) - (a[1].level || 1);
  });

  for (const [weaponId, weapon] of sortedWeapons) {
    const rarity = weapon.rarity || "common";
    const maxLevel = MAX_LEVELS[rarity];
    const upgradeCost = calculateUpgradeCost(weapon);
    const canAfford = balance >= upgradeCost;
    const atMaxLevel = (weapon.level || 1) >= maxLevel;

    weaponsList += `${weapon.emoji || "⚔️"} **${weapon.name}**\n`;
    weaponsList += `${RARITY_EMOJIS[rarity]} ${
      rarity.charAt(0).toUpperCase() + rarity.slice(1)
    } | `;
    weaponsList += `Level: ${weapon.level || 1}/${maxLevel} ${getStars(
      weapon.level || 1
    )}\n`;
    weaponsList += `Damage: ${
      weapon.damage ? `${weapon.damage[0]}-${weapon.damage[1]}` : "5-15"
    }\n`;

    if (atMaxLevel) {
      weaponsList += "✨ **MAX LEVEL** ✨\n\n";
    } else {
      weaponsList += `Upgrade Cost: ${formatNumber(upgradeCost)} coins ${
        canAfford ? "✅" : "❌"
      }\n\n`;
    }
  }

  // Add max level information
  let maxLevelsInfo = "**Maximum Levels by Rarity:**\n";
  for (const [rarity, maxLevel] of Object.entries(MAX_LEVELS)) {
    maxLevelsInfo += `${RARITY_EMOJIS[rarity]} ${
      rarity.charAt(0).toUpperCase() + rarity.slice(1)
    }: Level ${maxLevel}\n`;
  }

  embed.addFields(
    { name: "Your Weapons", value: weaponsList || "No weapons available" },
    { name: "Maximum Levels", value: maxLevelsInfo }
  );

  return message.channel.send({ embeds: [embed] });
}
