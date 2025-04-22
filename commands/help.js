// filepath: c:\bot\commands\help.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "welp",
  description: "Shows detailed information about available commands",
  aliases: ["commands", "info", "h"],
  usage: "!welp [command name]",

  async execute(message, args) {
    const { commands } = message.client;
    const prefix = "!"; // Make sure this matches your bot's prefix

    // If no specific command was provided, show all commands by category
    if (!args.length) {
      // Create categories
      const categories = {
        Economy: [],
        Dinosaurs: [],
        Gambling: [],
        Trading: [],
        Misc: [],
      };

      // Sort commands into categories with more specific categorization
      commands.forEach((cmd) => {
        if (
          cmd.name.includes("dino") ||
          ["catch", "hunt", "zoo", "huntbot"].includes(cmd.name)
        ) {
          categories.Dinosaurs.push(cmd);
        } else if (
          [
            "balance",
            "daily",
            "beg",
            "shop",
            "buy",
            "sell",
            "forge",
            "upgrade",
            "topup",
            "weapons",
            "equip",
          ].includes(cmd.name)
        ) {
          categories.Economy.push(cmd);
        } else if (
          [
            "battle",
            "dice",
            "coinflip",
            "blackjack",
            "roulette",
            "slots",
            "scratch",
          ].includes(cmd.name)
        ) {
          categories.Gambling.push(cmd);
        } else if (
          ["trade", "transfer", "sacrifice", "sacrificeweapon"].includes(
            cmd.name
          )
        ) {
          categories.Trading.push(cmd);
        } else {
          categories.Misc.push(cmd);
        }
      });

      // Create and send the help embed with more detailed information
      const helpEmbed = new EmbedBuilder()
        .setColor("#9B59B6")
        .setTitle("📚 Complete Command Reference")
        .setDescription(
          `**Welcome to the detailed help menu!**\n\nThis bot has ${
            commands.size
          } commands available across ${
            Object.keys(categories).length
          } categories.\nUse \`${prefix}help [command name]\` to get comprehensive details about a specific command!`
        )
        .setThumbnail(message.client.user.displayAvatarURL())
        .setFooter({
          text: `Type !welp [category] for detailed category info | Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      // Add fields for each category with more descriptive text
      for (const [category, cmds] of Object.entries(categories)) {
        if (cmds.length > 0) {
          helpEmbed.addFields({
            name: `${getCategoryEmoji(category)} ${category} Commands [${
              cmds.length
            }]`,
            value: `**${getCategoryDescription(category)}**\n${cmds
              .map((cmd) => `\`${cmd.name}\``)
              .join(
                ", "
              )}\n\nType \`${prefix}help ${category.toLowerCase()}\` for category details.`,
          });
        }
      }

      // Add button row for navigation
      const buttonRow = new ActionRowBuilder().addComponents(
        Object.keys(categories).map((category) =>
          new ButtonBuilder()
            .setCustomId(`help_${category.toLowerCase()}`)
            .setLabel(category)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(getCategoryEmoji(category))
        )
      );

      message.channel.send({ embeds: [helpEmbed], components: [buttonRow] });
      return;
    }

    // Check if we're looking for category info
    const categoryName = args[0].toLowerCase();
    const categories = ["economy", "dinosaurs", "gambling", "trading", "misc"];

    if (categories.includes(categoryName)) {
      // Show detailed category information
      return sendCategoryHelp(message, categoryName);
    }

    // If a specific command was provided
    const name = args[0].toLowerCase();
    const command =
      commands.get(name) ||
      commands.find((c) => c.aliases && c.aliases.includes(name));

    if (!command) {
      return message.reply(
        `I couldn't find a command called "${name}". Type \`${prefix}help\` to see all available commands.`
      );
    }

    const commandEmbed = new EmbedBuilder()
      .setColor("#3498DB")
      .setTitle(`📖 Detailed Guide: ${prefix}${command.name}`)
      .setDescription(command.description || "No description available");

    // Add detailed usage info with examples
    commandEmbed.addFields(
      {
        name: "📋 Syntax",
        value: `\`${command.usage || `${prefix}${command.name}`}\``,
      },
      {
        name: "💡 Example Usage",
        value: getExampleUsage(command.name, prefix),
      }
    );

    if (command.aliases && command.aliases.length) {
      commandEmbed.addFields({
        name: "✳️ Aliases",
        value: command.aliases.map((a) => `\`${prefix}${a}\``).join(", "),
      });
    }

    if (command.cooldown) {
      const cooldownMinutes = Math.floor(command.cooldown / (60 * 1000));
      commandEmbed.addFields({
        name: "⏱️ Cooldown",
        value:
          cooldownMinutes > 0
            ? `${cooldownMinutes} minutes`
            : `${command.cooldown / 1000} seconds`,
      });
    }

    // Add rewards/risks if applicable
    const rewardsInfo = getRewardsInfo(command.name);
    if (rewardsInfo) {
      commandEmbed.addFields({
        name: "💰 Rewards & Outcomes",
        value: rewardsInfo,
      });
    }

    // Add tips and tricks
    commandEmbed.addFields({
      name: "💪 Pro Tips",
      value: getProTips(command.name),
    });

    commandEmbed
      .setFooter({
        text: `Detailed documentation | Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [commandEmbed] });
  },
};

// Helper function to get emoji for each category
function getCategoryEmoji(category) {
  switch (category) {
    case "Economy":
      return "💰";
    case "Dinosaurs":
      return "🦖";
    case "Gambling":
      return "🎲";
    case "Trading":
      return "🔄";
    case "Misc":
      return "📌";
    default:
      return "❓";
  }
}

// Helper function to get description for each category
function getCategoryDescription(category) {
  switch (category) {
    case "Economy":
      return "Commands for earning, spending and managing your Atlyss coins";
    case "Dinosaurs":
      return "Catch, battle and manage your dinosaur collection";
    case "Gambling":
      return "Test your luck with various gambling games";
    case "Trading":
      return "Exchange items, coins and dinosaurs with other players";
    case "Misc":
      return "Utility and miscellaneous commands";
    default:
      return "Various commands";
  }
}

// Function to get example usage based on command
function getExampleUsage(commandName, prefix) {
  switch (commandName) {
    case "balance":
      return `\`${prefix}balance\` - Check your current coin balance`;
    case "daily":
      return `\`${prefix}daily\` - Collect your daily reward`;
    case "dinobattle":
      return `\`${prefix}dinobattle @User 1000 T-Rex\` - Challenge @User to a dinosaur battle with 1000 coins using your T-Rex\n\`${prefix}dinobattle @User\` - Challenge with no bet, dino will be selected automatically`;
    case "catch":
      return `\`${prefix}catch\` - Try to catch a random dinosaur`;
    case "dinos":
      return `\`${prefix}dinos\` - See your dinosaur collection\n\`${prefix}dinos @User\` - Check someone else's collection`;
    case "shop":
      return `\`${prefix}shop\` - Browse the available items\n\`${prefix}shop 2\` - View page 2 of the shop`;
    case "buy":
      return `\`${prefix}buy trap\` - Buy a 'trap' item from the shop\n\`${prefix}buy bait 3\` - Buy 3 'bait' items`;
    case "sell":
      return `\`${prefix}sell trap\` - Sell one trap item\n\`${prefix}sell trap all\` - Sell all of your traps`;
    case "trade":
      return `\`${prefix}trade @User 1000\` - Offer to trade 1000 coins with @User\n\`${prefix}trade @User T-Rex\` - Offer to trade your T-Rex with @User`;
    default:
      return `\`${prefix}${commandName}\` - Use this command`;
  }
}

