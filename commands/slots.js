// filepath: c:\bot\commands\slots.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Slot machine symbols and their multiplicative values
const SLOTS_SYMBOLS = [
  { emoji: "🍒", name: "Cherry", value: 2 },
  { emoji: "🍊", name: "Orange", value: 2 },
  { emoji: "🍋", name: "Lemon", value: 2 },
  { emoji: "🍉", name: "Watermelon", value: 3 },
  { emoji: "🍇", name: "Grapes", value: 3 },
  { emoji: "🔔", name: "Bell", value: 4 },
  { emoji: "💎", name: "Diamond", value: 5 },
  { emoji: "🍀", name: "Lucky Clover", value: 5 },
  { emoji: "7️⃣", name: "Seven", value: 10 },
];

// Default bet amount
const DEFAULT_BET = 50;
const MAX_BET = 10000;

module.exports = {
  name: "slots",
  description: "Play the slot machine with your atlyss coins",
  usage: "!slots [amount]",
  aliases: ["slot", "slotmachine"],
  cooldown: 3000, // 3 seconds cooldown
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

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
        } else {
          return message.reply(
            `Invalid bet amount. Please use a number between 1 and ${formatNumber(
              MAX_BET
            )} or "all".`
          );
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

    // Create initial embed for the slot machine
    const slotsEmbed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle("🎰 Atlyss Slot Machine 🎰")
      .setDescription(
        `${displayName} bets ${formatNumber(betAmount)} atlyss coins`
      )
      .addFields({ name: "Spinning...", value: "Good luck!" })
      .setFooter({
        text: `Your balance: ${formatNumber(balance)} atlyss coins`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      
      .setTimestamp();

    const slotMsg = await message.channel.send({ embeds: [slotsEmbed] });

    // Deduct bet amount
    await db.subtract(`cash_${userId}`, betAmount);

    // Spin the slots (with a brief delay for suspense)
    setTimeout(async () => {
      // Generate random results
      const slots = Array(3)
        .fill(0)
        .map(
          () => SLOTS_SYMBOLS[Math.floor(Math.random() * SLOTS_SYMBOLS.length)]
        );

      // Display format for slot results
      const slotDisplay = [
        `│ ${slots.map((s) => s.emoji).join(" │ ")} │`,
        "└─────────────┘",
      ].join("\n");

      // Calculate winnings
      let winMultiplier = 0;
      let winMessage = "Sorry, no match.";

      // Check for matches
      if (
        slots[0].emoji === slots[1].emoji &&
        slots[1].emoji === slots[2].emoji
      ) {
        // Jackpot - all three symbols match
        winMultiplier = slots[0].value;
        winMessage = `**JACKPOT!** Three ${slots[0].name}s! (${winMultiplier}x)`;
      } else if (
        slots[0].emoji === slots[1].emoji ||
        slots[1].emoji === slots[2].emoji ||
        slots[0].emoji === slots[2].emoji
      ) {
        // Two of the same symbol
        if (slots[0].emoji === slots[1].emoji) {
          winMultiplier = slots[0].value / 3;
          winMessage = `Two ${slots[0].name}s! (${winMultiplier.toFixed(1)}x)`;
        } else if (slots[1].emoji === slots[2].emoji) {
          winMultiplier = slots[1].value / 3;
          winMessage = `Two ${slots[1].name}s! (${winMultiplier.toFixed(1)}x)`;
        } else {
          winMultiplier = slots[0].value / 3;
          winMessage = `Two ${slots[0].name}s! (${winMultiplier.toFixed(1)}x)`;
        }
      }

      // Calculate winnings
      const winnings = Math.round(betAmount * winMultiplier);
      const netResult = winnings - betAmount;

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

      // Update slot machine stats
      const slotsPlayed = (await db.get(`slots_played_${userId}`)) || 0;
      await db.set(`slots_played_${userId}`, slotsPlayed + 1);

      if (winnings > betAmount) {
        const slotsWon = (await db.get(`slots_won_${userId}`)) || 0;
        await db.set(`slots_won_${userId}`, slotsWon + 1);
      }

      // Get new balance
      const newBalance = (await db.get(`cash_${userId}`)) || 0;

      // Update the embed with results
      const resultsEmbed = new EmbedBuilder()
        .setColor(winnings > 0 ? "#00cc00" : "#ff3333")
        .setTitle("🎰 Slot Machine Results 🎰")
        .setDescription(
          `${displayName} bet ${formatNumber(betAmount)} atlyss coins`
        )
        .addFields(
          {
            name: "Your Spin",
            value: `\`\`\`\n┌─────────────┐\n${slotDisplay}\`\`\``,
          },
          {
            name: winnings > 0 ? `You Won!` : `You Lost!`,
            value: `${winMessage}${
              winnings > 0 ? `\nWinnings: ${formatNumber(winnings)} coins` : ""
            }`,
          },
          {
            name: "Net Result",
            value:
              netResult >= 0
                ? `+${formatNumber(netResult)} coins`
                : `${formatNumber(netResult)} coins`,
            inline: true,
          }
        )
        .setFooter({
          text: `Your new balance: ${formatNumber(newBalance)} atlyss coins`,
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      // If it's a big win, add some flair
      if (winMultiplier > 3) {
        resultsEmbed
         
          .addFields({
            name: "🎉 BIG WIN! 🎉",
            value: "Congratulations on your lucky spin!",
          });
      } else if (winnings === 0) {
      
      } else {
       
      }

      // Update the message
      slotMsg.edit({ embeds: [resultsEmbed] });
    }, 2000); // 2 seconds delay for suspense
  },
};
