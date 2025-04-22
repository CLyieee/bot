// filepath: c:\bot\commands\equip.js
const db = require("../utils/database");
const { getDisplayName } = require("../utils/helpers");
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

module.exports = {
  name: "equip",
  description: "Equip a weapon for battle",
  usage: "!equip [weapon name]",
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user provided a weapon name
    if (!args.length) {
      return message.reply(
        "Please specify which weapon you want to equip. Usage: `!equip [weapon name]`"
      );
    }

    // Get user's weapons
    const weapons = (await db.get(`weapons_${userId}`)) || {};

    if (Object.keys(weapons).length === 0) {
      return message.reply(
        "You don't have any weapons to equip! Use `!buy list weapon` to browse weapons or `!forge` to craft a new weapon."
      );
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

    // Equip the weapon
    await db.set(`equippedWeapon_${userId}`, matchedWeaponId);

    // Get the rarity color
    const rarityColor = RARITY_COLORS[matchedWeapon.rarity || "common"];

    // Create a response embed
    const embed = new EmbedBuilder()
      .setColor(rarityColor)
      .setTitle("🗡️ Weapon Equipped")
      .setDescription(`**${displayName}** equipped **${matchedWeapon.name}**!`)
      .addFields({
        name: "Weapon Details",
        value:
          `${matchedWeapon.emoji || "⚔️"} **${matchedWeapon.name}**\n` +
          `Damage: ${
            matchedWeapon.damage
              ? `${matchedWeapon.damage[0]}-${matchedWeapon.damage[1]}`
              : "5-15"
          }\n` +
          `Level: ${matchedWeapon.level || 1}\n` +
          `Rarity: ${
            (matchedWeapon.rarity || "common").charAt(0).toUpperCase() +
            (matchedWeapon.rarity || "common").slice(1)
          }`,
      })
      .setFooter({
        text: "This weapon will now be used in all your battles",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (matchedWeapon.image) {
      embed.setThumbnail(matchedWeapon.image);
    }

    return message.channel.send({ embeds: [embed] });
  },
};
