// filepath: c:\bot\commands\transfer.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Rarity colors for display
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

module.exports = {
  name: "transfer",
  description: "Transfer money, dinosaurs, or animals to another user",
  usage: "!transfer @user [amount] [type] [item]",
  aliases: ["give", "gift"],
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user provided enough arguments
    if (!args.length || args.length < 2) {
      return message.reply(
        "Please specify who you want to transfer to and what you want to transfer. Usage: `!transfer @user [amount] [type] [item]`\n" +
          "Examples:\n" +
          "`!transfer @user 1000` - Transfer 1000 atlyss coins\n" +
          "`!transfer @user 2 dino Dodo` - Transfer 2 Dodos\n" +
          "`!transfer @user 3 animal Wolf` - Transfer 3 Wolves"
      );
    }

    // Check if the target user is mentioned
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply("You must mention a user to transfer to!");
    }

    // Check if target is the same as the user
    if (target.id === userId) {
      return message.reply("You can't transfer to yourself!");
    }

    // Check if target is a bot
    if (target.bot) {
      return message.reply("You can't transfer to bots!");
    }

    const targetName = getDisplayName(
      message.guild.members.cache.get(target.id)
    );

    // Remove mention from args
    args.shift();

    // Check if there are enough arguments left
    if (args.length < 1) {
      return message.reply("Please specify what you want to transfer.");
    }

    // Check if first argument is a number
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply("Please enter a valid amount to transfer.");
    }

    // Default to money transfer if no type specified
    if (args.length === 1) {
      return transferMoney(
        message,
        userId,
        displayName,
        target.id,
        targetName,
        amount
      );
    }

    // Check what type of transfer
    const transferType = args[1].toLowerCase();

    // Handle different transfer types
    switch (transferType) {
      case "money":
      case "coins":
      case "coin":
        return transferMoney(
          message,
          userId,
          displayName,
          target.id,
          targetName,
          amount
        );

      case "dino":
      case "dinosaur":
        if (args.length < 3) {
          return message.reply(
            "Please specify which dinosaur you want to transfer."
          );
        }
        const dinoName = args.slice(2).join(" ");
        return transferItem(
          message,
          userId,
          displayName,
          target.id,
          targetName,
          amount,
          "dino",
          dinoName
        );

      case "animal":
        if (args.length < 3) {
          return message.reply(
            "Please specify which animal you want to transfer."
          );
        }
        const animalName = args.slice(2).join(" ");
        return transferItem(
          message,
          userId,
          displayName,
          target.id,
          targetName,
          amount,
          "animal",
          animalName
        );

      case "item":
        if (args.length < 3) {
          return message.reply(
            "Please specify which item you want to transfer."
          );
        }
        const itemName = args.slice(2).join(" ");
        return transferItem(
          message,
          userId,
          displayName,
          target.id,
          targetName,
          amount,
          "item",
          itemName
        );

      default:
        // Assume second argument is the start of item name and first argument is type
        if (args.length >= 2) {
          const itemName = args.slice(1).join(" ");
          // Try to detect if this is a dino, animal, or item by checking user's collections
          const itemType = await detectItemType(userId, itemName);
          if (itemType) {
            return transferItem(
              message,
              userId,
              displayName,
              target.id,
              targetName,
              amount,
              itemType,
              itemName
            );
          }
        }

        return message.reply(
          "Please specify what you want to transfer. Format: `!transfer @user [amount] [type] [item]`"
        );
    }
  },
};