// Function to get rewards info based on command
function getRewardsInfo(commandName) {
  switch (commandName) {
    case "daily":
      return "Receive 200-500 coins once every 24 hours. Consecutive daily claims increase your streak for bonus rewards.";
    case "beg":
      return "Earn 1-100 coins with a cooldown of 5 minutes. There's a small chance to receive a special item.";
    case "catch":
      return "Find dinosaurs of different rarities (Common, Uncommon, Rare, Legendary) each with unique stats and abilities.";
    case "dinobattle":
      return "Win battles to earn XP for your dinosaur and claim your opponent's bet. Each win increases your dinosaur's stats, but be careful - defeated dinosaurs have a 15% chance of dying permanently!";
    case "dice":
      return "Bet coins on a dice roll. If your prediction is correct, you win double your bet. Higher risk rolls have bigger payouts.";
    case "coinflip":
      return "Bet coins on heads or tails. Correct guesses double your money.";
    case "slots":
      return "Bet coins on the slot machine. Different symbol combinations offer various payout multipliers, with jackpots up to 10x your bet.";
    case "roulette":
      return "Place bets on different outcomes with corresponding payout ratios: Single number (35:1), Red/Black (1:1), Odd/Even (1:1), etc.";
    default:
      return null;
  }
}

// Function to get pro tips based on command
function getProTips(commandName) {
  switch (commandName) {
    case "dinobattle":
      return "• Higher level dinosaurs have better stats (5% increase per level)\n• Use 'Defend' against opponents with high attack power\n• The 'Special' attack uses your dinosaur's unique skill\n• Surrender if your dinosaur is at risk and you don't want it to die";
    case "dinos":
      return "• Rare dinosaurs have better base stats than common ones\n• Level up dinosaurs by winning battles\n• Keep your best dinosaurs safe by avoiding risky battles\n• Some dinosaur skills are more effective against certain types";
    case "catch":
      return "• Use bait to increase your chances of finding rare dinosaurs\n• Use traps to improve your catch success rate\n• Each dinosaur has unique stats and abilities\n• Legendary dinosaurs are extremely rare but very powerful";
    case "shop":
      return "• Prices may fluctuate based on server economy\n• Some items are only available at certain times\n• Higher tier items offer better benefits but cost more";
    case "battle":
      return "• Use weapons to increase your damage\n• Equipment can provide defensive bonuses\n• Choosing the right timing for special moves can turn the tide";
    default:
      return "• Use !help [command] to learn more about specific commands\n• Check cooldowns to optimize your earnings\n• Join the official Discord server for updates and tips";
  }
}

