// filepath: c:\bot\commands\forge.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Weapon forge options
const WEAPON_TYPES = [
  {
    name: "Sword",
    emoji: "⚔️",
    baseDamage: [10, 20],
    cost: 2000,
    materials: { metal_ingot: 4 },
  },
  {
    name: "Axe",
    emoji: "🪓",
    baseDamage: [12, 18],
    cost: 1800,
    materials: { metal_ingot: 3, cementing_paste: 2 },
  },
  {
    name: "Mace",
    emoji: "🔨",
    baseDamage: [13, 17],
    cost: 1700,
    materials: { metal_ingot: 3, polymer: 1 },
  },
  {
    name: "Spear",
    emoji: "🗡️",
    baseDamage: [8, 22],
    cost: 1500,
    materials: { metal_ingot: 2, cementing_paste: 2 },
  },
  {
    name: "Bow",
    emoji: "🏹",
    baseDamage: [7, 23],
    cost: 2200,
    materials: { cementing_paste: 3, polymer: 2 },
  },
  {
    name: "Crossbow",
    emoji: "🏹",
    baseDamage: [14, 21],
    cost: 3000,
    materials: { metal_ingot: 3, polymer: 4 },
  },
  {
    name: "Pike",
    emoji: "🔱",
    baseDamage: [15, 20],
    cost: 3200,
    materials: { metal_ingot: 4, polymer: 2 },
  },
];

// Rarity chances
const RARITY_CHANCES = {
  common: 50, // 50% chance
  uncommon: 30, // 30% chance
  rare: 14, // 14% chance
  epic: 5, // 5% chance
  legendary: 0.95, // 0.95% chance
  mythical: 0.05, // 0.05% chance
};

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

// Rarity damage multipliers
const RARITY_MULTIPLIERS = {
  common: 1,
  uncommon: 1.2,
  rare: 1.5,
  epic: 1.8,
  legendary: 2.2,
  mythical: 3.0,
};

