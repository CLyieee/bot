const db = require("../utils/database");
const {
  getDisplayName,
  formatNumber,
  checkCooldown,
} = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Auto Hunt Bot configurations
const HUNTBOT_LEVELS = [
  { level: 1, cost: 1000, efficiency: 1, cooldown: 60 * 60 * 1000 }, // 1hr cooldown
  { level: 2, cost: 2500, efficiency: 1.25, cooldown: 50 * 60 * 1000 }, // 50min
  { level: 3, cost: 5000, efficiency: 1.5, cooldown: 40 * 60 * 1000 }, // 40min
  { level: 4, cost: 10000, efficiency: 2, cooldown: 30 * 60 * 1000 }, // 30min
  { level: 5, cost: 25000, efficiency: 2.5, cooldown: 20 * 60 * 1000 }, // 20min
];

module.exports = {
  name: "huntbot",
  description: "Set up auto hunting with HuntBot",
  usage: "!huntbot [upgrade/claim]",
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Initialize huntbot data if not exists
    let huntbot = await db.get(`huntbot_${userId}`);
    if (!huntbot) {
      huntbot = {
        level: 0,
        lastClaim: null,
        enabled: false,
        inventory: {},
      };
      await db.set(`huntbot_${userId}`, huntbot);
    }

    // Process command arguments
    const action = args[0]?.toLowerCase();

    // Display HuntBot status if no arguments
    if (!action) {
      return await showHuntbotStatus(message, userId, displayName, huntbot);
    }

    // Handle upgrade command
    if (action === "upgrade" || action === "buy") {
      return await upgradeHuntbot(message, userId, displayName, huntbot);
    }

    // Handle claim command
    if (action === "claim" || action === "collect") {
      return await claimHuntbotRewards(message, userId, displayName, huntbot);
    }

    // Handle toggle command
    if (action === "toggle" || action === "on" || action === "off") {
      return await toggleHuntbot(message, userId, displayName, huntbot, action);
    }

    // Unknown command
    return message.reply(
      `Unknown huntbot command. Use \`!huntbot\`, \`!huntbot upgrade\`, \`!huntbot claim\`, or \`!huntbot toggle\`.`
    );
  },
};

