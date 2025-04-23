// filepath: c:\bot\commands\scratch.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Ticket prices and their potential payouts
const TICKETS = {
  basic: {
    price: 100,
    emoji: "🎫",
    maxPayout: 500,
    chances: {
      win: 0.35, // 35% chance to win something
      jackpot: 0.05, // 5% chance to win jackpot (among winners)
    },
    description: "Basic Ticket: 100 coins - Win up to 500 coins!",
  },
  silver: {
    price: 500,
    emoji: "🥈",
    maxPayout: 3000,
    chances: {
      win: 0.4, // 40% chance to win something
      jackpot: 0.07, // 7% chance to win jackpot (among winners)
    },
    description: "Silver Ticket: 500 coins - Win up to 3,000 coins!",
  },
  gold: {
    price: 1000,
    emoji: "🥇",
    maxPayout: 7500,
    chances: {
      win: 0.45, // 45% chance to win something
      jackpot: 0.1, // 10% chance to win jackpot (among winners)
    },
    description: "Gold Ticket: 1,000 coins - Win up to 7,500 coins!",
  },
  diamond: {
    price: 50000,
    emoji: "💎",
    maxPayout: 105000,
    chances: {
      win: 0.01, // 50% chance to win something
      jackpot: 0.1, // 12% chance to win jackpot (among winners)
    },
    description: "Diamond Ticket: 2,500 coins - Win up to 25,000 coins!",
  },
};

// Scratch symbols and their descriptions
const SYMBOLS = ["💰", "💎", "🎁", "🍀", "⭐", "🎯", "🎰", "💫", "🎪", "🌈"];