module.exports = {
  name: "forge",
  description: "Forge a new weapon",
  usage: "!forge [weapon type]",
  cooldown: 3 * 60 * 1000, // 3 minute cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // If no arguments, show forge options
    if (!args.length) {
      return showForgeOptions(message);
    }

    // Parse weapon type
    const weaponType = args.join(" ").toLowerCase();
    const weaponTemplate = WEAPON_TYPES.find(
      (w) => w.name.toLowerCase() === weaponType
    );

    if (!weaponTemplate) {
      return message.reply(
        `"${args.join(
          " "
        )}" is not a valid weapon type to forge. Use \`!forge\` to see available options.`
      );
    }

    // Check if user has enough money
    const balance = (await db.get(`cash_${userId}`)) || 0;
    if (balance < weaponTemplate.cost) {
      return message.reply(
        `You don't have enough atlyss coins to forge a ${
          weaponTemplate.name
        }! You need ${formatNumber(weaponTemplate.cost)} coins.`
      );
    }

    // Check if user has required materials
    const inventory = (await db.get(`inventory_${userId}`)) || {};
    const missingMaterials = [];

    for (const [materialId, requiredAmount] of Object.entries(
      weaponTemplate.materials
    )) {
      const userMaterial = inventory[materialId];
      if (!userMaterial || userMaterial.quantity < requiredAmount) {
        const materialName = materialId.replace(/_/g, " ");
        missingMaterials.push(
          `${
            materialName.charAt(0).toUpperCase() + materialName.slice(1)
          } (need ${requiredAmount})`
        );
      }
    }

    if (missingMaterials.length > 0) {
      return message.reply(
        `You're missing materials to forge a ${
          weaponTemplate.name
        }!\nMissing: ${missingMaterials.join(", ")}\n` +
          `Use \`!buy list resource\` to buy resources from the shop.`
      );
    }

    // Deduct cost and materials
    await db.add(`cash_${userId}`, -weaponTemplate.cost);

    for (const [materialId, requiredAmount] of Object.entries(
      weaponTemplate.materials
    )) {
      inventory[materialId].quantity -= requiredAmount;

      // Remove material from inventory if quantity is 0
      if (inventory[materialId].quantity <= 0) {
        delete inventory[materialId];
      }
    }

    // Save updated inventory
    await db.set(`inventory_${userId}`, inventory);

    // Generate weapon with random rarity
    const rarity = determineRarity();
    const rarityMultiplier = RARITY_MULTIPLIERS[rarity];
    const weaponId = `weapon_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Generate an adjective based on rarity
    const adjectives = {
      common: ["Basic", "Simple", "Standard", "Ordinary"],
      uncommon: ["Sturdy", "Quality", "Reliable", "Solid"],
      rare: ["Enhanced", "Superior", "Excellent", "Refined"],
      epic: ["Masterwork", "Elite", "Premium", "Majestic"],
      legendary: ["Ancient", "Legendary", "Mythic", "Divine"],
      mythical: ["Godly", "Cosmic", "Transcendent", "Ultimate"],
    };

    // Generate weapon name with adjective
    const adjective =
      adjectives[rarity][Math.floor(Math.random() * adjectives[rarity].length)];
    const weaponName = `${adjective} ${weaponTemplate.name}`;

    // Calculate damage with rarity boost
    const minDamage = Math.floor(
      weaponTemplate.baseDamage[0] * rarityMultiplier
    );
    const maxDamage = Math.floor(
      weaponTemplate.baseDamage[1] * rarityMultiplier
    );

    // Create weapon object
    const weapon = {
      name: weaponName,
      emoji: weaponTemplate.emoji,
      damage: [minDamage, maxDamage],
      rarity: rarity,
      level: 1,
      xp: 0,
      type: weaponTemplate.name.toLowerCase(),
      forgedAt: Date.now(),
    };

    // Add to user's weapons
    const weapons = (await db.get(`weapons_${userId}`)) || {};
    weapons[weaponId] = weapon;
    await db.set(`weapons_${userId}`, weapons);

    // If user doesn't have a weapon equipped, equip this one
    const equippedWeapon = await db.get(`equippedWeapon_${userId}`);
    if (!equippedWeapon) {
      await db.set(`equippedWeapon_${userId}`, weaponId);
    }

    // Create result embed
    const embed = new EmbedBuilder()
      .setColor(RARITY_COLORS[rarity])
      .setTitle("⚒️ Weapon Forged Successfully")
      .setDescription(
        `**${displayName}** forged a new weapon: **${weaponName}**!`
      )
      .addFields(
        {
          name: "Weapon Details",
          value:
            `${weaponTemplate.emoji} **${weaponName}**\n` +
            `${RARITY_EMOJIS[rarity]} ${
              rarity.charAt(0).toUpperCase() + rarity.slice(1)
            }\n` +
            `Damage: ${minDamage}-${maxDamage}\n` +
            `Level: 1`,
        },
        {
          name: "Materials Used",
          value: Object.entries(weaponTemplate.materials)
            .map(
              ([id, amount]) =>
                `${amount}x ${
                  id.replace(/_/g, " ").charAt(0).toUpperCase() +
                  id.replace(/_/g, " ").slice(1)
                }`
            )
            .join("\n"),
        },
        {
          name: "Cost",
          value: `${formatNumber(weaponTemplate.cost)} atlyss coins`,
        }
      )
      .setFooter({
        text: `Use !weapons to see your collection | ${
          equippedWeapon
            ? "Use !equip to switch weapons"
            : "This weapon has been equipped automatically"
        }`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};

// Show available forge options
async function showForgeOptions(message) {
  const userId = message.author.id;
  const balance = (await db.get(`cash_${userId}`)) || 0;
  const inventory = (await db.get(`inventory_${userId}`)) || {};

  const embed = new EmbedBuilder()
    .setColor("#ff9900")
    .setTitle("⚒️ Weapon Forge")
    .setDescription(
      "Forge powerful weapons for battle!\n" +
        "Use `!forge [weapon name]` to craft a weapon.\n\n" +
        `Your Balance: **${formatNumber(balance)} atlyss coins**`
    )
    .setFooter({
      text: "Each forged weapon has a chance of different rarity",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Add available weapons to forge
  for (const weapon of WEAPON_TYPES) {
    // Check if user has required materials
    const materialsStatus = Object.entries(weapon.materials)
      .map(([materialId, amount]) => {
        const material = inventory[materialId];
        const materialName = materialId.replace(/_/g, " ");
        const formattedName =
          materialName.charAt(0).toUpperCase() + materialName.slice(1);
        const available = material && material.quantity >= amount;

        return `${available ? "✅" : "❌"} ${amount}x ${formattedName} (${
          material ? material.quantity : 0
        }/${amount})`;
      })
      .join("\n");

    // Check if user has enough money
    const canAfford = balance >= weapon.cost;

    embed.addFields({
      name: `${weapon.emoji} ${weapon.name} - ${formatNumber(
        weapon.cost
      )} coins ${canAfford ? "✅" : "❌"}`,
      value: `Base Damage: ${weapon.baseDamage[0]}-${weapon.baseDamage[1]}\nRequired Materials:\n${materialsStatus}`,
    });
  }

  // Add rarity information
  embed.addFields({
    name: "Rarity Chances",
    value: Object.entries(RARITY_CHANCES)
      .map(
        ([rarity, chance]) =>
          `${RARITY_EMOJIS[rarity]} ${
            rarity.charAt(0).toUpperCase() + rarity.slice(1)
          }: ${chance}% chance`
      )
      .join("\n"),
  });

  await message.channel.send({ embeds: [embed] });
}

// Determine weapon rarity based on chances
function determineRarity() {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const [rarity, chance] of Object.entries(RARITY_CHANCES)) {
    cumulative += chance;
    if (roll <= cumulative) {
      return rarity;
    }
  }

  return "common"; // Default fallback
}
