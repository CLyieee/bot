// filepath: c:\bot\commands\roulette.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Roulette wheel
const ROULETTE_WHEEL = [
  { number: 0, color: "green" },
  { number: 32, color: "red" },
  { number: 15, color: "black" },
  { number: 19, color: "red" },
  { number: 4, color: "black" },
  { number: 21, color: "red" },
  { number: 2, color: "black" },
  { number: 25, color: "red" },
  { number: 17, color: "black" },
  { number: 34, color: "red" },
  { number: 6, color: "black" },
  { number: 27, color: "red" },
  { number: 13, color: "black" },
  { number: 36, color: "red" },
  { number: 11, color: "black" },
  { number: 30, color: "red" },
  { number: 8, color: "black" },
  { number: 23, color: "red" },
  { number: 10, color: "black" },
  { number: 5, color: "red" },
  { number: 24, color: "black" },
  { number: 16, color: "red" },
  { number: 33, color: "black" },
  { number: 1, color: "red" },
  { number: 20, color: "black" },
  { number: 14, color: "red" },
  { number: 31, color: "black" },
  { number: 9, color: "red" },
  { number: 22, color: "black" },
  { number: 18, color: "red" },
  { number: 29, color: "black" },
  { number: 7, color: "red" },
  { number: 28, color: "black" },
  { number: 12, color: "red" },
  { number: 35, color: "black" },
  { number: 3, color: "red" },
  { number: 26, color: "black" },
];

// Bet types and payouts
const BET_TYPES = {
  number: { description: "Bet on a specific number (0-36)", multiplier: 36 },
  red: { description: "Bet on red numbers", multiplier: 2 },
  black: { description: "Bet on black numbers", multiplier: 2 },
  even: { description: "Bet on even numbers", multiplier: 2 },
  odd: { description: "Bet on odd numbers", multiplier: 2 },
  "1to18": { description: "Bet on numbers 1-18", multiplier: 2 },
  "19to36": { description: "Bet on numbers 19-36", multiplier: 2 },
};

const DEFAULT_BET = 50;
const MAX_BET = 10000;

// Roulette wheel GIF
// const ROULETTE_GIF = "https://i.imgur.com/uT2yN4n.gif";

