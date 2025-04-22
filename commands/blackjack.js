// filepath: c:\bot\commands\blackjack.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Card constants
const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const VALUES = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

// Default bet amount
const DEFAULT_BET = 100;
const MAX_BET = 25000;

// Active games to prevent multiple games per user
const activeGames = new Map();

module.exports = {
  name: "blackjack",
  description:
    "Play blackjack against the dealer for a chance to win atlyss coins",
  usage: "!blackjack [bet amount]",
  aliases: ["bj", "21"],
  cooldown: 5000, // 5 seconds cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user already has an active game
    if (activeGames.has(userId)) {
      return message.reply(
        "You already have an active blackjack game! Please finish it before starting a new one."
      );
    }

    // Parse bet amount
    let betAmount = DEFAULT_BET;
    if (args.length > 0) {
      const inputBet = args[0].toLowerCase();
      if (inputBet === "all") {
        const balance = (await db.get(`cash_${userId}`)) || 0;
        betAmount = Math.min(balance, MAX_BET);
      } else {
        const parsedBet = parseInt(inputBet);
        if (!isNaN(parsedBet) && parsedBet > 0) {
          betAmount = Math.min(parsedBet, MAX_BET);
        }
      }
    }

    // Check user balance
    const balance = (await db.get(`cash_${userId}`)) || 0;
    if (balance < betAmount) {
      return message.reply(
        `You don't have enough atlyss coins! You need ${formatNumber(
          betAmount
        )} coins, but you only have ${formatNumber(balance)}.`
      );
    }

    // Deduct bet amount
    await db.subtract(`cash_${userId}`, betAmount);

    // Create a new blackjack game
    const game = createNewGame(userId, displayName, betAmount);
    activeGames.set(userId, game);

    // Deal initial cards
    dealInitialCards(game);

    // Calculate scores
    calculateScores(game);

    // Check for blackjack
    if (game.playerScore === 21) {
      if (game.dealerScore === 21) {
        // Both have blackjack - push
        return endGame(
          message,
          game,
          "push",
          "Both you and the dealer have blackjack! It's a push."
        );
      } else {
        // Player has blackjack - player wins 3:2
        const blackjackWinnings = Math.floor(game.betAmount * 2.5);
        game.winnings = blackjackWinnings;
        return endGame(
          message,
          game,
          "win",
          "**BLACKJACK!** You win 3:2 on your bet!"
        );
      }
    } else if (game.dealerScore === 21) {
      // Dealer has blackjack - player loses
      return endGame(
        message,
        game,
        "lose",
        "Dealer has **BLACKJACK**! You lose."
      );
    }

    // Display the initial cards
    const gameEmbed = getGameEmbed(game);

    // Create action buttons
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hit_${userId}`)
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎯"),
      new ButtonBuilder()
        .setCustomId(`stand_${userId}`)
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🛑"),
      new ButtonBuilder()
        .setCustomId(`doubleDown_${userId}`)
        .setLabel("Double Down")
        .setStyle(ButtonStyle.Success)
        .setEmoji("💰")
        .setDisabled(balance < betAmount) // Disable if user doesn't have enough to double
    );

    const gameMsg = await message.channel.send({
      embeds: [gameEmbed],
      components: [buttons],
    });

    // Set game message for later updates
    game.messageId = gameMsg.id;

    // Create collector for button interactions
    const collector = gameMsg.createMessageComponentCollector({
      time: 60000, // 60 seconds time limit
    });

    collector.on("collect", async (i) => {
      // Only allow the player to interact with their own game
      if (i.user.id !== userId) {
        return i.reply({
          content: "This blackjack game isn't yours!",
          ephemeral: true,
        });
      }

      const game = activeGames.get(userId);

      if (i.customId === `hit_${userId}`) {
        // Player chooses to hit
        await hitAction(i, game, message.channel);
      } else if (i.customId === `stand_${userId}`) {
        // Player chooses to stand
        await standAction(i, game, message.channel);
      } else if (i.customId === `doubleDown_${userId}`) {
        // Player chooses to double down
        await doubleDownAction(i, game, message.channel);
      }
    });

    // Handle game expiration
    collector.on("end", (collected, reason) => {
      if (reason === "time" && activeGames.has(userId)) {
        // Game expired - player automatically stands
        const game = activeGames.get(userId);
        if (!game.completed) {
          standAction(null, game, message.channel, true);
        }
      }
    });
  },
};

// Create a new blackjack game object
function createNewGame(userId, displayName, betAmount) {
  return {
    userId,
    displayName,
    betAmount,
    playerCards: [],
    dealerCards: [],
    playerScore: 0,
    dealerScore: 0,
    deck: createShuffledDeck(),
    doubledDown: false,
    completed: false,
    winnings: 0,
    messageId: null,
  };
}

// Create a new shuffled deck
function createShuffledDeck() {
  const deck = [];

  // Create a standard deck of 52 cards
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }

  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// Deal initial cards (2 cards each to player and dealer)
function dealInitialCards(game) {
  // Deal two cards to player
  game.playerCards.push(game.deck.pop());
  game.playerCards.push(game.deck.pop());

  // Deal two cards to dealer (one face up, one face down)
  game.dealerCards.push(game.deck.pop());
  game.dealerCards.push(game.deck.pop());
}

// Calculate scores for player and dealer
function calculateScores(game) {
  game.playerScore = calculateHandValue(game.playerCards);
  game.dealerScore = calculateHandValue(game.dealerCards);
}

// Calculate the value of a hand
function calculateHandValue(cards) {
  let sum = 0;
  let numAces = 0;

  for (const card of cards) {
    if (card.value === "A") {
      sum += 11;
      numAces++;
    } else if (["J", "Q", "K"].includes(card.value)) {
      sum += 10;
    } else {
      sum += parseInt(card.value);
    }
  }

  // Handle aces - can be 1 or 11
  while (sum > 21 && numAces > 0) {
    sum -= 10; // Change Ace from 11 to 1
    numAces--;
  }

  return sum;
}

// Format cards for display
function formatCards(cards, hideSecond = false) {
  if (hideSecond && cards.length > 1) {
    return `${formatCard(cards[0])} 🂠`;
  }

  return cards.map(formatCard).join(" ");
}

// Format individual card
function formatCard(card) {
  return `${card.suit}${card.value}`;
}

// Get game embed
function getGameEmbed(game, revealDealer = false) {
  const embed = new EmbedBuilder()
    .setColor("#007acc")
    .setTitle("🎮 Atlyss Blackjack 🎮")
    .setDescription(
      `${game.displayName} bets ${formatNumber(game.betAmount)} atlyss coins`
    );

  // If the game is completed, adjust title color based on outcome
  if (game.completed) {
    if (game.outcome === "win") {
      embed.setColor("#00cc00");
      embed.setTitle(`🎮 Blackjack - You Win! 🎮`);
    } else if (game.outcome === "lose") {
      embed.setColor("#ff3333");
      embed.setTitle(`🎮 Blackjack - You Lose 🎮`);
    } else {
      embed.setColor("#808080");
      embed.setTitle(`🎮 Blackjack - Push 🎮`);
    }
  }

  // Calculate values to display
  const dealerValue = revealDealer
    ? game.dealerScore
    : calculateHandValue([game.dealerCards[0]]);

  // Add dealer cards
  embed.addFields({
    name: `Dealer's Hand ${revealDealer ? `(${game.dealerScore})` : ""}`,
    value: formatCards(game.dealerCards, !revealDealer),
  });

  // Add player cards
  embed.addFields({
    name: `Your Hand (${game.playerScore})`,
    value: formatCards(game.playerCards),
  });

  // Add game outcome if completed
  if (game.completed) {
    let outcomeText = "";

    if (game.outcome === "win") {
      outcomeText = `You win ${formatNumber(game.winnings)} atlyss coins!`;
    } else if (game.outcome === "lose") {
      outcomeText = `You lost ${formatNumber(game.betAmount)} atlyss coins.`;
    } else {
      // push
      outcomeText = `It's a push! Your ${formatNumber(
        game.betAmount
      )} coins have been returned.`;
    }

    if (game.outcomeReason) {
      outcomeText = `${game.outcomeReason}\n${outcomeText}`;
    }

    embed.addFields({
      name: "Outcome",
      value: outcomeText,
    });
  } else {
    // Add instructions if game still active
    const instructions = game.doubledDown
      ? "*You've doubled down! One more card only.*"
      : "*Hit to draw another card, Stand to keep your current hand, or Double Down to double your bet but only draw one more card.*";

    embed.addFields({
      name: "Actions",
      value: instructions,
    });
  }

  return embed;
}

