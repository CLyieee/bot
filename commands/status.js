// filepath: c:\bot\commands\status.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Effect type descriptions for better readability
const EFFECT_DESCRIPTIONS = {
  catch_rate: "Catch Success",
  rare_catch_rate: "Rare Catch Boost",
  high_tier_catch_rate: "High-Tier Catch Boost",
  boss_catch_rate: "Boss Catch Boost",
  guaranteed_catch: "Guaranteed Catch",
  battle_defense: "Battle Defense",
  battle_attack: "Battle Attack",
  battle_insight: "Battle Insight",
  death_prevention: "Death Prevention",
  dino_clone: "Dino Clone",
  permanent_ascension: "Permanent Ascension",
  create_legendary: "Legendary Creation",
  skill_mastery: "Skill Mastery",
  king_chance: "King Taming Chance",
  prayer_boost: "Prayer Blessing",
  hunt_success: "Hunt Success",
  hunt_rare: "Rare Find",
};

module.exports = {
  name: "status",
  description: "View your current active buffs and status effects",
  usage: "!status [user]",
  aliases: ["buffs", "effects", "boosts"],

  async execute(message, args) {
    // Check if a user is mentioned
    const target = message.mentions.users.first() || message.author;
    const userId = target.id;
    const member = message.guild.members.cache.get(userId);
    const displayName = getDisplayName(member);

    // Get current timestamp for expiry calculations
    const now = Date.now();

    // Fetch all possible status effects
    const itemBuffs = await fetchItemBuffs(userId, now);
    const prayerBuff = await fetchPrayerBuff(userId, now);
    const huntbotStatus = await fetchHuntbotStatus(userId);
    const battleBuffs = await fetchBattleBuffs(userId, now);

    // Check if user has any active buffs
    const hasActiveBuffs =
      itemBuffs.length > 0 ||
      prayerBuff ||
      huntbotStatus.active ||
      battleBuffs.length > 0;

    if (!hasActiveBuffs) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle(
              `${
                target.id === message.author.id ? "Your" : `${displayName}'s`
              } Status`
            )
            .setDescription(
              target.id === message.author.id
                ? "You don't have any active buffs or status effects right now. Use items or pray to gain buffs!"
                : `${displayName} doesn't have any active buffs or status effects right now.`
            )
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setFooter({
              text: "Use !shop to buy items or !use to activate buffs",
              iconURL: message.client.user.displayAvatarURL(),
            })
            .setTimestamp(),
        ],
      });
    }

    // Create the main status embed
    const statusEmbed = new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle(
        `${
          target.id === message.author.id ? "Your" : `${displayName}'s`
        } Active Effects`
      )
      .setDescription(
        `Here are all the currently active buffs and status effects:`
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `Use !status to check your buffs anytime | ${new Date().toLocaleDateString()}`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Add item buffs
    if (itemBuffs.length > 0) {
      let itemBuffsText = "";

      itemBuffs.forEach((buff) => {
        const timeLeft = Math.max(0, buff.expiry - now);
        const minutesLeft = Math.ceil(timeLeft / (60 * 1000));

        // Handle one-time use items differently
        if (buff.expiry === -1) {
          itemBuffsText += `${buff.emoji} **${buff.name}**: ${buff.description} (Next action)\n`;
        } else {
          itemBuffsText += `${buff.emoji} **${buff.name}**: ${buff.description}\n`;
          itemBuffsText += `⏱️ Expires in: ${minutesLeft} minutes\n\n`;
        }
      });

      statusEmbed.addFields({
        name: "🧪 Active Item Effects",
        value: itemBuffsText || "No active item effects",
      });
    }

    // Add prayer buff
    if (prayerBuff) {
      const timeLeft = Math.max(0, prayerBuff.expiry - now);
      const minutesLeft = Math.ceil(timeLeft / (60 * 1000));

      statusEmbed.addFields({
        name: "🙏 Divine Blessing",
        value: `Increased chance to find rare and legendary dinosaurs by **${prayerBuff.rareBoost}%**\n⏱️ Expires in: ${minutesLeft} minutes`,
      });
    }

    // Add huntbot status if active
    if (huntbotStatus.active) {
      statusEmbed.addFields({
        name: "🤖 HuntBot",
        value: `**Level ${huntbotStatus.level}** - Efficiency: ${
          huntbotStatus.efficiency
        }x\n${
          huntbotStatus.ready
            ? "✅ Ready to collect!"
            : `⏳ Ready in ${huntbotStatus.timeLeft || "calculating..."}`
        }`,
      });
    }

    // Add battle buffs if any
    if (battleBuffs.length > 0) {
      let battleBuffText = "";

      battleBuffs.forEach((buff) => {
        battleBuffText += `${buff.emoji} **${buff.name}**: ${buff.description}\n`;

        if (buff.uses) {
          battleBuffText += `⚔️ Remaining uses: ${buff.uses}\n\n`;
        } else if (buff.expiry !== -1) {
          const timeLeft = Math.max(0, buff.expiry - now);
          const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
          battleBuffText += `⏱️ Expires in: ${minutesLeft} minutes\n\n`;
        }
      });

      statusEmbed.addFields({
        name: "⚔️ Battle Effects",
        value: battleBuffText || "No active battle effects",
      });
    }

    // Add combined effect summary section
    const effectSummary = calculateCombinedEffects(itemBuffs, prayerBuff);
    if (Object.keys(effectSummary).length > 0) {
      let summaryText = "";

      for (const [effectType, totalBoost] of Object.entries(effectSummary)) {
        const effectName = EFFECT_DESCRIPTIONS[effectType] || effectType;
        summaryText += `**${effectName}:** +${totalBoost}%\n`;
      }

      statusEmbed.addFields({
        name: "💯 Combined Effect Totals",
        value: summaryText,
      });
    }

    // Send the status embed
    message.channel.send({ embeds: [statusEmbed] });
  },
};

// Fetch active item buffs
async function fetchItemBuffs(userId, now) {
  // Get all buffs from database
  const buffs = (await db.get(`buffs_${userId}`)) || [];

  // Filter out expired buffs
  return buffs.filter((buff) => buff.expiry > now || buff.expiry === -1);
}

// Fetch active prayer buff
async function fetchPrayerBuff(userId, now) {
  const prayerBuff = await db.get(`prayBuff_${userId}`);

  if (prayerBuff && prayerBuff.expiry > now) {
    return prayerBuff;
  }

  return null;
}

// Fetch huntbot status
async function fetchHuntbotStatus(userId) {
  const huntbot = await db.get(`huntbot_${userId}`);

  if (!huntbot || huntbot.level === 0 || !huntbot.enabled) {
    return { active: false };
  }

  // Huntbot levels and configurations from huntbot.js
  const HUNTBOT_LEVELS = [
    { level: 1, cost: 1000, efficiency: 1, cooldown: 60 * 60 * 1000 },
    { level: 2, cost: 2500, efficiency: 1.25, cooldown: 50 * 60 * 1000 },
    { level: 3, cost: 5000, efficiency: 1.5, cooldown: 40 * 60 * 1000 },
    { level: 4, cost: 10000, efficiency: 2, cooldown: 30 * 60 * 1000 },
    { level: 5, cost: 25000, efficiency: 2.5, cooldown: 20 * 60 * 1000 },
  ];

  // Get huntbot configuration
  const config = HUNTBOT_LEVELS[huntbot.level - 1];
  const now = Date.now();

  // Calculate time until ready
  let ready = false;
  let timeLeft = "";

  if (huntbot.lastClaim) {
    const timePassed = now - huntbot.lastClaim;

    if (timePassed >= config.cooldown) {
      ready = true;
    } else {
      const timeRemaining = config.cooldown - timePassed;
      const minutes = Math.floor(timeRemaining / (60 * 1000));
      const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
      timeLeft = `${minutes}m ${seconds}s`;
    }
  }

  return {
    active: true,
    level: huntbot.level,
    efficiency: config.efficiency,
    ready,
    timeLeft,
  };
}

// Fetch active battle buffs
async function fetchBattleBuffs(userId, now) {
  // Example placeholder - in a real implementation, we would fetch battle-related buffs
  // This might be stored in another database key like battleBuffs_${userId}
  return [];
}

// Calculate combined effect totals
function calculateCombinedEffects(itemBuffs, prayerBuff) {
  const effectTotals = {};

  // Add up item buff effects
  itemBuffs.forEach((buff) => {
    const { type, value } = buff.effect;

    if (typeof value === "number" && !isNaN(value)) {
      if (!effectTotals[type]) {
        effectTotals[type] = 0;
      }

      effectTotals[type] += value;
    }
  });

  // Add prayer buff if present
  if (prayerBuff && prayerBuff.rareBoost) {
    if (!effectTotals["rare_catch_rate"]) {
      effectTotals["rare_catch_rate"] = 0;
    }

    effectTotals["rare_catch_rate"] += prayerBuff.rareBoost;
  }

  return effectTotals;
}