// Transfer money between users
async function transferMoney(
  message,
  senderId,
  senderName,
  receiverId,
  receiverName,
  amount
) {
  // Check if sender has enough money
  const senderBalance = (await db.get(`cash_${senderId}`)) || 0;
  if (senderBalance < amount) {
    return message.reply(
      `You don't have enough atlyss coins! You only have ${formatNumber(
        senderBalance
      )}.`
    );
  }

  // Transfer the money
  await db.add(`cash_${senderId}`, -amount);
  await db.add(`cash_${receiverId}`, amount);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor("#2ecc71") // Green for success
    .setTitle("💰 Transfer Complete")
    .setDescription(
      `${senderName} transferred **${formatNumber(
        amount
      )} atlyss coins** to ${receiverName}!`
    )
    .addFields(
      {
        name: "Sender's New Balance",
        value: `${formatNumber(senderBalance - amount)} atlyss coins`,
        inline: true,
      },
      {
        name: "Amount Transferred",
        value: `${formatNumber(amount)} atlyss coins`,
        inline: true,
      }
    )
    .setThumbnail("https://i.imgur.com/7BFD5j1.png") // Coin icon
    .setFooter({
      text: `Transaction ID: ${Date.now()}`,
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Transfer items between users
async function transferItem(
  message,
  senderId,
  senderName,
  receiverId,
  receiverName,
  amount,
  type,
  itemName
) {
  // Get collection keys
  const collectionInfo = getCollectionInfo(type);
  if (!collectionInfo) {
    return message.reply(
      "Invalid item type. You can transfer: dino, animal, or item."
    );
  }

  const senderCollectionKey = `${collectionInfo.key}_${senderId}`;
  const receiverCollectionKey = `${collectionInfo.key}_${receiverId}`;

  // Get collections
  const senderCollection = (await db.get(senderCollectionKey)) || {};
  const receiverCollection = (await db.get(receiverCollectionKey)) || {};

  // Find item in sender's collection
  const senderItem = findItem(senderCollection, itemName);
  if (!senderItem) {
    return message.reply(`You don't have any ${itemName} in your collection!`);
  }

  // Check if sender has enough of the item
  if (senderItem.data.count < amount) {
    return message.reply(
      `You only have ${senderItem.data.count}x ${senderItem.name}!`
    );
  }

  // Remove from sender
  if (senderItem.data.count <= amount) {
    delete senderCollection[senderItem.name];
  } else {
    senderCollection[senderItem.name].count -= amount;
  }

  // Add to receiver
  if (receiverCollection[senderItem.name]) {
    receiverCollection[senderItem.name].count += amount;
  } else {
    receiverCollection[senderItem.name] = { ...senderItem.data };
    receiverCollection[senderItem.name].count = amount;
  }

  // Save collections
  await db.set(senderCollectionKey, senderCollection);
  await db.set(receiverCollectionKey, receiverCollection);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor(
      senderItem.data.rarity ? RARITY_COLORS[senderItem.data.rarity] : "#3498db"
    )
    .setTitle("🎁 Gift Complete")
    .setDescription(
      `${senderName} gave **${amount}x ${senderItem.name}** to ${receiverName}!`
    )
    .addFields(
      {
        name: "Item",
        value: `${collectionInfo.emoji} ${senderItem.name}`,
        inline: true,
      },
      {
        name: "Amount",
        value: `${amount}`,
        inline: true,
      },
      {
        name: `${senderName}'s Remaining`,
        value: `${senderItem.data.count - amount}x ${senderItem.name}`,
        inline: true,
      }
    )
    .setFooter({
      text: `Transaction ID: ${Date.now()}`,
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Add image if available
  if (senderItem.data.image) {
    embed.setThumbnail(senderItem.data.image);
  }

  // Add rarity if available
  if (senderItem.data.rarity) {
    embed.addFields({
      name: "Rarity",
      value: `${RARITY_EMOJIS[senderItem.data.rarity]} ${
        senderItem.data.rarity.charAt(0).toUpperCase() +
        senderItem.data.rarity.slice(1)
      }`,
      inline: true,
    });
  }

  return message.channel.send({ embeds: [embed] });
}

// Find an item in a collection by name (case insensitive partial match)
function findItem(collection, itemName) {
  // Normalize the search term
  const searchTerm = itemName.toLowerCase();

  // Look for a match
  for (const [name, data] of Object.entries(collection)) {
    if (name.toLowerCase().includes(searchTerm)) {
      return { name, data };
    }
  }

  return null;
}

// Get collection info based on type
function getCollectionInfo(type) {
  switch (type) {
    case "dino":
    case "dinosaur":
      return { key: "dinos", name: "Dinosaurs", emoji: "🦖" };
    case "animal":
      return { key: "animals", name: "Animals", emoji: "🐾" };
    case "item":
      return { key: "inventory", name: "Items", emoji: "📦" };
    default:
      return null;
  }
}

// Detect item type by checking which collection it's in
async function detectItemType(userId, itemName) {
  // Check dinos
  const dinos = (await db.get(`dinos_${userId}`)) || {};
  if (findItem(dinos, itemName)) {
    return "dino";
  }

  // Check animals
  const animals = (await db.get(`animals_${userId}`)) || {};
  if (findItem(animals, itemName)) {
    return "animal";
  }

  // Check inventory
  const inventory = (await db.get(`inventory_${userId}`)) || {};
  if (findItem(inventory, itemName)) {
    return "item";
  }

  return null;
}
