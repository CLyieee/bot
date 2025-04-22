// filepath: c:\bot\commands\coinflip.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Coin sides
const SIDES = ["heads", "tails"];
const DEFAULT_BET = 50;
const MAX_BET = 25000;
const MULTIPLIER = 2; // Win 2x your bet

// Coin flip animations
const COIN_FLIP_GIFS = [
  "https://media.tenor.com/EnTqkIYbBDAAAAAC/coin-flip.gif",
];

module.exports = {
  name: "coinflip",
  description: "Flip a coin and bet on heads or tails",
  usage: "!coinflip [amount] [heads/tails]",
  aliases: ["cf", "flip", "coin"],
  cooldown: 3000, // 3 seconds cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    if (args.length < 2) {
      return message.reply(
        `Invalid command usage. Please specify an amount and your choice (heads/tails).\nExample: \`!coinflip 100 heads\` or \`!coinflip all tails\``
      );
    }

    // Parse bet amount
    let betAmount = DEFAULT_BET;
    const inputBet = args[0].toLowerCase();
    if (inputBet === "all") {
      const balance = (await db.get(`cash_${userId}`)) || 0;
      betAmount = Math.min(balance, MAX_BET);
    } else {
      const parsedBet = parseInt(inputBet);
      if (!isNaN(parsedBet) && parsedBet > 0) {
        betAmount = Math.min(parsedBet, MAX_BET);
      } else {
        return message.reply(
          `Invalid bet amount. Please use a number between 1 and ${formatNumber(
            MAX_BET
          )} or "all".`
        );
      }
    }

    // Parse choice (heads/tails)
    const choice = args[1].toLowerCase();
    if (!SIDES.includes(choice)) {
      return message.reply(
        "Invalid choice. Please choose either 'heads' or 'tails'."
      );
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

    // Create initial embed for the coin flip
    const flipEmbed = new EmbedBuilder()
      .setColor("#f5a742")
      .setTitle("🪙 Atlyss Coin Flip 🪙")
      .setDescription(
        `${displayName} bets ${formatNumber(
          betAmount
        )} atlyss coins on **${choice}**`
      )
      .addFields({ name: "Flipping the coin...", value: "Good luck!" })
      .setFooter({
        text: `Your balance: ${formatNumber(balance)} atlyss coins`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setImage(
        COIN_FLIP_GIFS[Math.floor(Math.random() * COIN_FLIP_GIFS.length)]
      ) // Random spinning coin GIF
      .setTimestamp();

    const flipMsg = await message.channel.send({ embeds: [flipEmbed] });

    // Deduct bet amount
    await db.subtract(`cash_${userId}`, betAmount);

    // Flip the coin (with a brief delay for suspense)
    setTimeout(async () => {
      // Generate random result
      const result = SIDES[Math.floor(Math.random() * SIDES.length)];
      const isWinner = choice === result;

      // Calculate winnings
      const winnings = isWinner ? betAmount * MULTIPLIER : 0;

      // Update database with results
      if (winnings > 0) {
        await db.add(`cash_${userId}`, winnings);

        // Update gambling stats
        const wonAmount = (await db.get(`gambling_won_${userId}`)) || 0;
        await db.set(`gambling_won_${userId}`, wonAmount + winnings);
      }

      // Update gambling stats
      const gambledAmount = (await db.get(`gambled_${userId}`)) || 0;
      await db.set(`gambled_${userId}`, gambledAmount + betAmount);

      // Update coinflip stats
      const flipsPlayed = (await db.get(`coinflips_played_${userId}`)) || 0;
      await db.set(`coinflips_played_${userId}`, flipsPlayed + 1);

      if (isWinner) {
        const flipsWon = (await db.get(`coinflips_won_${userId}`)) || 0;
        await db.set(`coinflips_won_${userId}`, flipsWon + 1);
      }

      // Get new balance
      const newBalance = (await db.get(`cash_${userId}`)) || 0;

      // Determine the emoji and color based on the result
      const resultEmoji = result === "heads" ? "🪙" : "🪙";
      const resultColor = isWinner ? "#00cc00" : "#ff3333";

      // Update the embed with results
      const resultsEmbed = new EmbedBuilder()
        .setColor(resultColor)
        .setTitle(`🪙 Coin Flip - It's ${result.toUpperCase()}! 🪙`)
        .setDescription(
          `${displayName} bet ${formatNumber(
            betAmount
          )} atlyss coins on **${choice}**`
        )
        .addFields(
          {
            name: "Result",
            value: `The coin landed on **${result.toUpperCase()}** ${resultEmoji}`,
          },
          {
            name: isWinner ? "You Won!" : "You Lost!",
            value: isWinner
              ? `You won ${formatNumber(winnings)} atlyss coins!`
              : `Better luck next time!`,
          },
          {
            name: "Net Change",
            value: isWinner
              ? `+${formatNumber(winnings - betAmount)} coins`
              : `-${formatNumber(betAmount)} coins`,
            inline: true,
          }
        )
        .setFooter({
          text: `New balance: ${formatNumber(newBalance)} atlyss coins`,
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Update the message
      flipMsg.edit({ embeds: [resultsEmbed] });
    }, 3000); // Increased to 3 seconds to allow the GIF animation to play longer
  },
};
