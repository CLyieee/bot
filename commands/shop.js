const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Add new ARK-inspired items to the shop
const SHOP_ITEMS = [
  // Cryopods
  {
    id: "cryopod_basic",
    name: "Basic Cryopod",
    category: "cryopods",
    emoji: "🔵",
    price: 500,
    description: "A basic device for catching low-tier dinosaurs",
    catchRate: 0.4,
    tierBonus: { low: 0.1, mid: 0, high: -0.1, boss: -0.2 },
  },
  {
    id: "cryopod_advanced",
    name: "Advanced Cryopod",
    category: "cryopods",
    emoji: "🟣",
    price: 2500,
    description: "An improved device for catching mid-tier dinosaurs",
    catchRate: 0.6,
    tierBonus: { low: 0.15, mid: 0.1, high: 0, boss: -0.1 },
  },
  {
    id: "cryopod_tek",
    name: "TEK Cryopod",
    category: "cryopods",
    emoji: "⚪",
    price: 3000,
    description: "A high-tech device for catching high-tier dinosaurs",
    catchRate: 0.8,
    tierBonus: { low: 0.2, mid: 0.15, high: 0.1, boss: 0 },
  },
  {
    id: "cryopod_artifact",
    name: "Artifact Cryopod",
    category: "cryopods",
    emoji: "🟡",
    price: 10000,
    description:
      "A legendary device with the best chance to catch any dinosaur",
    catchRate: 0.95,
    tierBonus: { low: 0.3, mid: 0.2, high: 0.15, boss: 0.1 },
  },

  // Catch boosts - Basic items
  {
    id: "narcoberry",
    name: "Narcoberries",
    category: "catch-boosts",
    emoji: "🫐",
    price: 100,
    description: "Increases chance to catch dinosaurs by 10% for 15 minutes",
    boostAmount: 0.1,
  },
  {
    id: "kibble",
    name: "Exceptional Kibble",
    category: "catch-boosts",
    emoji: "🥩",
    price: 250,
    description: "Increases chance to catch dinosaurs by 15% for 20 minutes",
    boostAmount: 0.15,
  },

  // New catch items
  {
    id: "tranq_dart",
    name: "Tranq Dart",
    category: "catch-boosts",
    emoji: "💉",
    price: 300,
    description:
      "Increases chance to catch rare dinosaurs by 20% for 10 minutes",
  },
  {
    id: "tranq_arrow",
    name: "Tranq Arrow",
    category: "catch-boosts",
    emoji: "🏹",
    price: 200,
    description: "Increases chance to catch dinosaurs by 12% for 15 minutes",
  },
  {
    id: "shocking_tranq_dart",
    name: "Shocking Tranq Dart",
    category: "catch-boosts",
    emoji: "⚡",
    price: 600,
    description:
      "Increases chance to catch high tier dinosaurs by 25% for 10 minutes",
  },
  {
    id: "rare_flower",
    name: "Rare Flower",
    category: "catch-boosts",
    emoji: "🌸",
    price: 500,
    description:
      "Increases chance to catch rare and legendary dinosaurs by 18% for 15 minutes",
  },
  {
    id: "biotoxin",
    name: "Biotoxin",
    category: "catch-boosts",
    emoji: "☣️",
    price: 800,
    description:
      "Increases chance to catch boss tier dinosaurs by 30% for 10 minutes",
  },
  {
    id: "element",
    name: "Element",
    category: "catch-boosts",
    emoji: "💠",
    price: 1500,
    description:
      "Increases chance to catch all dinosaurs by 20% for 30 minutes",
  },
  {
    id: "tek_rifle",
    name: "Tek Rifle",
    category: "catch-boosts",
    emoji: "🔫",
    price: 5000,
    description: "Guarantees your next catch attempt will be successful",
  },

  // New Premium Items
  {
    id: "tek_saddle",
    name: "TEK Saddle",
    category: "premium-items",
    emoji: "🛡️",
    price: 8000,
    description:
      "Provides a 30% defense boost to your dinosaur in battles for 5 battles",
    effect: {
      type: "battle_defense",
      value: 30,
      duration: 5,
    },
  },
  {
    id: "revival_stone",
    name: "Revival Stone",
    emoji: "💎",
    category: "premium-items",
    price: 5000,
    description:
      "Revives a dinosaur that has died in battle and returns it to your collection",
    effect: {
      type: "dino_revival",
      value: 1,
    },
  },
  {
    id: "tek_transmitter",
    name: "TEK Transmitter",
    emoji: "📡",
    category: "premium-items",
    price: 7500,
    description:
      "Allows you to see what dinosaur your opponent will use in battle before choosing yours",
    effect: {
      type: "battle_insight",
      value: 3, // Works for 3 battles
      duration: 3,
    },
  },
  {
    id: "cryofridge",
    name: "Cryofridge",
    emoji: "❄️",
    category: "premium-items",
    price: 12000,
    description:
      "Store up to 3 dinosaurs that won't be affected by battle deaths (protects for 7 days)",
    effect: {
      type: "death_prevention",
      value: 3,
      duration: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },

  // New Luxury Items (Ultra Expensive)
  {
    id: "tek_replicator",
    name: "Replicator",
    emoji: "🔷",
    category: "luxury-items",
    price: 25000,
    description:
      "Create one copy of any dinosaur you already own (cooldown: 7 days)",
    effect: {
      type: "dino_clone",
      value: 1,
      cooldown: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
  {
    id: "ascension_terminal",
    name: "Ascension Terminal",
    emoji: "⚡",
    category: "luxury-items",
    price: 30000,
    description:
      "Ascend one dinosaur, permanently adding +3 levels and 20% to all stats",
    effect: {
      type: "permanent_ascension",
      value: {
        levels: 3,
        statBoost: 0.2,
      },
    },
  },
  {
    id: "genesis_device",
    name: "Genesis Device",
    emoji: "🧬",
    category: "luxury-items",
    price: 75000,
    description:
      "Create a new dinosaur with random stats and guaranteed legendary rarity",
    effect: {
      type: "create_legendary",
      value: 1,
    },
  },
  {
    id: "artifact_of_power",
    name: "Artifact of Power",
    emoji: "✨",
    category: "luxury-items",
    price: 75000,
    description:
      "Upgrade any dinosaur's skill power to maximum and add a secondary skill effect",
    effect: {
      type: "skill_mastery",
      value: 1,
    },
  },
  {
    id: "extinction_core",
    name: "Extinction Core",
    emoji: "🌋",
    category: "luxury-items",
    price: 100000,
    description:
      "Gain the ability to tame the extremely rare Titanosaur King (chance: 0.01%)",
    effect: {
      type: "king_chance",
      value: 0.01,
    },
  },

  // Weapons
  // ... (existing weapons code)

  // Armor
  // ... (existing armor code)
];

module.exports = {
  name: "shop",
  description: "Browse and purchase items from the shop",
  usage: "!shop [buy] [item] [quantity]",
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // If no arguments, show the shop
    if (!args || args.length === 0) {
      return showShop(message, userId);
    }

    const action = args[0].toLowerCase();

    // Handle buy command
    if (action === "buy") {
      const itemName = args.slice(1, -1).join(" ") || args[1];
      const quantity = parseInt(args[args.length - 1]) || 1;

      // Check if quantity is valid
      if (isNaN(quantity) || quantity <= 0) {
        return message.reply("Please enter a valid quantity!");
      }

      // Find the item in the shop
      const item = findItem(itemName);
      if (!item) {
        return message.reply(
          `Sorry, I couldn't find "${itemName}" in the shop. Use \`!shop\` to see available items.`
        );
      }

      return buyItem(message, userId, displayName, item, quantity);
    }

    // Handle inventory command
    if (action === "inventory" || action === "inv") {
      return showInventory(message, userId, displayName);
    }

    // Unknown action
    return message.reply(
      `Unknown shop command. Use \`!shop\`, \`!shop buy [item] [quantity]\`, or \`!shop inventory\`.`
    );
  },
};

// Show the shop
async function showShop(message, userId) {
  // Get user's balance
  const balance = (await db.get(`cash_${userId}`)) || 0;

  // Create shop embed
  const embed = new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle("🛒 ARK Survival Shop")
    .setDescription(
      "Purchase cryopods and items to catch, battle, and enhance your dinosaurs!"
    )
    .addFields({
      name: "Your Balance",
      value: `${formatNumber(balance)} atlyss coins`,
      inline: false,
    })
    .setFooter({
      text: "Use !shop buy [item] [quantity] to make a purchase",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Add cryopods section
  let cryopodText = "";
  SHOP_ITEMS.filter((item) => item.category === "cryopods").forEach((item) => {
    cryopodText += `${item.emoji} **${item.name}** - ${formatNumber(
      item.price
    )} coins\n`;
    cryopodText += `*${item.description}* (${Math.round(
      item.catchRate * 100
    )}% catch rate)\n\n`;
  });

  // Get the first cryopod image for the thumbnail
  const firstCryopod = SHOP_ITEMS.find((item) => item.category === "cryopods");
  if (firstCryopod && firstCryopod.image) {
    embed.setThumbnail(firstCryopod.image);
  }

  embed.addFields({
    name: "🦕 Cryopods",
    value: cryopodText || "No cryopods available.",
  });

  // Add boosts section
  let boostsText = "";
  SHOP_ITEMS.filter((item) => item.category === "catch-boosts").forEach(
    (item) => {
      boostsText += `${item.emoji} **${item.name}** - ${formatNumber(
        item.price
      )} coins\n`;
      boostsText += `*${item.description}*\n\n`;
    }
  );
  embed.addFields({
    name: "🧪 Catch Boosts",
    value: boostsText || "No boosts available.",
  });

  // Add premium items section
  let premiumText = "";
  SHOP_ITEMS.filter((item) => item.category === "premium-items").forEach(
    (item) => {
      premiumText += `${item.emoji} **${item.name}** - ${formatNumber(
        item.price
      )} coins\n`;
      premiumText += `*${item.description}*\n\n`;
    }
  );

  if (premiumText) {
    embed.addFields({
      name: "⭐ Premium Items",
      value: premiumText,
    });
  }

  // Create and send luxury items embed separately (too many fields for one embed)
  const luxuryItems = SHOP_ITEMS.filter(
    (item) => item.category === "luxury-items"
  );

  if (luxuryItems.length > 0) {
    const luxuryEmbed = new EmbedBuilder()
      .setColor("#9B59B6") // Purple color for luxury
      .setTitle("👑 Luxury Items")
      .setDescription("The most exclusive and powerful items available!")
      .setFooter({
        text: "Use !shop buy [item] [quantity] to make a purchase",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    let luxuryText = "";
    luxuryItems.forEach((item) => {
      luxuryText += `${item.emoji} **${item.name}** - ${formatNumber(
        item.price
      )} coins\n`;
      luxuryText += `*${item.description}*\n\n`;
    });

    luxuryEmbed.addFields({
      name: "✨ Exclusive Luxury Items",
      value: luxuryText,
    });

    // Send both embeds
    message.channel.send({ embeds: [embed] }).then(() => {
      message.channel.send({ embeds: [luxuryEmbed] });
    });
  } else {
    // Just send the main embed if no luxury items
    message.channel.send({ embeds: [embed] });
  }
}

// Find an item in the shop by name
function findItem(name) {
  if (!name) return null;

  name = name.toLowerCase();

  // Try to find an exact match first
  let item = SHOP_ITEMS.find(
    (item) => item.name.toLowerCase() === name || item.id.toLowerCase() === name
  );

  // If no exact match, try partial match
  if (!item) {
    item = SHOP_ITEMS.find(
      (item) =>
        item.name.toLowerCase().includes(name) ||
        item.id.toLowerCase().includes(name)
    );
  }

  return item;
}

// Buy an item from the shop
async function buyItem(message, userId, displayName, item, quantity) {
  // Calculate total cost
  const totalCost = item.price * quantity;

  // Check if user has enough money
  const balance = (await db.get(`cash_${userId}`)) || 0;
  if (balance < totalCost) {
    return message.reply(
      `You don't have enough coins! You need ${formatNumber(
        totalCost
      )} coins, but you only have ${formatNumber(balance)}.`
    );
  }

  // Deduct cost - using db.add with a negative value instead of db.subtract
  await db.add(`cash_${userId}`, -totalCost);

  // Add item to inventory
  const inventory = (await db.get(`inventory_${userId}`)) || {};

  // Fix: Ensure we're using the correct item ID from the shop
  const itemId = item.id;

  // Initialize item in inventory if not exists
  if (!inventory[itemId]) {
    inventory[itemId] = {
      name: item.name,
      description: item.description,
      emoji: item.emoji,
      image: item.image, // Save the image URL in the inventory
      quantity: 0,
    };
  }

  // Add to quantity
  inventory[itemId].quantity += quantity;

  // Save inventory
  await db.set(`inventory_${userId}`, inventory);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("🛍️ Purchase Successful")
    .setDescription(`${displayName} bought ${quantity}x **${item.name}**!`)
    .addFields(
      {
        name: "Total Cost",
        value: `${formatNumber(totalCost)} atlyss coins`,
        inline: true,
      },
      {
        name: "New Balance",
        value: `${formatNumber(balance - totalCost)} atlyss coins`,
        inline: true,
      },
      {
        name: "New Stock",
        value: `You now have ${inventory[itemId].quantity}x **${item.name}**`,
        inline: false,
      }
    )
    .setThumbnail(item.image)
    .setFooter({
      text: "Use !catch to use your cryopods!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Send success message
  message.channel.send({ embeds: [embed] });
}

// Show user's inventory
async function showInventory(message, userId, displayName) {
  // Get user's inventory
  const inventory = (await db.get(`inventory_${userId}`)) || {};

  // Check if inventory is empty
  if (Object.keys(inventory).length === 0) {
    return message.reply(
      "Your inventory is empty! Use `!shop buy` to purchase items."
    );
  }

  // Create inventory embed
  const embed = new EmbedBuilder()
    .setColor("#3498db")
    .setTitle(`${displayName}'s Inventory`)
    .setDescription("Here are all the items in your inventory:")
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: "Use !catch to use your cryopods",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Group items by category
  const cryopods = [];
  const boosts = [];
  const other = [];

  // Sort items into categories
  for (const [id, item] of Object.entries(inventory)) {
    if (item.quantity <= 0) continue;

    const shopItem = SHOP_ITEMS.find((si) => si.id === id);
    if (!shopItem) {
      other.push(`${item.emoji} **${item.name}** x${item.quantity}`);
      continue;
    }

    if (shopItem.category === "cryopods") {
      cryopods.push(
        `**${item.name}** x${item.quantity} - *${Math.round(
          shopItem.catchRate * 100
        )}% catch rate*`
      );
    } else if (shopItem.category === "catch-boosts") {
      boosts.push(
        `${item.emoji} **${item.name}** x${item.quantity} - *${shopItem.description}*`
      );
    } else {
      other.push(`${item.emoji} **${item.name}** x${item.quantity}`);
    }
  }

  // Add fields for categories
  if (cryopods.length > 0) {
    embed.addFields({ name: "🔵 Cryopods", value: cryopods.join("\n") });

    // Add the first cryopod image as the thumbnail if available
    const firstCryopodId = Object.keys(inventory).find((id) =>
      SHOP_ITEMS.find((item) => item.id === id && item.category === "cryopods")
    );

    if (firstCryopodId && inventory[firstCryopodId].image) {
      // Use the image as a thumbnail or image
      embed.setImage(inventory[firstCryopodId].image);
    }
  }

  if (boosts.length > 0) {
    embed.addFields({ name: "🧪 Boosts", value: boosts.join("\n") });
  }

  if (other.length > 0) {
    embed.addFields({ name: "📦 Other Items", value: other.join("\n") });
  }

  // Send inventory message
  message.channel.send({ embeds: [embed] });
}
