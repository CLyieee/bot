// filepath: c:\bot\commands\trade.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

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

// Active trades
const activeTradeOffers = new Map();

module.exports = {
  name: "trade",
  description: "Trade dinosaurs, animals, or items with other users",
  usage: "!trade @user [type] [item] [amount] [for] [type2] [item2] [amount2]",
  aliases: ["t"],
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user provided enough arguments
    if (!args.length) {
      return message.reply(
        "Please specify who you want to trade with and what you want to trade. Usage: `!trade @user [type] [item] [amount] for [type2] [item2] [amount2]`\n" +
          "Examples:\n" +
          "`!trade @user dino Dodo 2 for dino Rex 1` - Trade 2 Dodos for 1 Rex\n" +
          "`!trade @user dino Dodo 2 for item Sword 1` - Trade 2 Dodos for 1 Sword\n" +
          "`!trade @user item Flamethrower 1 for animal Wolf 2` - Trade a Flamethrower for 2 Wolves"
      );
    }

    // Check if the target user is mentioned
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply("You must mention a user to trade with!");
    }

    // Check if target is the same as the user
    if (target.id === userId) {
      return message.reply("You can't trade with yourself!");
    }

    // Check if target is a bot
    if (target.bot) {
      return message.reply("You can't trade with bots!");
    }

    // Remove mention from args
    args.shift();

    // Check if there are enough arguments left
    if (args.length < 5) {
      return message.reply(
        "Please provide what you want to trade. Format: `!trade @user [type] [item] [amount] for [type2] [item2] [amount2]`"
      );
    }

    // Check if user or target already has an active trade
    if (activeTradeOffers.has(userId) || activeTradeOffers.has(target.id)) {
      return message.reply(
        "Either you or the target user already has an active trade. Finish or cancel that trade first."
      );
    }

    // Parse trade offer
    try {
      const tradeOffer = await parseTradeOffer(
        message,
        args,
        userId,
        target.id
      );
      if (!tradeOffer) return; // parseTradeOffer will send error messages

      // Create a unique ID for this trade
      const tradeId = `${userId}-${target.id}-${Date.now()}`;

      // Store the trade offer
      activeTradeOffers.set(userId, tradeId);
      activeTradeOffers.set(target.id, tradeId);

      // Create and send the trade offer
      await sendTradeOffer(message, tradeOffer, tradeId);
    } catch (error) {
      console.error("Trade error:", error);
      return message.reply(
        "There was an error processing your trade offer. Please try again."
      );
    }
  },
};