// Function to send detailed category help
async function sendCategoryHelp(message, categoryName) {
  const { commands } = message.client;
  const prefix = "!";

  // Maps for filtering commands by category
  const categoryFilters = {
    economy: (cmd) =>
      [
        "balance",
        "daily",
        "beg",
        "shop",
        "buy",
        "sell",
        "forge",
        "upgrade",
        "topup",
        "weapons",
        "equip",
      ].includes(cmd.name),
    dinosaurs: (cmd) =>
      cmd.name.includes("dino") ||
      ["catch", "hunt", "zoo", "huntbot"].includes(cmd.name),
    gambling: (cmd) =>
      [
        "battle",
        "dice",
        "coinflip",
        "blackjack",
        "roulette",
        "slots",
        "scratch",
      ].includes(cmd.name),
    trading: (cmd) =>
      ["trade", "transfer", "sacrifice", "sacrificeweapon"].includes(cmd.name),
    misc: (cmd) =>
      ![
        "balance",
        "daily",
        "beg",
        "shop",
        "buy",
        "sell",
        "forge",
        "upgrade",
        "topup",
        "weapons",
        "equip",
        "catch",
        "hunt",
        "zoo",
        "huntbot",
        "battle",
        "dice",
        "coinflip",
        "blackjack",
        "roulette",
        "slots",
        "scratch",
        "trade",
        "transfer",
        "sacrifice",
        "sacrificeweapon",
      ].includes(cmd.name) && !cmd.name.includes("dino"),
  };

  // Get commands for this category
  const categoryCommands = Array.from(commands.values()).filter(
    categoryFilters[categoryName]
  );

  // Format category name
  const formattedCategoryName =
    categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

  const categoryEmbed = new EmbedBuilder()
    .setColor(getCategoryColor(categoryName))
    .setTitle(
      `${getCategoryEmoji({
        [formattedCategoryName]: true,
      })} ${formattedCategoryName} Commands`
    )
    .setDescription(
      `${getCategoryDescription(
        formattedCategoryName
      )}\n\nHere's a detailed breakdown of all ${
        categoryCommands.length
      } commands in this category:`
    )
    .setFooter({
      text: `Use ${prefix}help [command] for even more details | Requested by ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp();

  // Add each command with brief description
  categoryCommands.forEach((cmd) => {
    categoryEmbed.addFields({
      name: `${prefix}${cmd.name}`,
      value: `${cmd.description || "No description"}\n**Usage:** \`${
        cmd.usage || `${prefix}${cmd.name}`
      }\`${
        cmd.cooldown ? `\n**Cooldown:** ${formatCooldown(cmd.cooldown)}` : ""
      }${
        cmd.aliases
          ? `\n**Aliases:** ${cmd.aliases
              .map((a) => `\`${prefix}${a}\``)
              .join(", ")}`
          : ""
      }`,
    });
  });

  return message.channel.send({ embeds: [categoryEmbed] });
}

// Helper function to get color for each category
function getCategoryColor(category) {
  switch (category.toLowerCase()) {
    case "economy":
      return "#2ecc71"; // Green
    case "dinosaurs":
      return "#e74c3c"; // Red
    case "gambling":
      return "#f1c40f"; // Yellow
    case "trading":
      return "#3498db"; // Blue
    case "misc":
      return "#95a5a6"; // Gray
    default:
      return "#9b59b6"; // Purple
  }
}

// Format cooldown time
function formatCooldown(ms) {
  if (ms >= 3600000) {
    return `${Math.floor(ms / 3600000)} hour(s)`;
  } else if (ms >= 60000) {
    return `${Math.floor(ms / 60000)} minute(s)`;
  } else {
    return `${Math.floor(ms / 1000)} second(s)`;
  }
}
