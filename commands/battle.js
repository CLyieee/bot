const db = require("../utils/database");
const {
  getDisplayName,
  formatNumber,
  checkCooldown,
} = require("../utils/helpers");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Default weapons if the user doesn't have one equipped
const DEFAULT_WEAPONS = [
  { name: "Wooden Sword", damage: [5, 15], emoji: "🪵" },
  { name: "Iron Dagger", damage: [10, 20], emoji: "🔪" },
  { name: "Knight's Lance", damage: [15, 25], emoji: "🗡️" },
  { name: "Magic Staff", damage: [10, 30], emoji: "🧙‍♂️" },
  { name: "Bow and Arrow", damage: [8, 28], emoji: "🏹" },
];

const BATTLE_OUTCOMES = [
  "{attacker} strikes {defender} with their {weapon} dealing {damage} damage!",
  "{attacker} swings their {weapon} at {defender} for {damage} damage!",
  "{attacker}'s {weapon} hits {defender} for a solid {damage} damage!",
  "{attacker} lunges at {defender} with their {weapon}, dealing {damage} damage!",
  "{attacker} catches {defender} off guard with their {weapon} for {damage} damage!",
];

// Active battle challenges
const activeBattles = new Map();

module.exports = {
  name: "battle",
  description: "Challenge other users to a battle for atlyss coins",
  usage: "!battle @user [bet amount]",
  cooldown: 3 * 60 * 1000, // 3 minutes cooldown
  async execute(message, args) {
    const userId = message.author.id;

    // Check if the user is on cooldown
    const lastBattled = await db.get(`battle_${userId}`);
    const cooldownCheck = checkCooldown(lastBattled, this.cooldown);

    if (cooldownCheck.onCooldown) {
      // Create a cooldown card using embeds
      const cooldownEmbed = new EmbedBuilder()
        .setColor("#e74c3c") // Red color for cooldown
        .setAuthor({
          name: `${getDisplayName(message.member)} | Battle Cooldown`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `You're still recovering from your last battle!\nTry again in **${cooldownCheck.timeLeft}**`
        )
        .setThumbnail("https://i.imgur.com/wuDq3yU.png") // Clock/timer icon
        .setFooter({
          text: "Battle cooldown is 3 minutes",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // Parse bet amount and opponent
    const target = message.mentions.users.first();
    let betAmount = args[1] ? parseInt(args[1]) : 0;

    // Check if user provided valid opponent and bet
    if (!target) {
      return message.reply(
        "Please mention a user to battle with! Usage: `!battle @user [bet amount]`"
      );
    }

    if (target.id === userId) {
      return message.reply("You can't battle yourself!");
    }

    if (target.bot) {
      return message.reply("You can't battle bots!");
    }

    // Check and format bet amount
    if (isNaN(betAmount) || betAmount < 0) {
      betAmount = 0;
    }

    // Check if user has enough coins for the bet
    const userBalance = (await db.get(`cash_${userId}`)) || 0;
    if (betAmount > userBalance) {
      return message.reply(
        `You don't have enough atlyss coins! You only have ${formatNumber(
          userBalance
        )} coins.`
      );
    }

    // Check if target has enough coins for the bet
    const targetBalance = (await db.get(`cash_${target.id}`)) || 0;
    if (betAmount > targetBalance) {
      return message.reply(
        `${target.username} doesn't have enough atlyss coins for this bet!`
      );
    }

    // Check if target is already in a battle
    if (activeBattles.has(target.id) || activeBattles.has(userId)) {
      return message.reply(
        "Either you or your opponent is already in a battle!"
      );
    }

    // Create battle challenge
    const battleId = `${userId}-${target.id}-${Date.now()}`;
    activeBattles.set(target.id, battleId);
    activeBattles.set(userId, battleId);

    // Create battle request embed
    const battleEmbed = new EmbedBuilder()
      .setColor("#ff9900") // Orange color for battle requests
      .setTitle("⚔️ Battle Challenge!")
      .setDescription(
        `${getDisplayName(message.member)} has challenged ${
          target.username
        } to a battle!${
          betAmount > 0
            ? `\nBet Amount: **${formatNumber(betAmount)} atlyss coins**`
            : ""
        }`
      )
      .setThumbnail("https://i.imgur.com/ZrJnNDq.png") // Crossed swords icon
      .setFooter({
        text: "Battle request will expire in 60 seconds",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Create battle buttons
    const battleButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${battleId}`)
        .setLabel("Accept Battle")
        .setStyle(ButtonStyle.Success)
        .setEmoji("⚔️"),
      new ButtonBuilder()
        .setCustomId(`decline_${battleId}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    );

    // Send battle request
    const battleMsg = await message.channel.send({
      content: `<@${target.id}>, you've been challenged to a battle!`,
      embeds: [battleEmbed],
      components: [battleButtons],
    });

    // Handle battle request expiration
    setTimeout(async () => {
      if (activeBattles.has(userId) && activeBattles.get(userId) === battleId) {
        // Battle hasn't been accepted/declined yet, expire it
        activeBattles.delete(userId);
        activeBattles.delete(target.id);

        try {
          await battleMsg.edit({
            embeds: [
              battleEmbed
                .setColor("#808080") // Gray color for expired
                .setTitle("⚔️ Battle Challenge Expired")
                .setFooter({
                  text: "Battle request has expired",
                  iconURL: message.client.user.displayAvatarURL(),
                }),
            ],
            components: [],
          });
        } catch (e) {
          // Message might have been deleted, ignore
        }
      }
    }, 60000); // 60 seconds expiration

    // Create collector for button interactions
    const collector = battleMsg.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (i) => {
      // Only allow target to interact with buttons
      if (i.user.id !== target.id) {
        return i.reply({
          content: "This battle isn't for you!",
          ephemeral: true,
        });
      }

      // Handle button interactions
      if (i.customId === `accept_${battleId}`) {
        // Target accepts the challenge
        collector.stop();
        await i.update({ components: [] });
        await startBattle(
          message.channel,
          message.author,
          target,
          betAmount,
          battleId
        );
      } else if (i.customId === `decline_${battleId}`) {
        // Target declines the challenge
        collector.stop();
        activeBattles.delete(userId);
        activeBattles.delete(target.id);

        await i.update({
          embeds: [
            battleEmbed
              .setColor("#e74c3c") // Red for declined
              .setTitle("⚔️ Battle Challenge Declined")
              .setDescription(
                `${target.username} declined the battle challenge from ${message.author.username}!`
              )
              .setFooter({
                text: "Battle request was declined",
                iconURL: message.client.user.displayAvatarURL(),
              }),
          ],
          components: [],
        });
      }
    });
  },
};

// Get the user's equipped weapon
async function getUserWeapon(userId) {
  // Get the equipped weapon ID
  const equippedWeaponId = await db.get(`equippedWeapon_${userId}`);

  // If no equipped weapon, return a random default weapon
  if (!equippedWeaponId) {
    return DEFAULT_WEAPONS[Math.floor(Math.random() * DEFAULT_WEAPONS.length)];
  }

  // Get all user weapons
  const weapons = (await db.get(`weapons_${userId}`)) || {};

  // Get the specific equipped weapon
  const equippedWeapon = weapons[equippedWeaponId];

  // If weapon exists, return it, otherwise return a default weapon
  if (equippedWeapon) {
    return {
      name: equippedWeapon.name,
      damage: equippedWeapon.damage || [5, 15],
      emoji: equippedWeapon.emoji || "⚔️",
    };
  } else {
    return DEFAULT_WEAPONS[Math.floor(Math.random() * DEFAULT_WEAPONS.length)];
  }
}

// Start battle between two users
async function startBattle(channel, challenger, target, betAmount, battleId) {
  // Get display names
  const challengerMember = channel.guild.members.cache.get(challenger.id);
  const targetMember = channel.guild.members.cache.get(target.id);
  const challengerName = getDisplayName(challengerMember);
  const targetName = getDisplayName(targetMember);

  // Get user weapons (now using equipped weapons)
  const challengerWeapon = await getUserWeapon(challenger.id);
  const targetWeapon = await getUserWeapon(target.id);

  // Initialize battle stats
  const battleStats = {
    [challenger.id]: {
      name: challengerName,
      hp: 100,
      weapon: challengerWeapon,
      avatar: challenger.displayAvatarURL({ dynamic: true }),
    },
    [target.id]: {
      name: targetName,
      hp: 100,
      weapon: targetWeapon,
      avatar: target.displayAvatarURL({ dynamic: true }),
    },
  };

  // Battle announcement
  const startEmbed = new EmbedBuilder()
    .setColor("#ff9900")
    .setTitle("⚔️ Battle Started!")
    .setDescription(
      `**${challengerName}** vs **${targetName}**${
        betAmount > 0
          ? `\nBet: **${formatNumber(betAmount)} atlyss coins**`
          : ""
      }`
    )
    .addFields(
      {
        name: `${challengerName} (${battleStats[challenger.id].weapon.emoji} ${
          battleStats[challenger.id].weapon.name
        })`,
        value: `HP: ❤️ ${battleStats[challenger.id].hp}/100`,
        inline: true,
      },
      {
        name: `${targetName} (${battleStats[target.id].weapon.emoji} ${
          battleStats[target.id].weapon.name
        })`,
        value: `HP: ❤️ ${battleStats[target.id].hp}/100`,
        inline: true,
      }
    )
    .setThumbnail("https://i.imgur.com/ZrJnNDq.png");

  const battleMessage = await channel.send({ embeds: [startEmbed] });

  // Battle logic - alternate turns until someone's HP is 0
  let turn = 0;
  let battleLog = "";
  let winner = null;

  // Update battle every 1.5 seconds for dramatic effect
  const battleInterval = setInterval(async () => {
    // Determine attacker and defender
    const attackerId = turn % 2 === 0 ? challenger.id : target.id;
    const defenderId = turn % 2 === 0 ? target.id : challenger.id;

    // Calculate damage
    const attacker = battleStats[attackerId];
    const defender = battleStats[defenderId];
    const weaponDmgRange = attacker.weapon.damage;
    const damage =
      Math.floor(Math.random() * (weaponDmgRange[1] - weaponDmgRange[0] + 1)) +
      weaponDmgRange[0];

    // Apply damage
    defender.hp = Math.max(0, defender.hp - damage);

    // Generate battle log message
    const outcomeTemplate =
      BATTLE_OUTCOMES[Math.floor(Math.random() * BATTLE_OUTCOMES.length)];
    const outcomeMsg = outcomeTemplate
      .replace("{attacker}", attacker.name)
      .replace("{defender}", defender.name)
      .replace("{weapon}", attacker.weapon.name)
      .replace("{damage}", damage);

    // Add to battle log
    battleLog = `${outcomeMsg}\n${battleLog}`
      .split("\n")
      .slice(0, 3)
      .join("\n");

    // Update battle embed
    const battleEmbed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle("⚔️ Battle in Progress!")
      .setDescription(
        `**${challengerName}** vs **${targetName}**${
          betAmount > 0
            ? `\nBet: **${formatNumber(betAmount)} atlyss coins**`
            : ""
        }`
      )
      .addFields(
        {
          name: `${challengerName} (${
            battleStats[challenger.id].weapon.emoji
          } ${battleStats[challenger.id].weapon.name})`,
          value: `HP: ❤️ ${battleStats[challenger.id].hp}/100`,
          inline: true,
        },
        {
          name: `${targetName} (${battleStats[target.id].weapon.emoji} ${
            battleStats[target.id].weapon.name
          })`,
          value: `HP: ❤️ ${battleStats[target.id].hp}/100`,
          inline: true,
        },
        { name: "Battle Log", value: battleLog || "Battle is starting..." }
      )
      .setThumbnail("https://i.imgur.com/ZrJnNDq.png");

    await battleMessage.edit({ embeds: [battleEmbed] });

    // Check win condition
    if (defender.hp <= 0) {
      winner = attackerId;
      clearInterval(battleInterval);
      // Add weapon XP for winner
      await addWeaponXP(attackerId);
      await endBattle(
        channel,
        challenger.id,
        target.id,
        winner,
        battleStats,
        betAmount
      );
    }

    // Next turn
    turn++;
  }, 1500);

  // Safeguard - end battle after 15 turns max (30 seconds)
  setTimeout(() => {
    if (!winner) {
      clearInterval(battleInterval);
      // If no winner by time limit, the one with more HP wins
      winner =
        battleStats[challenger.id].hp > battleStats[target.id].hp
          ? challenger.id
          : target.id;
      // Add weapon XP for winner
      addWeaponXP(winner);
      endBattle(
        channel,
        challenger.id,
        target.id,
        winner,
        battleStats,
        betAmount
      );
    }
  }, 30000);
}

// Add XP to the winner's equipped weapon
async function addWeaponXP(userId) {
  // Get the equipped weapon ID
  const equippedWeaponId = await db.get(`equippedWeapon_${userId}`);

  // If no equipped weapon, do nothing
  if (!equippedWeaponId) return;

  // Get all user weapons
  const weapons = (await db.get(`weapons_${userId}`)) || {};

  // Get the specific equipped weapon
  const equippedWeapon = weapons[equippedWeaponId];

  // If weapon exists, add XP
  if (equippedWeapon) {
    // Initialize XP if not exists
    if (!equippedWeapon.xp) equippedWeapon.xp = 0;

    // Add random XP between 10-25
    const xpGain = Math.floor(Math.random() * 16) + 10;
    equippedWeapon.xp += xpGain;

    // Save updated weapon
    weapons[equippedWeaponId] = equippedWeapon;
    await db.set(`weapons_${userId}`, weapons);
  }
}

// End battle and distribute rewards
async function endBattle(
  channel,
  challengerId,
  targetId,
  winnerId,
  battleStats,
  betAmount
) {
  // Remove from active battles
  activeBattles.delete(challengerId);
  activeBattles.delete(targetId);

  // Set cooldown for both players
  await db.set(`battle_${challengerId}`, Date.now());
  await db.set(`battle_${targetId}`, Date.now());

  // Get names
  const challengerName = battleStats[challengerId].name;
  const targetName = battleStats[targetId].name;
  const winnerName = battleStats[winnerId].name;
  const loserId = winnerId === challengerId ? targetId : challengerId;
  const loserName = battleStats[loserId].name;

  // Handle bet amount if any
  if (betAmount > 0) {
    // Deduct from loser
    await db.subtract(`cash_${loserId}`, betAmount);
    // Add to winner
    await db.add(`cash_${winnerId}`, betAmount);
  }

  // Random bonus for winner between 50-100 coins
  const bonusCoins = Math.floor(Math.random() * 51) + 50;
  await db.add(`cash_${winnerId}`, bonusCoins);

  // Battle win count
  const winCount = (await db.get(`battleWins_${winnerId}`)) || 0;
  await db.set(`battleWins_${winnerId}`, winCount + 1);

  // Results embed
  const resultEmbed = new EmbedBuilder()
    .setColor("#00cc00") // Green for completed battle
    .setTitle("🏆 Battle Results")
    .setDescription(
      `**${winnerName}** has defeated **${loserName}** in battle!`
    )
    .addFields(
      {
        name: `${challengerName}`,
        value: `Final HP: ❤️ ${battleStats[challengerId].hp}/100`,
        inline: true,
      },
      {
        name: `${targetName}`,
        value: `Final HP: ❤️ ${battleStats[targetId].hp}/100`,
        inline: true,
      },
      {
        name: "Rewards",
        value: `**${winnerName}** wins:\n• ${formatNumber(
          bonusCoins
        )} atlyss coins bonus${
          betAmount > 0
            ? `\n• ${formatNumber(betAmount)} atlyss coins from bet`
            : ""
        }\n• Weapon XP gained!`,
      }
    )
    .setThumbnail(battleStats[winnerId].avatar)
    .setFooter({
      text: `${winnerName} now has ${winCount + 1} battle victories!`,
      iconURL: channel.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  await channel.send({ embeds: [resultEmbed] });
}