module.exports = {
  name: "roulette",
  description: "Play roulette with your atlyss coins",
  usage:
    "!roulette [amount] [bet type] [optional: specific number for 'number' bet]",
  aliases: ["roul"],
  cooldown: 5000, // 5 seconds cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user has provided enough arguments
    if (args.length < 2) {
      // Show help message
      const helpEmbed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("🎮 Roulette Help")
        .setDescription("Place your bets on the roulette wheel!")
        .addFields(
          {
            name: "Usage",
            value:
              "`!roulette [amount] [bet type] [optional: specific number]`",
          },
          {
            name: "Bet Types",
            value: Object.entries(BET_TYPES)
              .map(
                ([type, info]) =>
                  `**${type}** - ${info.description} (${info.multiplier}x)`
              )
              .join("\n"),
          },
          {
            name: "Examples",
            value:
              "`!roulette 100 red` - Bet 100 on red\n" +
              "`!roulette 200 number 7` - Bet 200 on number 7\n" +
              "`!roulette all even` - Bet all your coins on even numbers",
          }
        )
        .setFooter({ text: "Good luck!" });

      return message.channel.send({ embeds: [helpEmbed] });
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

    // Check user balance
    const balance = (await db.get(`cash_${userId}`)) || 0;
    if (balance < betAmount) {
      return message.reply(
        `You don't have enough atlyss coins! You need ${formatNumber(
          betAmount
        )} coins, but you only have ${formatNumber(balance)}.`
      );
    }

    // Parse bet type
    const betType = args[1].toLowerCase();
    if (!Object.keys(BET_TYPES).includes(betType)) {
      return message.reply(
        `Invalid bet type. Valid bet types are: ${Object.keys(BET_TYPES).join(
          ", "
        )}`
      );
    }

    // For number bets, check if a valid number is provided
    let betNumber = null;
    if (betType === "number") {
      if (args.length < 3) {
        return message.reply(
          "For number bets, you must specify which number (0-36) you want to bet on."
        );
      }

      betNumber = parseInt(args[2]);
      if (isNaN(betNumber) || betNumber < 0 || betNumber > 36) {
        return message.reply(
          "Invalid number. Please choose a number between 0 and 36."
        );
      }
    }

    // Deduct bet amount
    await db.subtract(`cash_${userId}`, betAmount);

    // Create initial embed for the roulette wheel
    const spinningEmbed = new EmbedBuilder()
      .setColor("#e67e22")
      .setTitle("🎰 Roulette Wheel Spinning")
      .setDescription(
        `**${displayName}** bets **${formatNumber(
          betAmount
        )}** atlyss coins on **${betType}**${
          betType === "number" ? ` ${betNumber}` : ""
        }`
      )
      .addFields({
        name: "Spinning...",
        value: "The ball is spinning around the wheel!",
      })

      .setFooter({
        text: `Your balance: ${formatNumber(balance - betAmount)} atlyss coins`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    const spinMsg = await message.channel.send({ embeds: [spinningEmbed] });

    // Spin the wheel (with a delay for suspense)
    setTimeout(async () => {
      // Randomly select a position on the wheel
      const result =
        ROULETTE_WHEEL[Math.floor(Math.random() * ROULETTE_WHEEL.length)];

      // Determine if the player won
      let isWinner = false;
      if (betType === "number" && result.number === betNumber) {
        isWinner = true;
      } else if (betType === "red" && result.color === "red") {
        isWinner = true;
      } else if (betType === "black" && result.color === "black") {
        isWinner = true;
      } else if (
        betType === "even" &&
        result.number !== 0 &&
        result.number % 2 === 0
      ) {
        isWinner = true;
      } else if (
        betType === "odd" &&
        result.number !== 0 &&
        result.number % 2 === 1
      ) {
        isWinner = true;
      } else if (
        betType === "1to18" &&
        result.number >= 1 &&
        result.number <= 18
      ) {
        isWinner = true;
      } else if (
        betType === "19to36" &&
        result.number >= 19 &&
        result.number <= 36
      ) {
        isWinner = true;
      }

      // Calculate winnings
      const winMultiplier = BET_TYPES[betType].multiplier;
      const winnings = isWinner ? Math.round(betAmount * winMultiplier) : 0;

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

      // Update roulette stats
      const roulettePlayed = (await db.get(`roulette_played_${userId}`)) || 0;
      await db.set(`roulette_played_${userId}`, roulettePlayed + 1);

      if (isWinner) {
        const rouletteWon = (await db.get(`roulette_won_${userId}`)) || 0;
        await db.set(`roulette_won_${userId}`, rouletteWon + 1);
      }

      // Get new balance
      const newBalance = (await db.get(`cash_${userId}`)) || 0;

      // Determine the result color for styling
      const resultColor =
        result.color === "red"
          ? "#e74c3c"
          : result.color === "black"
          ? "#2c3e50"
          : "#2ecc71";

      // Build the result message
      const resultEmbed = new EmbedBuilder()
        .setColor(isWinner ? "#00cc00" : "#ff3333")
        .setTitle(
          `🎰 Roulette Result: ${result.number} ${result.color.toUpperCase()}`
        )
        .setDescription(
          `**${displayName}** bet **${formatNumber(
            betAmount
          )}** atlyss coins on **${betType}**${
            betType === "number" ? ` ${betNumber}` : ""
          }`
        )
        .addFields(
          {
            name: "The Ball Landed On",
            value: `**${result.number}** (${result.color})`,
            inline: true,
          },
          {
            name: isWinner ? "You Won! 🎉" : "You Lost! 💔",
            value: isWinner
              ? `You won **${formatNumber(
                  winnings
                )}** atlyss coins! (${winMultiplier}x)`
              : "Better luck next time!",
            inline: true,
          },
          {
            name: "Net Change",
            value: isWinner
              ? `+${formatNumber(winnings - betAmount)} coins`
              : `-${formatNumber(betAmount)} coins`,
          }
        )

        .setFooter({
          text: `Your new balance: ${formatNumber(
            newBalance
          )} atlyss coins | Games played: ${roulettePlayed + 1}`,
          iconURL: message.client.user.displayAvatarURL(),
        });

      // Update the message with the result
      spinMsg.edit({ embeds: [resultEmbed] });
    }, 3500); // 3.5 seconds for the wheel animation
  },
};
