// filepath: c:\bot\commands\trade.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
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

// Trade value threshold (minimum acceptable value ratio in percentage)
const TRADE_THRESHOLD = 40; // 40% threshold like in Blox Fruits

// Active trades
const activeTradeOffers = new Map();
// Interactive trade sessions
const interactiveTradeSessions = new Map();

module.exports = {
  name: "trade",
  description: "Trade dinosaurs, animals, or items with other users",
  usage:
    "!trade @user - Start an interactive trade\n!trade @user [type] [item] [amount] [for] [type2] [item2] [amount2] - Quick trade",
  aliases: ["t"],
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user provided enough arguments
    if (!args.length) {
      return message.reply(
        "Please specify who you want to trade with. Usage: `!trade @user`\n" +
          "Examples:\n" +
          "`!trade @user` - Start an interactive trade session\n" +
          "`!trade @user dino Dodo 2 for dino Rex 1` - Quick trade 2 Dodos for 1 Rex"
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

    // Check if user or target already has an active trade
    if (activeTradeOffers.has(userId) || activeTradeOffers.has(target.id)) {
      return message.reply(
        "Either you or the target user already has an active trade. Finish or cancel that trade first."
      );
    }

    // Remove mention from args
    args.shift();

    // If no more args, start interactive trade
    if (args.length === 0) {
      // Start interactive trade
      startInteractiveTrade(message, userId, target.id);
      return;
    }

    // Legacy quick trade system with args
    if (args.length < 5) {
      return message.reply(
        "Please provide what you want to trade. Format: `!trade @user [type] [item] [amount] for [type2] [item2] [amount2]`"
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

// Start an interactive trade session
async function startInteractiveTrade(message, senderId, receiverId) {
  const senderName = getDisplayName(message.guild.members.cache.get(senderId));
  const receiverName = getDisplayName(
    message.guild.members.cache.get(receiverId)
  );

  // Create a trade session
  const sessionId = `${senderId}-${receiverId}-${Date.now()}`;

  const tradeSession = {
    id: sessionId,
    senderId,
    senderName,
    receiverId,
    receiverName,
    senderOffer: {
      items: [],
      totalValue: 0,
    },
    receiverOffer: {
      items: [],
      totalValue: 0,
    },
    senderReady: false,
    receiverReady: false,
    message: null,
  };

  // Store the session
  interactiveTradeSessions.set(sessionId, tradeSession);
  activeTradeOffers.set(senderId, sessionId);
  activeTradeOffers.set(receiverId, sessionId);

  // Create and send the interactive trade interface
  const embed = createTradeEmbed(tradeSession);

  // Create buttons for the trade interface
  const addItemsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`add_dino_${sessionId}_sender`)
      .setLabel("Add Dinosaur")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🦖"),
    new ButtonBuilder()
      .setCustomId(`add_item_${sessionId}_sender`)
      .setLabel("Add Item")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📦"),
    new ButtonBuilder()
      .setCustomId(`add_money_${sessionId}_sender`)
      .setLabel("Add Money")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰")
  );

  const receiverItemsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`add_dino_${sessionId}_receiver`)
      .setLabel("Add Dinosaur")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🦖"),
    new ButtonBuilder()
      .setCustomId(`add_item_${sessionId}_receiver`)
      .setLabel("Add Item")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📦"),
    new ButtonBuilder()
      .setCustomId(`add_money_${sessionId}_receiver`)
      .setLabel("Add Money")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰")
  );

  const controlsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ready_${sessionId}_sender`)
      .setLabel(`${senderName} Ready`)
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`ready_${sessionId}_receiver`)
      .setLabel(`${receiverName} Ready`)
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`cancel_${sessionId}`)
      .setLabel("Cancel Trade")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );

  // Send the trade message
  const tradeMsg = await message.channel.send({
    content: `<@${senderId}> and <@${receiverId}>, your trading session has started!`,
    embeds: [embed],
    components: [addItemsRow, receiverItemsRow, controlsRow],
  });

  // Store the message reference
  tradeSession.message = tradeMsg;

  // Set up the button collector
  const collector = tradeMsg.createMessageComponentCollector({
    filter: (i) => i.customId.includes(sessionId),
    time: 300000, // 5 minutes timeout
  });

  collector.on("collect", async (interaction) => {
    // Check if user is part of this trade
    if (
      interaction.user.id !== senderId &&
      interaction.user.id !== receiverId
    ) {
      await interaction.reply({
        content: "You're not part of this trade!",
        ephemeral: true,
      });
      return;
    }

    // Get the current session state
    const session = interactiveTradeSessions.get(sessionId);
    if (!session) {
      collector.stop();
      return;
    }

    const [action, type, id, role] = interaction.customId.split("_");

    // Handle different button actions
    switch (action) {
      case "add":
        await handleAddItem(
          interaction,
          session,
          type,
          role === "sender" ? senderId : receiverId
        );
        break;
      case "remove":
        await handleRemoveItem(interaction, session, type, interaction.user.id);
        break;
      case "ready":
        await handleReadyState(interaction, session, role);
        break;
      case "cancel":
        await handleCancelTrade(interaction, session);
        collector.stop("cancelled");
        break;
    }
  });

  // Handle trade expiration
  collector.on("end", async (_, reason) => {
    if (reason !== "completed" && reason !== "cancelled") {
      // Clean up expired trade
      if (interactiveTradeSessions.has(sessionId)) {
        const session = interactiveTradeSessions.get(sessionId);
        activeTradeOffers.delete(session.senderId);
        activeTradeOffers.delete(session.receiverId);
        interactiveTradeSessions.delete(sessionId);

        // Update the message with expired status
        try {
          const expiredEmbed = new EmbedBuilder()
            .setColor("#808080")
            .setTitle("🔄 Trade Session Expired")
            .setDescription(
              `The trade session between ${session.senderName} and ${session.receiverName} has expired.`
            )
            .setFooter({
              text: "This trade session has timed out",
              iconURL: tradeMsg.client.user.displayAvatarURL(),
            })
            .setTimestamp();

          await tradeMsg.edit({
            embeds: [expiredEmbed],
            components: [],
          });
        } catch (error) {
          console.error("Error updating expired trade message:", error);
        }
      }
    }
  });
}

// Create trade embed for interactive trading
function createTradeEmbed(session) {
  // Calculate total values
  const senderTotalValue = calculateTotalValue(session.senderOffer.items);
  const receiverTotalValue = calculateTotalValue(session.receiverOffer.items);

  // Calculate value ratio for threshold check
  const valueRatio = calculateValueRatio(senderTotalValue, receiverTotalValue);
  const thresholdMet = valueRatio >= TRADE_THRESHOLD;

  // Create main embed
  const embed = new EmbedBuilder()
    .setColor(thresholdMet ? "#2ecc71" : "#e74c3c")
    .setTitle("🔄 Interactive Trade Session")
    .setDescription(
      `Trade between ${session.senderName} and ${session.receiverName}`
    )
    .addFields(
      {
        name: `${session.senderName}'s Offer ${
          session.senderReady ? "✅" : ""
        }`,
        value:
          formatTradeItems(session.senderOffer.items) || "No items offered yet",
        inline: true,
      },
      {
        name: `${session.receiverName}'s Offer ${
          session.receiverReady ? "✅" : ""
        }`,
        value:
          formatTradeItems(session.receiverOffer.items) ||
          "No items offered yet",
        inline: true,
      }
    )
    .setFooter({
      text: `Trade threshold: ${
        thresholdMet ? "✅ Met" : "❌ Not met"
      } (${Math.round(valueRatio)}% / ${TRADE_THRESHOLD}% required)`,
      iconURL: "https://www.dododex.com/media/item/Trade.png",
    })
    .setTimestamp();

  return embed;
}

// Handle adding items to the trade
async function handleAddItem(interaction, session, itemType, userId) {
  const isUserSender = userId === session.senderId;
  const role = isUserSender ? "sender" : "receiver";

  // Different handling based on item type
  switch (itemType) {
    case "dino":
      await handleAddDinosaur(interaction, session, role, userId);
      break;
    case "item":
      await handleAddInventoryItem(interaction, session, role, userId);
      break;
    case "money":
      await handleAddMoney(interaction, session, role, userId);
      break;
  }
}

// Handle adding a dinosaur to the trade
async function handleAddDinosaur(interaction, session, role, userId) {
  // Fetch user's dinosaurs
  const userDinos = (await db.get(`dinos_${userId}`)) || {};

  if (Object.keys(userDinos).length === 0) {
    await interaction.reply({
      content: "You don't have any dinosaurs to trade!",
      ephemeral: true,
    });
    return;
  }

  // Create select menu options for dinosaurs (up to 25 due to Discord limits)
  const dinoOptions = Object.entries(userDinos)
    .slice(0, 25)
    .map(([name, data]) => {
      const rarity = data.rarity || "common";
      const value = data.value || 0;
      const emoji = RARITY_EMOJIS[rarity] || "🦖";

      return {
        label: `${name} (${data.count || 1}x)`,
        description: `${
          rarity.charAt(0).toUpperCase() + rarity.slice(1)
        } - Value: ${formatNumber(value)} coins`,
        value: `dino_${name}_${session.id}_${role}`,
        emoji: emoji,
      };
    });

  // Create select menu
  const selectMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_dino_${session.id}_${role}`)
      .setPlaceholder("Select a dinosaur to add to the trade")
      .addOptions(dinoOptions)
  );

  // Create quantity buttons (only shown after selection)
  const quantityButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`qty_1_${session.id}_${role}`)
      .setLabel("1")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`qty_5_${session.id}_${role}`)
      .setLabel("5")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`qty_10_${session.id}_${role}`)
      .setLabel("10")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`qty_all_${session.id}_${role}`)
      .setLabel("All")
      .setStyle(ButtonStyle.Secondary)
  );

  // Show selection menu
  await interaction.reply({
    content: "Select a dinosaur to add to the trade:",
    components: [selectMenu],
    ephemeral: true,
  });

  // Collect the selection
  try {
    const selectInteraction = await interaction.channel.awaitMessageComponent({
      filter: (i) =>
        i.customId.includes(session.id) &&
        i.customId.includes(role) &&
        i.user.id === userId,
      time: 30000,
    });

    // Parse the selection - Use unique variable name instead of "ignored"
    const [typePrefix, selectType, dinoName, sessionId, userRole] =
      selectInteraction.values[0].split("_");

    // Show quantity options
    await selectInteraction.update({
      content: `Selected ${dinoName}. Now choose quantity:`,
      components: [quantityButtons],
      ephemeral: true,
    });

    // Collect quantity selection
    const qtyInteraction = await interaction.channel.awaitMessageComponent({
      filter: (i) =>
        i.customId.startsWith("qty_") &&
        i.customId.includes(session.id) &&
        i.customId.includes(role) &&
        i.user.id === userId,
      time: 30000,
    });

    // Get the quantity - Use unique variable name instead of "ignored"
    const [qtyPrefix, qtyStr] = qtyInteraction.customId.split("_");
    const userDino = userDinos[dinoName];

    // Calculate actual quantity (respecting available amount)
    const availableQty = userDino.count || 1;
    let quantity = 1;

    if (qtyStr === "all") {
      quantity = availableQty;
    } else {
      quantity = Math.min(parseInt(qtyStr), availableQty);
    }

    // Add dino to the trade
    const offerItem = {
      type: "dino",
      name: dinoName,
      amount: quantity,
      value: (userDino.value || 10) * quantity,
      data: { ...userDino, count: quantity },
    };

    // Update the session with the new item
    if (role === "sender") {
      session.senderOffer.items.push(offerItem);
      session.senderReady = false; // Reset ready state when adding items
    } else {
      session.receiverOffer.items.push(offerItem);
      session.receiverReady = false; // Reset ready state when adding items
    }

    // Update trade message
    await updateTradeMessage(session);

    // Acknowledge the addition
    await qtyInteraction.update({
      content: `Added ${quantity}x ${dinoName} to the trade.`,
      components: [],
      ephemeral: true,
    });
  } catch (error) {
    // Handle timeout or error
    if (error.name === "Error" && error.message.includes("time")) {
      await interaction.editReply({
        content: "Selection timed out. Please try again.",
        components: [],
        ephemeral: true,
      });
    } else {
      console.error("Error in dino selection:", error);
      await interaction.editReply({
        content: "There was an error processing your selection.",
        components: [],
        ephemeral: true,
      });
    }
  }
}

