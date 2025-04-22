// filepath: c:\bot\commands\buy.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// ARK Items database (source: dododex.com)
const ARK_ITEMS = [
  {
    id: "simple_pistol",
    name: "Simple Pistol",
    image: "https://www.dododex.com/media/item/Simple-Pistol.png",
    price: 5000, // Increased from 1000
    category: "weapon",
    description: "Basic ranged weapon with moderate damage",
    damage: 55,
  },
  {
    id: "pump_shotgun",
    name: "Pump-Action Shotgun",
    image: "https://www.dododex.com/media/item/Pump-Action-Shotgun.png",
    price: 12500, // Increased from 2500
    category: "weapon",
    description: "Short-range weapon with high damage",
    damage: 230,
  },
  {
    id: "assault_rifle",
    name: "Assault Rifle",
    image: "https://www.dododex.com/media/item/Assault-Rifle.png",
    price: 17500, // Increased from 3500
    category: "weapon",
    description: "High-rate of fire with good damage",
    damage: 60,
  },
  {
    id: "fabricated_sniper_rifle",
    name: "Fabricated Sniper Rifle",
    image: "https://www.dododex.com/media/item/Fabricated-Sniper-Rifle.png",
    price: 20000, // Increased from 4000
    category: "weapon",
    description: "Long-range weapon with high damage",
    damage: 280,
  },
  {
    id: "compound_bow",
    name: "Compound Bow",
    image: "https://www.dododex.com/media/item/Compound-Bow.png",
    price: 6000, // Increased from 1200
    category: "weapon",
    description: "Silent ranged weapon",
    damage: 85,
  },
  {
    id: "pike",
    name: "Pike",
    image: "https://www.dododex.com/media/item/Pike.png",
    price: 4000, // Increased from 800
    category: "weapon",
    description: "Melee weapon with good range",
    damage: 50,
  },
  {
    id: "sword",
    name: "Sword",
    image: "https://www.dododex.com/media/item/Sword.png",
    price: 3000, // Increased from 600
    category: "weapon",
    description: "Basic melee weapon",
    damage: 45,
  },
  {
    id: "rocket_launcher",
    name: "Rocket Launcher",
    image: "https://www.dododex.com/media/item/Rocket-Launcher.png",
    price: 35000, // Increased from 7000
    category: "weapon",
    description: "Explosive weapon with area damage",
    damage: 2500,
  },
  {
    id: "flamethrower",
    name: "Flamethrower",
    image: "https://www.dododex.com/media/item/Flamethrower.png",
    price: 16000, // Increased from 3200
    category: "weapon",
    description: "Short-range weapon with burn effect",
    damage: 100,
  },
  // Armor
  {
    id: "cloth_armor",
    name: "Cloth Armor",
    image: "https://www.dododex.com/media/item/Cloth-Shirt.png",
    price: 1500, // Increased from 300
    category: "armor",
    description: "Light armor with basic protection",
    armor: 20,
  },
  {
    id: "hide_armor",
    name: "Hide Armor",
    image: "https://www.dododex.com/media/item/Hide-Shirt.png",
    price: 3000, // Increased from 600
    category: "armor",
    description: "Medium armor with better protection",
    armor: 40,
  },
  {
    id: "flak_armor",
    name: "Flak Armor",
    image: "https://www.dododex.com/media/item/Flak-Chestpiece.png",
    price: 7500, // Increased from 1500
    category: "armor",
    description: "Heavy armor with good protection",
    armor: 90,
  },
  {
    id: "riot_armor",
    name: "Riot Armor",
    image: "https://www.dododex.com/media/item/Riot-Chestpiece.png",
    price: 15000, // Increased from 3000
    category: "armor",
    description: "Advanced armor with excellent protection",
    armor: 125,
  },
  // Tools
  {
    id: "metal_pick",
    name: "Metal Pick",
    image: "https://www.dododex.com/media/item/Metal_Pick.png",
    price: 2250, // Increased from 450
    category: "tool",
    description: "Tool for gathering more metal and flint",
  },
  {
    id: "metal_hatchet",
    name: "Metal Hatchet",
    image: "https://www.dododex.com/media/item/Metal-Hatchet.png",
    price: 1900, // Increased from 380
    category: "tool",
    description: "Tool for gathering more wood",
  },
  {
    id: "spyglass",
    name: "Spyglass",
    image: "https://www.dododex.com/media/item/Spyglass.png",
    price: 1000, // Increased from 200
    category: "tool",
    description: "Look at distant objects and creatures",
  },
  {
    id: "gps",
    name: "GPS",
    image: "https://www.dododex.com/media/item/GPS.png",
    price: 4000, // Increased from 800
    category: "tool",
    description: "Shows your exact coordinates",
  },
  // Resources
  {
    id: "metal_ingot",
    name: "Metal Ingot",
    image: "https://www.dododex.com/media/item/Metal-Ingot.png",
    price: 250, // Increased from 50
    category: "resource",
    description: "Refined metal for crafting",
  },
  {
    id: "cementing_paste",
    name: "Cementing Paste",
    image: "https://www.dododex.com/media/item/Cementing-Paste.png",
    price: 175, // Increased from 35
    category: "resource",
    description: "Used for advanced building",
  },
  {
    id: "polymer",
    name: "Polymer",
    image: "https://www.dododex.com/media/item/Polymer.png",
    price: 300, // Increased from 60
    category: "resource",
    description: "Advanced crafting material",
  },
];