// Show huntbot status
async function showHuntbotStatus(message, userId, displayName, huntbot) {
  const level = huntbot.level;

  // If no huntbot yet
  if (level === 0) {
    const embed = new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("🤖 HuntBot")
      .setDescription(
        `You don't have a HuntBot yet!\n\nHuntBot will automatically hunt for animals while you're away.\n\nUse \`!huntbot buy\` to purchase a HuntBot for ${formatNumber(
          HUNTBOT_LEVELS[0].cost
        )} atlyss coins.`
      )
      .setThumbnail("https://i.imgur.com/O3JJeht.png")
      .setFooter({
        text: "Upgrade your HuntBot for more efficient hunting!",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // Show huntbot status
  const huntbotConfig = HUNTBOT_LEVELS[level - 1];

  // Check if rewards ready for claim
  const claimStatus = checkHuntbotClaimStatus(huntbot, huntbotConfig);

  const embed = new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle(`🤖 HuntBot - Level ${level}`)
    .setDescription(
      `${displayName}'s HuntBot ${
        huntbot.enabled ? "is active" : "is inactive"
      }!`
    )
    .addFields(
      {
        name: "Status",
        value: huntbot.enabled ? "✅ Active" : "❌ Inactive",
        inline: true,
      },
      {
        name: "Efficiency",
        value: `${huntbotConfig.efficiency}x`,
        inline: true,
      },
      {
        name: "Cooldown",
        value: `${huntbotConfig.cooldown / (60 * 1000)} minutes`,
        inline: true,
      },
      {
        name: "Rewards",
        value: claimStatus.canClaim
          ? "✅ Ready to collect!"
          : `⏳ Ready in ${claimStatus.timeLeft || "N/A"}`,
        inline: false,
      }
    )
    .setThumbnail("https://i.imgur.com/O3JJeht.png")
    .setFooter({
      text:
        level < HUNTBOT_LEVELS.length
          ? `Upgrade to level ${level + 1} for ${formatNumber(
              HUNTBOT_LEVELS[level].cost
            )} coins`
          : "Max level reached!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Command help
  let commands = [];
  if (claimStatus.canClaim)
    commands.push("• `!huntbot claim` to collect rewards");
  if (level < HUNTBOT_LEVELS.length)
    commands.push(
      `• \`!huntbot upgrade\` to upgrade (${formatNumber(
        HUNTBOT_LEVELS[level].cost
      )} coins)`
    );
  commands.push(
    `• \`!huntbot toggle\` to ${huntbot.enabled ? "deactivate" : "activate"}`
  );

  if (commands.length > 0) {
    embed.addFields({ name: "Commands", value: commands.join("\n") });
  }

  return message.channel.send({ embeds: [embed] });
}

// Upgrade huntbot
async function upgradeHuntbot(message, userId, displayName, huntbot) {
  const currentLevel = huntbot.level;

  // Check if already at max level
  if (currentLevel >= HUNTBOT_LEVELS.length) {
    return message.reply("Your HuntBot is already at maximum level!");
  }

  // Get next level config
  const nextLevel = currentLevel + 1;
  const cost =
    currentLevel === 0
      ? HUNTBOT_LEVELS[0].cost
      : HUNTBOT_LEVELS[currentLevel].cost;

  // Check if user has enough coins
  const balance = (await db.get(`cash_${userId}`)) || 0;
  if (balance < cost) {
    return message.reply(
      `You need ${formatNumber(cost)} atlyss coins to ${
        currentLevel === 0 ? "purchase" : "upgrade"
      } your HuntBot. You only have ${formatNumber(balance)}.`
    );
  }

  // Deduct coins and upgrade
  await db.subtract(`cash_${userId}`, cost);

  // Update huntbot data
  huntbot.level = nextLevel;
  if (nextLevel === 1) {
    // First purchase, enable and set initial claim time
    huntbot.enabled = true;
    huntbot.lastClaim = Date.now();
  }

  await db.set(`huntbot_${userId}`, huntbot);

  // Success message
  const embed = new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle(`🤖 HuntBot ${currentLevel === 0 ? "Purchased" : "Upgraded"}!`)
    .setDescription(
      `${displayName} has ${
        currentLevel === 0 ? "purchased a" : `upgraded to level ${nextLevel}`
      } HuntBot for ${formatNumber(cost)} atlyss coins!`
    )
    .setThumbnail("https://i.imgur.com/O3JJeht.png")
    .addFields(
      { name: "New Level", value: `Level ${nextLevel}`, inline: true },
      {
        name: "Efficiency",
        value: `${HUNTBOT_LEVELS[nextLevel - 1].efficiency}x`,
        inline: true,
      },
      {
        name: "Cooldown",
        value: `${
          HUNTBOT_LEVELS[nextLevel - 1].cooldown / (60 * 1000)
        } minutes`,
        inline: true,
      }
    )
    .setFooter({
      text:
        currentLevel === 0
          ? "Your HuntBot is now active and hunting!"
          : "Improved hunting performance!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Check if huntbot rewards are ready
function checkHuntbotClaimStatus(huntbot, config) {
  if (!huntbot.enabled || huntbot.level === 0 || !huntbot.lastClaim) {
    return { canClaim: false };
  }

  const now = Date.now();
  const timePassed = now - huntbot.lastClaim;

  if (timePassed >= config.cooldown) {
    return { canClaim: true };
  } else {
    const timeLeft = config.cooldown - timePassed;
    const minutes = Math.floor(timeLeft / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
    return {
      canClaim: false,
      timeLeft: `${minutes}m ${seconds}s`,
    };
  }
}

// Claim huntbot rewards
async function claimHuntbotRewards(message, userId, displayName, huntbot) {
  // Check if huntbot exists and is enabled
  if (huntbot.level === 0) {
    return message.reply(
      "You don't have a HuntBot yet! Use `!huntbot buy` to purchase one."
    );
  }

  if (!huntbot.enabled) {
    return message.reply(
      "Your HuntBot is currently inactive! Use `!huntbot toggle` to activate it."
    );
  }

  // Get huntbot configuration
  const huntbotConfig = HUNTBOT_LEVELS[huntbot.level - 1];

  // Check if rewards are ready
  const claimStatus = checkHuntbotClaimStatus(huntbot, huntbotConfig);
  if (!claimStatus.canClaim) {
    return message.reply(
      `Your HuntBot is still hunting! Check back in ${claimStatus.timeLeft}.`
    );
  }

  // Generate rewards based on time passed and efficiency
  const timeMultiplier = Math.min(
    24,
    Math.max(1, (Date.now() - huntbot.lastClaim) / huntbotConfig.cooldown)
  );
  const efficiencyMultiplier = huntbotConfig.efficiency;
  const totalMultiplier = timeMultiplier * efficiencyMultiplier;

  // Generate random coins (base: 40-100) * multiplier
  const baseCoins = Math.floor(Math.random() * 61) + 40;
  const totalCoins = Math.floor(baseCoins * totalMultiplier);

  // Add coins to user
  await db.add(`cash_${userId}`, totalCoins);

  // Update huntbot last claim time
  huntbot.lastClaim = Date.now();
  await db.set(`huntbot_${userId}`, huntbot);

  // Success message
  const embed = new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle("🤖 HuntBot Rewards Collected")
    .setDescription(`${displayName}, your HuntBot has returned from hunting!`)
    .addFields(
      {
        name: "Time Active",
        value: `${timeMultiplier.toFixed(1)} cooldown periods`,
        inline: true,
      },
      { name: "Efficiency", value: `${efficiencyMultiplier}x`, inline: true },
      {
        name: "Earnings",
        value: `${formatNumber(totalCoins)} atlyss coins`,
        inline: true,
      }
    )
    .setThumbnail("https://i.imgur.com/O3JJeht.png")
    .setFooter({
      text: "Your HuntBot is back on the hunt!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Toggle huntbot on/off
async function toggleHuntbot(message, userId, displayName, huntbot, action) {
  // Check if huntbot exists
  if (huntbot.level === 0) {
    return message.reply(
      "You don't have a HuntBot yet! Use `!huntbot buy` to purchase one."
    );
  }

  // Determine new state based on action or toggle current state
  let newState;
  if (action === "on") {
    newState = true;
  } else if (action === "off") {
    newState = false;
  } else {
    // Toggle
    newState = !huntbot.enabled;
  }

  // Update state if different
  if (huntbot.enabled !== newState) {
    huntbot.enabled = newState;

    // If turning on, set last claim to now
    if (newState) {
      huntbot.lastClaim = Date.now();
    }

    await db.set(`huntbot_${userId}`, huntbot);
  }

  // Success message
  const embed = new EmbedBuilder()
    .setColor(newState ? "#2ecc71" : "#e74c3c")
    .setTitle(`🤖 HuntBot ${newState ? "Activated" : "Deactivated"}`)
    .setDescription(
      `${displayName}, your HuntBot is now ${
        newState ? "active and hunting" : "inactive"
      }!`
    )
    .setThumbnail("https://i.imgur.com/O3JJeht.png")
    .setFooter({
      text: newState
        ? "Your HuntBot will collect rewards while you're away"
        : "Your HuntBot won't collect rewards while inactive",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}
