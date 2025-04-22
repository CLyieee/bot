// filepath: c:\bot\commands\sacrificeweapon.js
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

// Rarity emojis and sacrifice value multipliers
const RARITY_DATA = {
  common: { emoji: "⚪", value: 1 },
  uncommon: { emoji: "🟢", value: 2 },
  rare: { emoji: "🔵", value: 4 },
  epic: { emoji: "🟣", value: 8 },
  legendary: { emoji: "🟡", value: 15 },
  mythical: { emoji: "🔴", value: 25 },
};

module.exports = {
  name: "sacrificeweapon",
  description: "Sacrifice a weapon to get essence and coins",
  usage: "!sacrificeweapon [weapon name]",
  aliases: ["scrapsweapon", "destroyweapon", "discard"],
  cooldown: 60 * 1000, // 1 minute cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user provided a weapon name
    if (!args.length) {
      return message.reply(
        "Please specify which weapon you want to sacrifice. Usage: `!sacrificeweapon [weapon name]`"
      );
    }

    // Get user's weapons
    const weapons = (await db.get(`weapons_${userId}`)) || {};
    const equippedWeapon = await db.get(`equippedWeapon_${userId}`);

    if (Object.keys(weapons).length === 0) {
      return message.reply("You don't have any weapons to sacrifice!");
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

    // Check if it's the equipped weapon
    if (matchedWeaponId === equippedWeapon) {
      return message.reply(
        "You can't sacrifice your currently equipped weapon! Use `!equip` to equip a different weapon first."
      );
    }

    // Calculate rewards
    const rarity = matchedWeapon.rarity || "common";
    const level = matchedWeapon.level || 1;
    const rarityMultiplier = RARITY_DATA[rarity].value;

    // Base value depends on weapon level and rarity
    const baseValue = 200 + 100 * level;
    const coinsReward = Math.floor(baseValue * rarityMultiplier);

    // Essence rewards based on rarity
    let essenceReward = Math.floor(2 * rarityMultiplier * Math.sqrt(level));

    // Remove the weapon
    delete weapons[matchedWeaponId];
    await db.set(`weapons_${userId}`, weapons);

    // Award coins
    await db.add(`cash_${userId}`, coinsReward);

    // Award essence (create if not exists)
    const essence = (await db.get(`essence_${userId}`)) || 0;
    await db.set(`essence_${userId}`, essence + essenceReward);

    // Create response embed
    const embed = new EmbedBuilder()
      .setColor(RARITY_COLORS[rarity])
      .setTitle("✨ Weapon Sacrificed")
      .setDescription(
        `**${displayName}** sacrificed their **${matchedWeapon.name}**!`
      )
      .addFields(
        {
          name: "Sacrificed Weapon",
          value:
            `${matchedWeapon.emoji || "⚔️"} **${matchedWeapon.name}**\n` +
            `${RARITY_DATA[rarity].emoji} ${
              rarity.charAt(0).toUpperCase() + rarity.slice(1)
            }\n` +
            `Level: ${level}`,
        },
        {
          name: "Rewards",
          value:
            `💰 **${formatNumber(coinsReward)} atlyss coins**\n` +
            `✨ **${essenceReward} weapon essence**`,
        },
        {
          name: "What is Essence?",
          value:
            "Essence can be used in the future to craft special weapons or apply enchantments!",
        }
      )
      .setFooter({
        text: "You can sacrifice unwanted weapons to gain valuable resources",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