module.exports = {
  name: "buy",
  description: "Buy weapons, armor and items from ARK",
  usage: "!buy [item] [quantity] or !buy list",
  aliases: ["purchase"],
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // If no arguments, show usage
    if (!args || args.length === 0) {
      return message.reply(
        "What would you like to buy? Try `!buy list` to see available items."
      );
    }

    // Check if user wants to see the list of items
    if (args[0].toLowerCase() === "list") {
      return showItemList(message, args[1] ? args[1].toLowerCase() : null);
    }

    // Parse item name and quantity
    const itemName = args.slice(0, -1).join(" ") || args[0];
    const quantity = parseInt(args[args.length - 1]) || 1;

    // Validate quantity
    if (isNaN(quantity) || quantity <= 0) {
      return message.reply("Please enter a valid quantity!");
    }

    // Find the item
    const item = findItem(itemName);
    if (!item) {
      return message.reply(
        `I couldn't find "${itemName}" in the shop. Try \`!buy list\` to see all items.`
      );
    }

    return buyItem(message, userId, displayName, item, quantity);
  },
};

// Show the shop item list
async function showItemList(message, category = null) {
  // Filter items by category if specified
  let items = ARK_ITEMS;
  let categoryName = "All Items";

  if (category) {
    items = ARK_ITEMS.filter(
      (item) => item.category.toLowerCase() === category
    );
    categoryName = category.charAt(0).toUpperCase() + category.slice(1) + "s";

    if (items.length === 0) {
      return message.reply(
        `No items found in category '${category}'. Available categories: weapon, armor, tool, resource.`
      );
    }
  }

  // Get user's balance
  const balance = (await db.get(`cash_${message.author.id}`)) || 0;

  // Create shop embed with all items listed by category
  const embed = new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle(`🛒 ARK Shop - ${categoryName}`)
    .setDescription(
      `Buy weapons, armor and items from ARK Survival Evolved!\n**Your Balance:** ${formatNumber(
        balance
      )} atlyss coins`
    )
    .setFooter({
      text: "Use !buy [item] [quantity] to make a purchase",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Group items by category
  const categories = {};
  items.forEach((item) => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });

  // Add fields for each category
  for (const [cat, catItems] of Object.entries(categories)) {
    const categoryTitle = cat.charAt(0).toUpperCase() + cat.slice(1) + "s";
    let itemList = "";

    // Add items from this category
    catItems.forEach((item) => {
      // Add thumbnail icon format and wrap in brackets to make a small clickable link
      itemList += `[${item.name}](${item.image}) - ${formatNumber(
        item.price
      )} coins`;

      // Add stats in a concise format
      if (item.damage) {
        itemList += ` (DMG: ${item.damage})`;
      } else if (item.armor) {
        itemList += ` (ARM: ${item.armor})`;
      }

      itemList += "\n";
    });

    embed.addFields({
      name: `${getCategoryEmoji(cat)} ${categoryTitle}`,
      value: itemList,
    });
  }

  // Add category filtering help
  embed.addFields({
    name: "Filter Categories",
    value:
      "`!buy list weapon` - Weapons only\n" +
      "`!buy list armor` - Armor only\n" +
      "`!buy list tool` - Tools only\n" +
      "`!buy list resource` - Resources only",
  });

  await message.channel.send({ embeds: [embed] });
  return;
}

// Function to get color for category
function getCategoryColor(category) {
  switch (category) {
    case "weapon":
      return "#e74c3c"; // Red
    case "armor":
      return "#3498db"; // Blue
    case "tool":
      return "#2ecc71"; // Green
    case "resource":
      return "#9b59b6"; // Purple
    default:
      return "#f1c40f"; // Yellow/Gold
  }
}

// Find an item in the shop by name
function findItem(name) {
  if (!name) return null;

  name = name.toLowerCase();

  // Try to find an exact match first
  let item = ARK_ITEMS.find(
    (item) => item.name.toLowerCase() === name || item.id.toLowerCase() === name
  );

  // If no exact match, try partial match
  if (!item) {
    item = ARK_ITEMS.find(
      (item) =>
        item.name.toLowerCase().includes(name) ||
        item.id.toLowerCase().includes(name)
    );
  }

  return item;
}

// Buy an item
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

  // Deduct cost
  await db.add(`cash_${userId}`, -totalCost);

  // Add item to inventory
  const inventory = (await db.get(`inventory_${userId}`)) || {};

  // Initialize item in inventory if not exists
  if (!inventory[item.id]) {
    inventory[item.id] = {
      name: item.name,
      description: item.description,
      image: item.image,
      category: item.category,
      quantity: 0,
    };

    // Add damage or armor stats if applicable
    if (item.damage) inventory[item.id].damage = item.damage;
    if (item.armor) inventory[item.id].armor = item.armor;
  }

  // Add to quantity
  inventory[item.id].quantity += quantity;

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
        name: "Category",
        value: `${getCategoryEmoji(item.category)} ${
          item.category.charAt(0).toUpperCase() + item.category.slice(1)
        }`,
        inline: true,
      },
      {
        name: "Description",
        value: item.description,
        inline: false,
      },
      {
        name: "Inventory",
        value: `You now have ${inventory[item.id].quantity}x **${item.name}**`,
        inline: false,
      }
    )
    .setThumbnail(item.image)
    .setFooter({
      text: "Use !inventory to view your items",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Get emoji for category
function getCategoryEmoji(category) {
  switch (category) {
    case "weapon":
      return "⚔️";
    case "armor":
      return "🛡️";
    case "tool":
      return "🔧";
    case "resource":
      return "📦";
    default:
      return "🛒";
  }
}