module.exports = {
  name: "scratch",
  description: "Buy and scratch lottery tickets",
  usage: "!scratch [ticket type]",
  aliases: ["scratchers", "lottery", "ticket"],
  cooldown: 60000, // 3 seconds
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // If no arguments, show the ticket shop
    if (!args.length) {
      const shopEmbed = new EmbedBuilder()
        .setColor("#ffd700")
        .setTitle("🎟️ Atlyss Scratchers Shop")
        .setDescription("Purchase a ticket and try your luck!")
        .addFields(
          {
            name: "Available Tickets",
            value: Object.entries(TICKETS)
              .map(
                ([type, info]) =>
                  `${info.emoji} **${
                    type.charAt(0).toUpperCase() + type.slice(1)
                  }** - ${formatNumber(
                    info.price
                  )} coins (max payout: ${formatNumber(info.maxPayout)})`
              )
              .join("\n"),
          },
          {
            name: "How to Play",
            value:
              "Use `!scratch [ticket type]` to purchase and scratch a ticket!",
          }
        )
        .setFooter({
          text: "Good luck!",
          iconURL: message.client.user.displayAvatarURL(),
        });

      return message.channel.send({ embeds: [shopEmbed] });
    }

    // Parse ticket type
    const ticketType = args[0].toLowerCase();
    if (!TICKETS[ticketType]) {
      return message.reply(
        `Invalid ticket type. Available tickets are: ${Object.keys(
          TICKETS
        ).join(", ")}`
      );
    }

    const ticket = TICKETS[ticketType];

    // Check user balance
    const balance = (await db.get(`cash_${userId}`)) || 0;
    if (balance < ticket.price) {
      return message.reply(
        `You don't have enough atlyss coins to buy a ${ticketType} ticket! You need ${formatNumber(
          ticket.price
        )} coins, but you only have ${formatNumber(balance)}.`
      );
    }

    // Deduct ticket price
    await db.subtract(`cash_${userId}`, ticket.price);

    // Create initial embed for the scratcher
    const scratchingEmbed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle(
        `${ticket.emoji} Scratching your ${ticketType.toUpperCase()} Ticket ${
          ticket.emoji
        }`
      )
      .setDescription(
        `**${displayName}** purchased a ${ticketType} ticket for ${formatNumber(
          ticket.price
        )} atlyss coins`
      )
      .addFields({ name: "Scratching...", value: "Revealing your symbols..." })
      .setFooter({
        text: `Your balance: ${formatNumber(
          balance - ticket.price
        )} atlyss coins`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    const ticketMsg = await message.channel.send({ embeds: [scratchingEmbed] });

    // Generate ticket results (with a delay for suspense)
    setTimeout(async () => {
      // Determine if user wins
      const isWinner = Math.random() < ticket.chances.win;
      let winnings = 0;

      // Generate the 9 symbols for the 3x3 grid
      const grid = Array(9)
        .fill(0)
        .map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

      if (isWinner) {
        // Is it a jackpot?
        const isJackpot = Math.random() < ticket.chances.jackpot;

        if (isJackpot) {
          winnings = ticket.maxPayout;

          // Make multiple symbols match for jackpot visual
          const jackpotSymbol =
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          for (let i = 0; i < 5; i++) {
            grid[Math.floor(Math.random() * 9)] = jackpotSymbol;
          }
        } else {
          // Regular win - random amount between ticket price and max payout
          winnings =
            Math.floor(Math.random() * (ticket.maxPayout - ticket.price)) +
            ticket.price;

          // Make a few symbols match for visual
          const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          for (let i = 0; i < 3; i++) {
            grid[Math.floor(Math.random() * 9)] = winSymbol;
          }
        }

        // Add winnings to user balance
        await db.add(`cash_${userId}`, winnings);

        // Update gambling stats
        const wonAmount = (await db.get(`gambling_won_${userId}`)) || 0;
        await db.set(`gambling_won_${userId}`, wonAmount + winnings);
      }

      // Update gambling stats
      const gambledAmount = (await db.get(`gambled_${userId}`)) || 0;
      await db.set(`gambled_${userId}`, gambledAmount + ticket.price);

      // Update scratchers stats
      const scratchersPlayed =
        (await db.get(`scratchers_played_${userId}`)) || 0;
      await db.set(`scratchers_played_${userId}`, scratchersPlayed + 1);

      if (isWinner) {
        const scratchersWon = (await db.get(`scratchers_won_${userId}`)) || 0;
        await db.set(`scratchers_won_${userId}`, scratchersWon + 1);
      }

      // Get new balance
      const newBalance = (await db.get(`cash_${userId}`)) || 0;

      // Format the 3x3 grid
      const gridDisplay = [
        grid.slice(0, 3).join(" "),
        grid.slice(3, 6).join(" "),
        grid.slice(6, 9).join(" "),
      ].join("\n");

      // Create the results embed
      const resultEmbed = new EmbedBuilder()
        .setColor(isWinner ? "#00cc00" : "#ff3333")
        .setTitle(
          `${ticket.emoji} ${ticketType.toUpperCase()} Ticket Results ${
            ticket.emoji
          }`
        )
        .setDescription(
          `**${displayName}** scratched a ${ticketType} ticket worth ${formatNumber(
            ticket.price
          )} atlyss coins`
        )
        .addFields(
          {
            name: "Your Ticket",
            value: `\`\`\`\n${gridDisplay}\`\`\``,
          },
          {
            name: isWinner ? "You Won! 🎉" : "You Lost! 💔",
            value: isWinner
              ? `You won **${formatNumber(winnings)}** atlyss coins!`
              : "Better luck next time!",
          },
          {
            name: "Net Result",
            value: isWinner
              ? `+${formatNumber(winnings - ticket.price)} coins`
              : `-${formatNumber(ticket.price)} coins`,
            inline: true,
          }
        )
        .setFooter({
          text: `Your new balance: ${formatNumber(newBalance)} atlyss coins`,
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      // If it's a jackpot, add some flair
      if (isWinner && winnings === ticket.maxPayout) {
        resultEmbed.addFields({
          name: "🎊 JACKPOT! 🎊",
          value: `You hit the maximum payout of ${formatNumber(
            winnings
          )} coins!`,
        });
      }

      // Update the message
      ticketMsg.edit({ embeds: [resultEmbed] });
    }, 3000); // 3 seconds for scratching animation
  },
};