// Handle adding inventory items to the trade
async function handleAddInventoryItem(interaction, session, role, userId) {
  // Fetch user's inventory
  const userItems = (await db.get(`inventory_${userId}`)) || {};

  if (Object.keys(userItems).length === 0) {
    await interaction.reply({
      content: "You don't have any items to trade!",
      ephemeral: true,
    });
    return;
  }

  // Create select menu options for items
  const itemOptions = Object.entries(userItems)
    .slice(0, 25)
    .map(([name, data]) => {
      const rarity = data.rarity || "common";
      const value = data.value || 0;
      const emoji = data.emoji || "📦";

      return {
        label: `${name} (${data.count || 1}x)`,
        description: `Value: ${formatNumber(value)} coins`,
        value: `item_${name}_${session.id}_${role}`,
        emoji: emoji,
      };
    });

  // Create select menu
  const selectMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_item_${session.id}_${role}`)
      .setPlaceholder("Select an item to add to the trade")
      .addOptions(itemOptions)
  );

  // Create quantity buttons
  const quantityButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`qty_1_${session.id}_${role}`)
      .setLabel("1")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`qty_5_${session.id}_${role}`)
      .setLabel("5")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`qty_10_${session.id}_${role}`)
      .setLabel("10")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`qty_all_${session.id}_${role}`)
      .setLabel("All")
      .setStyle(ButtonStyle.Secondary)
  );

  // Show selection menu
  await interaction.reply({
    content: "Select an item to add to the trade:",
    components: [selectMenu],
    ephemeral: true,
  });

  // Rest of the item selection logic similar to dinosaur selection
  try {
    const selectInteraction = await interaction.channel.awaitMessageComponent({
      filter: (i) =>
        i.customId.includes(session.id) &&
        i.customId.includes(role) &&
        i.user.id === userId,
      time: 30000,
    });

    // Parse the selection - Fix: replace _ with ignored
    const [typePrefix, selectType, itemName, sessionId, userRole] =
      selectInteraction.values[0].split("_");

    // Show quantity options
    await selectInteraction.update({
      content: `Selected ${itemName}. Now choose quantity:`,
      components: [quantityButtons],
      ephemeral: true,
    });

    // Collect quantity selection
    const qtyInteraction = await interaction.channel.awaitMessageComponent({
      filter: (i) =>
        i.customId.startsWith("qty_") &&
        i.customId.includes(session.id) &&
        i.customId.includes(role) &&
        i.user.id === userId,
      time: 30000,
    });

    // Get the quantity - Fix: replace _ with ignored
    const [qtyPrefix, qtyStr] = qtyInteraction.customId.split("_");
    const userItem = userItems[itemName];

    // Calculate actual quantity
    const availableQty = userItem.count || 1;
    let quantity = 1;

    if (qtyStr === "all") {
      quantity = availableQty;
    } else {
      quantity = Math.min(parseInt(qtyStr), availableQty);
    }

    // Add item to the trade
    const offerItem = {
      type: "item",
      name: itemName,
      amount: quantity,
      value: (userItem.value || 5) * quantity,
      data: { ...userItem, count: quantity },
    };

    // Update the session
    if (role === "sender") {
      session.senderOffer.items.push(offerItem);
      session.senderReady = false;
    } else {
      session.receiverOffer.items.push(offerItem);
      session.receiverReady = false;
    }

    // Update trade message
    await updateTradeMessage(session);

    // Acknowledge
    await qtyInteraction.update({
      content: `Added ${quantity}x ${itemName} to the trade.`,
      components: [],
      ephemeral: true,
    });
  } catch (error) {
    // Handle timeout or error
    if (error.name === "Error" && error.message.includes("time")) {
      await interaction.editReply({
        content: "Selection timed out. Please try again.",
        components: [],
        ephemeral: true,
      });
    } else {
      console.error("Error in item selection:", error);
      await interaction.editReply({
        content: "There was an error processing your selection.",
        components: [],
        ephemeral: true,
      });
    }
  }
}

// Handle adding money to the trade
async function handleAddMoney(interaction, session, role, userId) {
  // Get user's balance
  const userBalance = (await db.get(`cash_${userId}`)) || 0;

  if (userBalance <= 0) {
    await interaction.reply({
      content: "You don't have any money to trade!",
      ephemeral: true,
    });
    return;
  }

  // Show options for common amounts
  const moneyButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`money_1000_${session.id}_${role}`)
      .setLabel("1,000")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`money_5000_${session.id}_${role}`)
      .setLabel("5,000")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`money_10000_${session.id}_${role}`)
      .setLabel("10,000")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`money_custom_${session.id}_${role}`)
      .setLabel("Custom Amount")
      .setStyle(ButtonStyle.Primary)
  );

  // Show money options
  await interaction.reply({
    content: `You have ${formatNumber(
      userBalance
    )} coins. Choose an amount to add:`,
    components: [moneyButtons],
    ephemeral: true,
  });

  try {
    const moneyInteraction = await interaction.channel.awaitMessageComponent({
      filter: (i) =>
        i.customId.startsWith("money_") &&
        i.customId.includes(session.id) &&
        i.customId.includes(role) &&
        i.user.id === userId,
      time: 30000,
    });

    // Fix: replace _ with ignored
    const [moneyPrefix, amountStr, sessionId, userRole] =
      moneyInteraction.customId.split("_");

    let amount = 0;

    if (amountStr === "custom") {
      // Handle custom amount
      await moneyInteraction.update({
        content:
          "Please enter the amount you want to trade (type a number in the chat):",
        components: [],
        ephemeral: true,
      });

      // Wait for a text response
      const messageFilter = (m) => m.author.id === userId;
      const collected = await interaction.channel.awaitMessages({
        filter: messageFilter,
        max: 1,
        time: 30000,
        errors: ["time"],
      });

      const enteredAmount = parseInt(collected.first().content);

      if (isNaN(enteredAmount) || enteredAmount <= 0) {
        await interaction.followUp({
          content: "Invalid amount. Please try again.",
          ephemeral: true,
        });
        // Delete user's message to keep chat clean
        try {
          await collected.first().delete();
        } catch (e) {}
        return;
      }

      amount = Math.min(enteredAmount, userBalance);

      // Delete user's message to keep chat clean
      try {
        await collected.first().delete();
      } catch (e) {}
    } else {
      // Use predefined amount
      amount = Math.min(parseInt(amountStr), userBalance);
    }

    // Add money to the trade
    const offerItem = {
      type: "money",
      name: "atlyss coins",
      amount: amount,
      value: amount,
      data: { emoji: "💰" },
    };

    // Update the session
    if (role === "sender") {
      session.senderOffer.items.push(offerItem);
      session.senderReady = false;
    } else {
      session.receiverOffer.items.push(offerItem);
      session.receiverReady = false;
    }

    // Update trade message
    await updateTradeMessage(session);

    // Acknowledge
    if (amountStr === "custom") {
      await interaction.followUp({
        content: `Added ${formatNumber(amount)} coins to the trade.`,
        ephemeral: true,
      });
    } else {
      await moneyInteraction.update({
        content: `Added ${formatNumber(amount)} coins to the trade.`,
        components: [],
        ephemeral: true,
      });
    }
  } catch (error) {
    // Handle timeout or error
    if (error.name === "Error" && error.message.includes("time")) {
      await interaction.editReply({
        content: "Selection timed out. Please try again.",
        components: [],
        ephemeral: true,
      });
    } else {
      console.error("Error in money selection:", error);
      await interaction.editReply({
        content: "There was an error processing your selection.",
        components: [],
        ephemeral: true,
      });
    }
  }
}

// Handle removing items from trade
async function handleRemoveItem(interaction, session, itemIndex, userId) {
  const isUserSender = userId === session.senderId;
  const userItems = isUserSender
    ? session.senderOffer.items
    : session.receiverOffer.items;

  if (itemIndex < 0 || itemIndex >= userItems.length) {
    await interaction.reply({
      content: "Invalid item to remove.",
      ephemeral: true,
    });
    return;
  }

  // Remove the item
  const removedItem = userItems.splice(itemIndex, 1)[0];

  // Reset ready state when removing items
  if (isUserSender) {
    session.senderReady = false;
  } else {
    session.receiverReady = false;
  }

  // Update trade message
  await updateTradeMessage(session);

  // Acknowledge
  await interaction.reply({
    content: `Removed ${removedItem.amount}x ${removedItem.name} from your offer.`,
    ephemeral: true,
  });
}

// Handle ready state for a user
async function handleReadyState(interaction, session, role) {
  const isUserSender = interaction.user.id === session.senderId;
  const isUserReceiver = interaction.user.id === session.receiverId;

  // Ensure user is in the correct role
  if (
    (role === "sender" && !isUserSender) ||
    (role === "receiver" && !isUserReceiver)
  ) {
    await interaction.reply({
      content: "You can only toggle your own ready status.",
      ephemeral: true,
    });
    return;
  }

  // Toggle ready state
  if (role === "sender") {
    session.senderReady = !session.senderReady;
  } else {
    session.receiverReady = !session.receiverReady;
  }

  // Update trade message
  await updateTradeMessage(session);

  // Check if both are ready
  if (session.senderReady && session.receiverReady) {
    // Calculate values to check threshold
    const senderTotalValue = calculateTotalValue(session.senderOffer.items);
    const receiverTotalValue = calculateTotalValue(session.receiverOffer.items);
    const valueRatio = calculateValueRatio(
      senderTotalValue,
      receiverTotalValue
    );

    // Check if threshold is met
    if (valueRatio >= TRADE_THRESHOLD) {
      // Execute the trade
      await executeInteractiveTrade(interaction, session);
    } else {
      // Alert about threshold not being met
      await interaction.reply({
        content: `⚠️ This trade does not meet the fairness threshold of ${TRADE_THRESHOLD}%. Current ratio: ${Math.round(
          valueRatio
        )}%.\n\nBoth parties must adjust their offers to make the trade more balanced.`,
        ephemeral: false,
      });

      // Reset ready states
      session.senderReady = false;
      session.receiverReady = false;
      await updateTradeMessage(session);
    }
  } else {
    // Acknowledge the ready state change
    await interaction.reply({
      content: `You are now ${
        session.senderReady || session.receiverReady ? "ready" : "not ready"
      } for the trade. Waiting for the other user.`,
      ephemeral: true,
    });
  }
}

// Execute the interactive trade when both parties are ready
async function executeInteractiveTrade(interaction, session) {
  // Verify all items are still available
  try {
    // Check sender's items
    for (const item of session.senderOffer.items) {
      if (item.type === "money") {
        const balance = (await db.get(`cash_${session.senderId}`)) || 0;
        if (balance < item.amount) {
          throw new Error(`${session.senderName} no longer has enough coins.`);
        }
      } else {
        const collection = await getCollection(session.senderId, item.type);
        const foundItem = findItem(collection, item.name);
        if (!foundItem || foundItem.data.count < item.amount) {
          throw new Error(
            `${session.senderName} no longer has ${item.amount}x ${item.name}.`
          );
        }
      }
    }

    // Check receiver's items
    for (const item of session.receiverOffer.items) {
      if (item.type === "money") {
        const balance = (await db.get(`cash_${session.receiverId}`)) || 0;
        if (balance < item.amount) {
          throw new Error(
            `${session.receiverName} no longer has enough coins.`
          );
        }
      } else {
        const collection = await getCollection(session.receiverId, item.type);
        const foundItem = findItem(collection, item.name);
        if (!foundItem || foundItem.data.count < item.amount) {
          throw new Error(
            `${session.receiverName} no longer has ${item.amount}x ${item.name}.`
          );
        }
      }
    }

    // Process all transfers
    for (const item of session.senderOffer.items) {
      await transferItem(session.senderId, session.receiverId, item);
    }

    for (const item of session.receiverOffer.items) {
      await transferItem(session.receiverId, session.senderId, item);
    }

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("🔄 Trade Completed!")
      .setDescription(
        `${session.senderName} and ${session.receiverName} have successfully traded!`
      )
      .addFields(
        {
          name: `${session.senderName} received:`,
          value: formatTradeItems(session.receiverOffer.items) || "Nothing",
          inline: true,
        },
        {
          name: `${session.receiverName} received:`,
          value: formatTradeItems(session.senderOffer.items) || "Nothing",
          inline: true,
        }
      )
      .setFooter({
        text: "Trade completed successfully",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Update message
    await session.message.edit({
      embeds: [successEmbed],
      components: [],
    });

    // Cleanup
    activeTradeOffers.delete(session.senderId);
    activeTradeOffers.delete(session.receiverId);
    interactiveTradeSessions.delete(session.id);

    // Notify about success
    await interaction.reply({
      content: "✅ Trade completed successfully!",
      ephemeral: false,
    });
  } catch (error) {
    // Handle errors during trade execution
    await interaction.reply({
      content: `❌ Trade failed: ${error.message}`,
      ephemeral: false,
    });

    // Reset ready states
    session.senderReady = false;
    session.receiverReady = false;
    await updateTradeMessage(session);
  }
}

// Transfer an item from one user to another
async function transferItem(fromUserId, toUserId, item) {
  if (item.type === "money") {
    // Handle money transfer
    await db.add(`cash_${fromUserId}`, -item.amount);
    await db.add(`cash_${toUserId}`, item.amount);
  } else {
    // Handle item/dino transfer
    const fromCollectionKey = getCollectionKey(fromUserId, item.type);
    const toCollectionKey = getCollectionKey(toUserId, item.type);

    // Get collections
    const fromCollection = (await db.get(fromCollectionKey)) || {};
    const toCollection = (await db.get(toCollectionKey)) || {};

    // Find the exact item in the collection
    const sourceItem = findItem(fromCollection, item.name);
    if (!sourceItem) {
      throw new Error(`Item ${item.name} not found in collection.`);
    }

    // Remove from source user
    if (sourceItem.data.count <= item.amount) {
      delete fromCollection[sourceItem.name];
    } else {
      fromCollection[sourceItem.name].count -= item.amount;
    }

    // Add to target user
    if (toCollection[sourceItem.name]) {
      toCollection[sourceItem.name].count =
        (toCollection[sourceItem.name].count || 1) + item.amount;
    } else {
      // Clone item but with the traded amount
      toCollection[sourceItem.name] = {
        ...sourceItem.data,
        count: item.amount,
      };
    }

    // Save collections
    await db.set(fromCollectionKey, fromCollection);
    await db.set(toCollectionKey, toCollection);
  }
}

// Handle cancelling a trade
async function handleCancelTrade(interaction, session) {
  // Clean up the trade session
  activeTradeOffers.delete(session.senderId);
  activeTradeOffers.delete(session.receiverId);
  interactiveTradeSessions.delete(session.id);

  // Update the trade message with cancelled status
  const cancelEmbed = new EmbedBuilder()
    .setColor("#e74c3c")
    .setTitle("🔄 Trade Cancelled")
    .setDescription(
      `The trade between ${session.senderName} and ${session.receiverName} has been cancelled by ${interaction.user.username}.`
    )
    .setFooter({
      text: "Trade was cancelled",
      iconURL: interaction.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  await session.message.edit({
    embeds: [cancelEmbed],
    components: [],
  });

  // Acknowledge
  await interaction.reply({
    content: "You have cancelled the trade.",
    ephemeral: true,
  });
}

// Update the trade message with current state
async function updateTradeMessage(session) {
  const embed = createTradeEmbed(session);

  // Create buttons for trade actions
  const addSenderRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`add_dino_${session.id}_sender`)
      .setLabel("Add Dinosaur")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🦖")
      .setDisabled(session.senderReady),
    new ButtonBuilder()
      .setCustomId(`add_item_${session.id}_sender`)
      .setLabel("Add Item")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📦")
      .setDisabled(session.senderReady),
    new ButtonBuilder()
      .setCustomId(`add_money_${session.id}_sender`)
      .setLabel("Add Money")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰")
      .setDisabled(session.senderReady)
  );

  const addReceiverRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`add_dino_${session.id}_receiver`)
      .setLabel("Add Dinosaur")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🦖")
      .setDisabled(session.receiverReady),
    new ButtonBuilder()
      .setCustomId(`add_item_${session.id}_receiver`)
      .setLabel("Add Item")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📦")
      .setDisabled(session.receiverReady),
    new ButtonBuilder()
      .setCustomId(`add_money_${session.id}_receiver`)
      .setLabel("Add Money")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰")
      .setDisabled(session.receiverReady)
  );

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ready_${session.id}_sender`)
      .setLabel(`${session.senderName} ${session.senderReady ? "✓" : "Ready"}`)
      .setStyle(
        session.senderReady ? ButtonStyle.Success : ButtonStyle.Secondary
      ),
    new ButtonBuilder()
      .setCustomId(`ready_${session.id}_receiver`)
      .setLabel(
        `${session.receiverName} ${session.receiverReady ? "✓" : "Ready"}`
      )
      .setStyle(
        session.receiverReady ? ButtonStyle.Success : ButtonStyle.Secondary
      ),
    new ButtonBuilder()
      .setCustomId(`cancel_${session.id}`)
      .setLabel("Cancel Trade")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );

  // Update the message
  try {
    await session.message.edit({
      embeds: [embed],
      components: [addSenderRow, addReceiverRow, controlRow],
    });
  } catch (error) {
    console.error("Error updating trade message:", error);
  }
}