// Parse the trade offer from arguments
async function parseTradeOffer(message, args, userId, targetId) {
  let currentIndex = 0;
  const offer = {
    sender: {
      id: userId,
      name: getDisplayName(message.member),
    },
    receiver: {
      id: targetId,
      name: getDisplayName(message.guild.members.cache.get(targetId)),
    },
    senderOffer: { type: null, item: null, amount: 0, data: null },
    receiverOffer: { type: null, item: null, amount: 0, data: null },
  };

  // Parse sender's offer
  if (currentIndex >= args.length) {
    message.reply(
      "Invalid trade format. Please specify what you want to trade."
    );
    return null;
  }

  // Parse sender's offer type
  const senderType = args[currentIndex].toLowerCase();
  if (
    !["dino", "dinosaur", "animal", "item", "money", "coins"].includes(
      senderType
    )
  ) {
    message.reply(
      "Invalid item type. You can trade: dino, animal, item, or money/coins."
    );
    return null;
  }

  offer.senderOffer.type = standardizeType(senderType);
  currentIndex++;

  // If money/coins, parse amount
  if (offer.senderOffer.type === "money") {
    if (currentIndex >= args.length) {
      message.reply("Please specify the amount of coins.");
      return null;
    }

    const amount = parseInt(args[currentIndex]);
    if (isNaN(amount) || amount <= 0) {
      message.reply("Please enter a valid amount of coins.");
      return null;
    }

    offer.senderOffer.item = "atlyss coins";
    offer.senderOffer.amount = amount;

    // Verify sender has enough money
    const senderBalance = (await db.get(`cash_${userId}`)) || 0;
    if (senderBalance < amount) {
      message.reply(
        `You don't have enough atlyss coins! You only have ${formatNumber(
          senderBalance
        )}.`
      );
      return null;
    }

    currentIndex++;
  }
  // Otherwise parse item name and amount
  else {
    if (currentIndex >= args.length) {
      message.reply("Please specify the item name.");
      return null;
    }

    // Item name might be multiple words, so we need to find "for" keyword
    const itemNameParts = [];
    let foundAmount = false;

    while (currentIndex < args.length) {
      const part = args[currentIndex].toLowerCase();

      // If we hit a number, it's the amount
      if (!foundAmount && !isNaN(parseInt(part))) {
        offer.senderOffer.amount = parseInt(part);
        foundAmount = true;
        currentIndex++;
        break;
      }

      // If we hit "for", we're done with item name
      if (part === "for") {
        break;
      }

      itemNameParts.push(args[currentIndex]);
      currentIndex++;
    }

    offer.senderOffer.item = itemNameParts.join(" ");

    // Verify item exists in sender's inventory
    const senderCollection = await getCollection(
      userId,
      offer.senderOffer.type
    );
    if (!senderCollection) {
      message.reply(`Your ${offer.senderOffer.type} collection is empty!`);
      return null;
    }

    const senderItem = findItem(senderCollection, offer.senderOffer.item);
    if (!senderItem) {
      message.reply(
        `You don't have any ${offer.senderOffer.item} in your ${offer.senderOffer.type} collection!`
      );
      return null;
    }

    offer.senderOffer.data = senderItem.data;

    // If amount wasn't specified, find it now
    if (!foundAmount) {
      if (currentIndex >= args.length) {
        message.reply("Please specify the amount.");
        return null;
      }

      const amount = parseInt(args[currentIndex]);
      if (isNaN(amount) || amount <= 0) {
        message.reply("Please enter a valid amount.");
        return null;
      }

      offer.senderOffer.amount = amount;
      currentIndex++;
    }

    // Verify amount is available
    if (senderItem.data.count < offer.senderOffer.amount) {
      message.reply(
        `You only have ${senderItem.data.count}x ${senderItem.name}!`
      );
      return null;
    }
  }

  // Look for "for" keyword
  if (
    currentIndex >= args.length ||
    args[currentIndex].toLowerCase() !== "for"
  ) {
    message.reply(
      'Please use the "for" keyword between what you\'re offering and what you want.'
    );
    return null;
  }
  currentIndex++;

  // Parse receiver's offer
  if (currentIndex >= args.length) {
    message.reply("Please specify what you want in return.");
    return null;
  }

  // Parse receiver's offer type
  const receiverType = args[currentIndex].toLowerCase();
  if (
    !["dino", "dinosaur", "animal", "item", "money", "coins"].includes(
      receiverType
    )
  ) {
    message.reply(
      "Invalid item type. You can trade for: dino, animal, item, or money/coins."
    );
    return null;
  }

  offer.receiverOffer.type = standardizeType(receiverType);
  currentIndex++;

  // If money/coins, parse amount
  if (offer.receiverOffer.type === "money") {
    if (currentIndex >= args.length) {
      message.reply("Please specify the amount of coins you want.");
      return null;
    }

    const amount = parseInt(args[currentIndex]);
    if (isNaN(amount) || amount <= 0) {
      message.reply("Please enter a valid amount of coins.");
      return null;
    }

    offer.receiverOffer.item = "atlyss coins";
    offer.receiverOffer.amount = amount;

    // Verify receiver has enough money
    const receiverBalance = (await db.get(`cash_${targetId}`)) || 0;
    if (receiverBalance < amount) {
      message.reply(
        `${
          offer.receiver.name
        } doesn't have enough atlyss coins! They only have ${formatNumber(
          receiverBalance
        )}.`
      );
      return null;
    }
  }
  // Otherwise parse item name and amount
  else {
    if (currentIndex >= args.length) {
      message.reply("Please specify the item name you want.");
      return null;
    }

    // Item name might be multiple words, collect until we find a number
    const itemNameParts = [];
    let foundAmount = false;

    while (currentIndex < args.length) {
      const part = args[currentIndex];

      // If we hit a number, it's the amount
      if (!isNaN(parseInt(part))) {
        offer.receiverOffer.amount = parseInt(part);
        foundAmount = true;
        break;
      }

      itemNameParts.push(part);
      currentIndex++;
    }

    offer.receiverOffer.item = itemNameParts.join(" ");

    // If amount wasn't found, assume it's the last argument
    if (!foundAmount && currentIndex < args.length) {
      const amount = parseInt(args[currentIndex]);
      if (isNaN(amount) || amount <= 0) {
        message.reply("Please enter a valid amount for the item you want.");
        return null;
      }

      offer.receiverOffer.amount = amount;
    }

    // Default to 1 if no amount specified
    if (!offer.receiverOffer.amount) {
      offer.receiverOffer.amount = 1;
    }
  }

  return offer;
}