// Player chooses to hit
async function hitAction(interaction, game, channel) {
  // Deal a new card to the player
  game.playerCards.push(game.deck.pop());
  calculateScores(game);

  // Check if player busted
  if (game.playerScore > 21) {
    game.outcome = "lose";
    game.outcomeReason = "**BUST!** Your hand exceeded 21.";

    // End the game
    await endGame(channel, game, "lose", game.outcomeReason, interaction);
    return;
  }

  // Check if player hit 21
  if (game.playerScore === 21) {
    // Auto-stand when the player hits 21
    await standAction(interaction, game, channel);
    return;
  }

  // Check if player needs to auto-stand after double down
  if (game.doubledDown) {
    await standAction(interaction, game, channel);
    return;
  }

  // Update the game embed
  const updatedEmbed = getGameEmbed(game);

  // Update the buttons (disable double down after first hit)
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hit_${game.userId}`)
      .setLabel("Hit")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎯"),
    new ButtonBuilder()
      .setCustomId(`stand_${game.userId}`)
      .setLabel("Stand")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🛑"),
    new ButtonBuilder()
      .setCustomId(`doubleDown_${game.userId}`)
      .setLabel("Double Down")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰")
      .setDisabled(true) // Double down no longer available after first hit
  );

  try {
    // Update the message with new information
    if (interaction) {
      await interaction.update({
        embeds: [updatedEmbed],
        components: [buttons],
      });
    } else {
      const message = await channel.messages.fetch(game.messageId);
      await message.edit({
        embeds: [updatedEmbed],
        components: [buttons],
      });
    }
  } catch (error) {
    console.error("Error updating blackjack message:", error);
  }
}

// Player chooses to stand
async function standAction(interaction, game, channel, autoStand = false) {
  // Dealer's turn - reveal hidden card

  // Dealer draws until they have 17 or higher
  while (game.dealerScore < 17) {
    game.dealerCards.push(game.deck.pop());
    game.dealerScore = calculateHandValue(game.dealerCards);
  }

  // Determine the outcome
  let outcome, reason;

  if (game.dealerScore > 21) {
    // Dealer busts, player wins
    outcome = "win";
    reason = "**Dealer BUST!** The dealer's hand exceeded 21.";
    game.winnings = game.doubledDown ? game.betAmount * 4 : game.betAmount * 2;
  } else if (game.playerScore > game.dealerScore) {
    // Player has higher score, player wins
    outcome = "win";
    reason = "Your hand is higher than the dealer's!";
    game.winnings = game.doubledDown ? game.betAmount * 4 : game.betAmount * 2;
  } else if (game.playerScore < game.dealerScore) {
    // Dealer has higher score, player loses
    outcome = "lose";
    reason = "The dealer's hand is higher than yours.";
  } else {
    // Push - same score
    outcome = "push";
    reason = "Your hand ties with the dealer's. It's a push.";
    game.winnings = game.doubledDown ? game.betAmount * 2 : game.betAmount;
  }

  // End the game
  await endGame(channel, game, outcome, reason, interaction, autoStand);
}

// Player chooses to double down
async function doubleDownAction(interaction, game, channel) {
  // Check if the player has enough coins to double down
  const balance = (await db.get(`cash_${game.userId}`)) || 0;

  if (balance < game.betAmount) {
    await interaction.reply({
      content: `You don't have enough coins to double down! You need ${formatNumber(
        game.betAmount
      )} more coins.`,
      ephemeral: true,
    });
    return;
  }

  // Double the bet
  await db.subtract(`cash_${game.userId}`, game.betAmount);
  game.betAmount *= 2;
  game.doubledDown = true;

  // Deal one more card to player
  game.playerCards.push(game.deck.pop());
  calculateScores(game);

  // Check if player busted
  if (game.playerScore > 21) {
    game.outcome = "lose";
    game.outcomeReason = "**BUST!** Your hand exceeded 21.";

    // End the game
    await endGame(channel, game, "lose", game.outcomeReason, interaction);
    return;
  }

  // Stand automatically after doubling down
  await standAction(interaction, game, channel);
}

// End the game and update database
async function endGame(
  channel,
  game,
  outcome,
  reason,
  interaction = null,
  autoStand = false
) {
  game.completed = true;
  game.outcome = outcome;
  game.outcomeReason = reason;

  // Give rewards based on outcome
  if (outcome === "win") {
    await db.add(`cash_${game.userId}`, game.winnings);

    // Update gambling stats
    const wonAmount = (await db.get(`gambling_won_${game.userId}`)) || 0;
    await db.set(`gambling_won_${game.userId}`, wonAmount + game.winnings);
  } else if (outcome === "push") {
    // Return the original bet on push
    await db.add(`cash_${game.userId}`, game.winnings);
  }

  // Update gambling stats
  const gambledAmount = (await db.get(`gambled_${game.userId}`)) || 0;
  await db.set(
    `gambled_${game.userId}`,
    gambledAmount + (outcome === "push" ? 0 : game.betAmount)
  );

  // Update blackjack wins/losses stats
  if (outcome === "win") {
    const bjWins = (await db.get(`blackjack_wins_${game.userId}`)) || 0;
    await db.set(`blackjack_wins_${game.userId}`, bjWins + 1);
  } else if (outcome === "lose") {
    const bjLosses = (await db.get(`blackjack_losses_${game.userId}`)) || 0;
    await db.set(`blackjack_losses_${game.userId}`, bjLosses + 1);
  }

  // Remove from active games
  activeGames.delete(game.userId);

  // Create the final embed
  const finalEmbed = getGameEmbed(game, true);

  // Get current balance
  const balance = (await db.get(`cash_${game.userId}`)) || 0;
  finalEmbed.setFooter({
    text: `Your balance: ${formatNumber(balance)} atlyss coins`,
    iconURL: channel.client.user.displayAvatarURL(),
  });

  try {
    // Update the message with final state
    if (interaction) {
      await interaction.update({
        embeds: [finalEmbed],
        components: [],
      });
    } else if (!autoStand) {
      const message = await channel.messages.fetch(game.messageId);
      await message.edit({
        embeds: [finalEmbed],
        components: [],
      });
    } else {
      // For auto-stand due to timeout, send a new message
      const message = await channel.messages.fetch(game.messageId);
      await message.edit({
        embeds: [finalEmbed],
        components: [],
        content: `${game.displayName}'s blackjack game has ended due to inactivity.`,
      });
    }
  } catch (error) {
    console.error("Error updating final blackjack message:", error);
    // Try to send a new message if editing fails
    await channel.send({
      content: `${game.displayName}'s blackjack game has ended.`,
      embeds: [finalEmbed],
    });
  }
}