// Format trade items for display in embed
function formatTradeItems(items) {
  if (items.length === 0) return "Nothing";

  let result = "";

  // Group by type for cleaner display
  const groupedItems = {
    money: [],
    dino: [],
    item: [],
  };

  for (const item of items) {
    groupedItems[item.type].push(item);
  }

  // Format money
  if (groupedItems.money.length > 0) {
    const totalCoins = groupedItems.money.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    result += `💰 **${formatNumber(totalCoins)} atlyss coins**\n`;
  }

  // Format dinosaurs
  for (const dino of groupedItems.dino) {
    const emoji = dino.data?.rarity ? RARITY_EMOJIS[dino.data.rarity] : "🦖";

    result += `${emoji} **${dino.amount}x ${dino.name}**`;

    if (dino.data?.rarity) {
      result += ` (${
        dino.data.rarity.charAt(0).toUpperCase() + dino.data.rarity.slice(1)
      })`;
    }

    if (dino.data?.value) {
      result += ` - Value: ${formatNumber(dino.data.value * dino.amount)}`;
    }

    result += "\n";
  }

  // Format items
  for (const item of groupedItems.item) {
    const emoji = item.data?.emoji || "📦";

    result += `${emoji} **${item.amount}x ${item.name}**`;

    if (item.data?.value) {
      result += ` - Value: ${formatNumber(item.data.value * item.amount)}`;
    }

    result += "\n";
  }

  return result;
}

// Calculate total value of items
function calculateTotalValue(items) {
  return items.reduce((total, item) => {
    let itemValue = 0;

    if (item.type === "money") {
      itemValue = item.amount;
    } else if (item.data && item.data.value) {
      itemValue = item.data.value * item.amount;
    } else {
      // Fallback values if no value specified
      const baseValues = {
        dino: 100,
        item: 50,
      };
      itemValue = (baseValues[item.type] || 10) * item.amount;
    }

    return total + itemValue;
  }, 0);
}

// Calculate value ratio for threshold check
function calculateValueRatio(senderValue, receiverValue) {
  if (senderValue === 0 && receiverValue === 0) return 100;
  if (senderValue === 0) return 0;
  if (receiverValue === 0) return 0;

  // Calculate the lower value as a percentage of the higher value
  const lowerValue = Math.min(senderValue, receiverValue);
  const higherValue = Math.max(senderValue, receiverValue);

  return (lowerValue / higherValue) * 100;
}

// Parse the trade offer from arguments (legacy quick trade system)
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

// Send trade offer (for legacy quick trade)
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

// Format offer details for display (legacy quick trade)
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

// Process the trade (accept or decline) (legacy quick trade)
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

// Execute the actual trade exchange (legacy quick trade)
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
