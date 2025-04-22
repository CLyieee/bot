// filepath: c:\bot\commands\dice.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

const DEFAULT_BET = 50;
const MAX_BET = 10000;

// Dice game options
const BET_TYPES = {
  high: { description: "Bet the dice sum will be high (11-12)", multiplier: 3 },
  low: { description: "Bet the dice sum will be low (2-3)", multiplier: 3 },
  even: { description: "Bet the sum will be even", multiplier: 2 },
  odd: { description: "Bet the sum will be odd", multiplier: 2 },
  seven: { description: "Bet the sum will be exactly 7", multiplier: 5 },
  doubles: {
    description: "Bet both dice will show the same number",
    multiplier: 5,
  },
};

// Dice rolling GIF

// Dice face emojis
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

module.exports = {
  name: "dice",
  description: "Roll two dice and bet on the outcome",
  usage: "!dice [amount] [bet type]",
  aliases: ["roll", "diceroll"],
  cooldown: 3000, // 3 seconds
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if user has provided enough arguments
    if (args.length < 2) {
      // Show help message
      const helpEmbed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("🎲 Dice Game Help")
        .setDescription("Roll two dice and bet on the outcome!")
        .addFields(
          { name: "Usage", value: "`!dice [amount] [bet type]`" },
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
              "`!dice 100 high` - Bet 100 on high number (11-12)\n" +
              "`!dice 200 doubles` - Bet 200 on getting doubles\n" +
              "`!dice all seven` - Bet all on rolling a 7",
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

    // Deduct bet amount
    await db.subtract(`cash_${userId}`, betAmount);

    // Create initial embed for the dice roll
    const rollingEmbed = new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("🎲 Rolling the Dice 🎲")
      .setDescription(
        `**${displayName}** bets **${formatNumber(
          betAmount
        )}** atlyss coins on **${betType}**`
      )
      .addFields({ name: "Rolling...", value: "The dice are tumbling!" })

      .setFooter({
        text: `Your balance: ${formatNumber(balance - betAmount)} atlyss coins`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    const rollMsg = await message.channel.send({ embeds: [rollingEmbed] });

    // Roll the dice (with a delay for suspense)
    setTimeout(async () => {
      // Roll two dice (1-6 for each die)
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const sum = die1 + die2;

      // Determine if the player won
      let isWinner = false;
      if (betType === "high" && sum >= 11) {
        isWinner = true;
      } else if (betType === "low" && sum <= 3) {
        isWinner = true;
      } else if (betType === "even" && sum % 2 === 0) {
        isWinner = true;
      } else if (betType === "odd" && sum % 2 === 1) {
        isWinner = true;
      } else if (betType === "seven" && sum === 7) {
        isWinner = true;
      } else if (betType === "doubles" && die1 === die2) {
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

      // Update dice stats
      const dicePlayed = (await db.get(`dice_played_${userId}`)) || 0;
      await db.set(`dice_played_${userId}`, dicePlayed + 1);

      if (isWinner) {
        const diceWon = (await db.get(`dice_won_${userId}`)) || 0;
        await db.set(`dice_won_${userId}`, diceWon + 1);
      }

      // Get new balance
      const newBalance = (await db.get(`cash_${userId}`)) || 0;

      // Build the dice display
      const diceDisplay = `${DICE_FACES[die1 - 1]} ${DICE_FACES[die2 - 1]}`;

      // Create a card-style result embed
      const resultEmbed = new EmbedBuilder()
        .setColor(isWinner ? "#00cc00" : "#ff3333")
        .setTitle("🎲 Dice Roll Results 🎲")
        .setDescription(
          `**${displayName}** bet **${formatNumber(
            betAmount
          )}** atlyss coins on **${betType}**`
        )
        .addFields(
          {
            name: "Dice Roll",
            value: `${diceDisplay}\nSum: **${sum}**`,
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
          )} atlyss coins | Games played: ${dicePlayed + 1}`,
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Update the message with the result
      rollMsg.edit({ embeds: [resultEmbed] });
    }, 2500); // 2.5 seconds for the dice roll animation
  },
};