// Get collection based on type
async function getCollection(userId, type) {
  let collectionKey;

  switch (type) {
    case "dino":
    case "dinosaur":
      collectionKey = `dinos_${userId}`;
      break;
    case "animal":
      collectionKey = `animals_${userId}`;
      break;
    case "item":
      collectionKey = `inventory_${userId}`;
      break;
    default:
      return null;
  }

  return (await db.get(collectionKey)) || {};
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

// Standardize type names
function standardizeType(type) {
  if (type === "dinosaur" || type === "dino") return "dino";
  if (type === "money" || type === "coins") return "money";
  return type;
}

// Send trade offer
async function sendTradeOffer(message, tradeOffer, tradeId) {
  // Create the trade offer embed
  const embed = new EmbedBuilder()
    .setColor("#ff9900") // Orange for trade offers
    .setTitle("🔄 Trade Offer")
    .setDescription(
      `${tradeOffer.sender.name} wants to trade with ${tradeOffer.receiver.name}!`
    )
    .addFields(
      {
        name: `${tradeOffer.sender.name} offers:`,
        value: formatOfferDetails(tradeOffer.senderOffer),
        inline: true,
      },
      {
        name: `For ${tradeOffer.receiver.name}'s:`,
        value: formatOfferDetails(tradeOffer.receiverOffer),
        inline: true,
      }
    )
    .setFooter({
      text: "This trade offer expires in 2 minutes",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Create buttons
  const tradeButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${tradeId}`)
      .setLabel("Accept Trade")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`decline_${tradeId}`)
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );

  // Send the trade offer
  const tradeMsg = await message.channel.send({
    content: `<@${tradeOffer.receiver.id}>, you have received a trade offer!`,
    embeds: [embed],
    components: [tradeButtons],
  });

  // Store the trade object with the message for reference
  const trade = {
    id: tradeId,
    senderId: tradeOffer.sender.id,
    senderName: tradeOffer.sender.name,
    receiverId: tradeOffer.receiver.id,
    receiverName: tradeOffer.receiver.name,
    senderOffer: tradeOffer.senderOffer,
    receiverOffer: tradeOffer.receiverOffer,
    message: tradeMsg,
  };

  // Set up the collector for button interactions
  const collector = tradeMsg.createMessageComponentCollector({
    time: 120000, // 2 minutes
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== trade.receiverId) {
      return interaction.reply({
        content: "This trade offer isn't for you!",
        ephemeral: true,
      });
    }

    if (interaction.customId === `accept_${tradeId}`) {
      collector.stop("accepted");
      await processTrade(interaction, trade, true);
    } else if (interaction.customId === `decline_${tradeId}`) {
      collector.stop("declined");
      await processTrade(interaction, trade, false);
    }
  });

  // Handle trade offer expiration
  collector.on("end", async (collected, reason) => {
    if (reason !== "accepted" && reason !== "declined") {
      // If the trade wasn't accepted or declined, it expired
      activeTradeOffers.delete(trade.senderId);
      activeTradeOffers.delete(trade.receiverId);

      try {
        await tradeMsg.edit({
          embeds: [
            embed
              .setColor("#808080") // Gray color for expired
              .setTitle("🔄 Trade Offer Expired")
              .setFooter({
                text: "This trade offer has expired",
                iconURL: message.client.user.displayAvatarURL(),
              }),
          ],
          components: [],
        });
      } catch (error) {
        console.error("Error updating expired trade message:", error);
      }
    }
  });
}

// Format offer details for display
function formatOfferDetails(offer) {
  if (offer.type === "money") {
    return `💰 **${formatNumber(offer.amount)} atlyss coins**`;
  }

  let emoji = "📦";
  if (offer.type === "dino") emoji = "🦖";
  else if (offer.type === "animal") emoji = "🐾";

  let details = `${emoji} **${offer.amount}x ${offer.item}**`;

  // Add extra details if available
  if (offer.data) {
    if (offer.data.rarity) {
      details += `\n${RARITY_EMOJIS[offer.data.rarity]} ${
        offer.data.rarity.charAt(0).toUpperCase() + offer.data.rarity.slice(1)
      }`;
    }

    if (offer.data.value) {
      details += `\nValue: ${formatNumber(offer.data.value)} coins each`;
    }

    if (offer.data.damage) {
      details += `\nDamage: ${offer.data.damage}`;
    }

    if (offer.data.armor) {
      details += `\nArmor: ${offer.data.armor}`;
    }
  }

  return details;
}

// Process the trade (accept or decline)
async function processTrade(interaction, trade, accepted) {
  // Clean up active trades
  activeTradeOffers.delete(trade.senderId);
  activeTradeOffers.delete(trade.receiverId);

  // Handle decline
  if (!accepted) {
    const declineEmbed = new EmbedBuilder()
      .setColor("#e74c3c") // Red for declined
      .setTitle("🔄 Trade Declined")
      .setDescription(
        `${trade.receiverName} declined the trade offer from ${trade.senderName}.`
      )
      .setFooter({
        text: "The trade was not completed",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return interaction.update({
      embeds: [declineEmbed],
      components: [],
    });
  }

  // Handle accept - actually transfer items
  try {
    // Perform the exchange
    const success = await executeTradeExchange(trade);

    if (!success) {
      // Something went wrong during the exchange
      const errorEmbed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("🔄 Trade Failed")
        .setDescription(
          "The trade couldn't be completed. One of the traders may no longer have the offered items."
        )
        .setFooter({
          text: "Trade transaction failed",
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return interaction.update({
        embeds: [errorEmbed],
        components: [],
      });
    }

    // Trade successful!
    const successEmbed = new EmbedBuilder()
      .setColor("#2ecc71") // Green for success
      .setTitle("🔄 Trade Completed!")
      .setDescription(
        `${trade.senderName} and ${trade.receiverName} have successfully traded!`
      )
      .addFields(
        {
          name: `${trade.senderName} received:`,
          value: formatOfferDetails(trade.receiverOffer),
          inline: true,
        },
        {
          name: `${trade.receiverName} received:`,
          value: formatOfferDetails(trade.senderOffer),
          inline: true,
        }
      )
      .setFooter({
        text: "Trade completed successfully",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return interaction.update({
      embeds: [successEmbed],
      components: [],
    });
  } catch (error) {
    console.error("Trade execution error:", error);

    const errorEmbed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("🔄 Trade Error")
      .setDescription(
        "An error occurred while processing the trade. Your items have not been exchanged."
      )
      .setFooter({
        text: "Please try again later",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return interaction.update({
      embeds: [errorEmbed],
      components: [],
    });
  }
}

// Execute the actual trade exchange
async function executeTradeExchange(trade) {
  // Handle money trades first
  if (trade.senderOffer.type === "money") {
    // Verify sender still has the money
    const senderBalance = (await db.get(`cash_${trade.senderId}`)) || 0;
    if (senderBalance < trade.senderOffer.amount) {
      return false;
    }

    // Transfer money from sender to receiver
    await db.add(`cash_${trade.senderId}`, -trade.senderOffer.amount);
    await db.add(`cash_${trade.receiverId}`, trade.senderOffer.amount);
  }

  if (trade.receiverOffer.type === "money") {
    // Verify receiver still has the money
    const receiverBalance = (await db.get(`cash_${trade.receiverId}`)) || 0;
    if (receiverBalance < trade.receiverOffer.amount) {
      return false;
    }

    // Transfer money from receiver to sender
    await db.add(`cash_${trade.receiverId}`, -trade.receiverOffer.amount);
    await db.add(`cash_${trade.senderId}`, trade.receiverOffer.amount);
  }

  // Handle sender's item (if not money)
  if (trade.senderOffer.type !== "money") {
    // Get the collection keys
    const senderCollectionKey = getCollectionKey(
      trade.senderId,
      trade.senderOffer.type
    );
    const receiverCollectionKey = getCollectionKey(
      trade.receiverId,
      trade.senderOffer.type
    );

    // Get current collections
    const senderCollection = (await db.get(senderCollectionKey)) || {};
    const receiverCollection = (await db.get(receiverCollectionKey)) || {};

    // Find the item in sender's collection
    const senderItem = findItem(senderCollection, trade.senderOffer.item);
    if (!senderItem || senderItem.data.count < trade.senderOffer.amount) {
      return false; // Sender no longer has the item
    }

    // Remove from sender
    if (senderItem.data.count <= trade.senderOffer.amount) {
      delete senderCollection[senderItem.name];
    } else {
      senderCollection[senderItem.name].count -= trade.senderOffer.amount;
    }

    // Add to receiver
    if (receiverCollection[senderItem.name]) {
      receiverCollection[senderItem.name].count += trade.senderOffer.amount;
    } else {
      receiverCollection[senderItem.name] = { ...senderItem.data };
      receiverCollection[senderItem.name].count = trade.senderOffer.amount;
    }

    // Save collections
    await db.set(senderCollectionKey, senderCollection);
    await db.set(receiverCollectionKey, receiverCollection);
  }

  // Handle receiver's item (if not money)
  if (trade.receiverOffer.type !== "money") {
    // Get the collection keys
    const receiverCollectionKey = getCollectionKey(
      trade.receiverId,
      trade.receiverOffer.type
    );
    const senderCollectionKey = getCollectionKey(
      trade.senderId,
      trade.receiverOffer.type
    );

    // Get current collections
    const receiverCollection = (await db.get(receiverCollectionKey)) || {};
    const senderCollection = (await db.get(senderCollectionKey)) || {};

    // Find the item in receiver's collection
    const receiverItem = findItem(receiverCollection, trade.receiverOffer.item);
    if (!receiverItem || receiverItem.data.count < trade.receiverOffer.amount) {
      return false; // Receiver no longer has the item
    }

    // Remove from receiver
    if (receiverItem.data.count <= trade.receiverOffer.amount) {
      delete receiverCollection[receiverItem.name];
    } else {
      receiverCollection[receiverItem.name].count -= trade.receiverOffer.amount;
    }

    // Add to sender
    if (senderCollection[receiverItem.name]) {
      senderCollection[receiverItem.name].count += trade.receiverOffer.amount;
    } else {
      senderCollection[receiverItem.name] = { ...receiverItem.data };
      senderCollection[receiverItem.name].count = trade.receiverOffer.amount;
    }

    // Save collections
    await db.set(receiverCollectionKey, receiverCollection);
    await db.set(senderCollectionKey, senderCollection);
  }

  return true;
}

// Get collection key based on user ID and type
function getCollectionKey(userId, type) {
  switch (type) {
    case "dino":
      return `dinos_${userId}`;
    case "animal":
      return `animals_${userId}`;
    case "item":
      return `inventory_${userId}`;
    default:
      return null;
  }
}
