// filepath: c:\bot\commands\weapons.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Weapon rarity colors
const RARITY_COLORS = {
  common: "#CCCCCC",
  uncommon: "#1ABC9C",
  rare: "#3498DB",
  epic: "#9B59B6",
  legendary: "#F1C40F",
  mythical: "#E74C3C",
};

// Weapon rarity emojis
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

module.exports = {
  name: "weapons",
  description: "View your weapons collection",
  usage: "!weapons",
  aliases: ["weapon", "wep", "weps"],
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Get user's weapons
    const weapons = (await db.get(`weapons_${userId}`)) || {};
    const equippedWeapon = await db.get(`equippedWeapon_${userId}`);

    // No weapons owned
    if (Object.keys(weapons).length === 0) {
      return message.reply(
        "You don't have any weapons yet! Use `!buy list weapon` to browse weapons or `!forge` to craft a new weapon."
      );
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle(`🗡️ ${displayName}'s Weapons Collection`)
      .setDescription("Your collection of weapons for battle")
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: "Use !equip [weapon name] to equip a weapon | !upgrade to level up weapons",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Organize weapons by rarity for display
    const weaponsByRarity = {
      mythical: [],
      legendary: [],
      epic: [],
      rare: [],
      uncommon: [],
      common: [],
    };

    // Sort weapons into rarity categories
    Object.entries(weapons).forEach(([weaponId, weapon]) => {
      const rarity = weapon.rarity || "common";
      const isEquipped = weaponId === equippedWeapon;

      weaponsByRarity[rarity].push({
        id: weaponId,
        name: weapon.name,
        emoji: weapon.emoji || "⚔️",
        damage: weapon.damage || [5, 15],
        level: weapon.level || 1,
        xp: weapon.xp || 0,
        isEquipped,
      });
    });

    // Display all weapons by rarity category
    let noWeaponsDisplayed = true;

    for (const [rarity, rarityWeapons] of Object.entries(weaponsByRarity)) {
      if (rarityWeapons.length === 0) continue;
      noWeaponsDisplayed = false;

      let weaponList = "";

      rarityWeapons.forEach((weapon) => {
        const avgDamage = Math.floor((weapon.damage[0] + weapon.damage[1]) / 2);
        const stars = getStars(weapon.level);

        weaponList += `${weapon.emoji} **${weapon.name}**${
          weapon.isEquipped ? " (Equipped) 🔸" : ""
        }\n`;
        weaponList += `${RARITY_EMOJIS[rarity]} ${
          rarity.charAt(0).toUpperCase() + rarity.slice(1)
        } | `;
        weaponList += `Lvl ${weapon.level} ${stars} | Dmg: ${weapon.damage[0]}-${weapon.damage[1]}\n\n`;
      });

      embed.addFields({
        name: `${RARITY_EMOJIS[rarity]} ${
          rarity.charAt(0).toUpperCase() + rarity.slice(1)
        } Weapons`,
        value: weaponList.trim(),
      });
    }

    if (noWeaponsDisplayed) {
      embed.setDescription(
        "You don't have any weapons yet! Use `!buy list weapon` to browse weapons or `!forge` to craft a new weapon."
      );
    }

    return message.channel.send({ embeds: [embed] });
  },
};
