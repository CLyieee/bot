// filepath: c:\bot\commands\dinobattle.js
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

// Rarity colors for dinosaurs
const RARITY_COLORS = {
  common: "#CCCCCC",
  uncommon: "#1ABC9C",
  rare: "#3498DB",
  legendary: "#9B59B6",
};

// Rarity emojis for dinosaurs
const RARITY_EMOJIS = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  legendary: "🟣",
};

// Tier stat multipliers
const TIER_STATS = {
  low: { hp: 100, attack: 10, defense: 5 },
  mid: { hp: 150, attack: 15, defense: 10 },
  high: { hp: 200, attack: 20, defense: 15 },
  boss: { hp: 250, attack: 25, defense: 20 },
};

// Battle actions for dinosaurs
const BATTLE_ACTIONS = [
  {
    name: "Attack",
    icon: "⚔️",
    description: "Basic attack with standard damage",
  },
  { name: "Special", icon: "✨", description: "Use dinosaur's special skill" },
  { name: "Defend", icon: "🛡️", description: "Increase defense for next turn" },
  { name: "Surrender", icon: "🏳️", description: "Give up the battle" },
];

// Battle move descriptions for the log
const BATTLE_MOVES = [
  "{attacker} charges at {defender} dealing {damage} damage!",
  "{attacker} bites {defender} for {damage} damage!",
  "{attacker} slams into {defender} causing {damage} damage!",
  "{attacker} strikes {defender} with its tail for {damage} damage!",
  "{attacker} roars and attacks {defender} for {damage} damage!",
];

// Special move descriptions
const SPECIAL_MOVES = {
  battle_attack:
    "{attacker} uses {skill} amplifying its attack and dealing {damage} damage to {defender}!",
  battle_defense:
    "{attacker} uses {skill} hardening its defenses and reducing damage taken!",
  critical_chance:
    "{attacker} uses {skill} striking a critical hit for {damage} damage!",
  damage_over_time:
    "{attacker} uses {skill} causing {defender} to take additional {dot_damage} damage over time!",
  avoid_defeat:
    "{attacker} uses {skill} and miraculously recovers {heal_amount} HP!",
  all_stats: "{attacker} uses {skill} boosting all of its stats dramatically!",
  skill_boost: "{attacker} uses {skill} enhancing all of its abilities!",
  freeze_enemy:
    "{attacker} uses {skill} freezing {defender} and preventing their next action!",
  stun_enemy: "{attacker} uses {skill} stunning {defender} for a turn!",
  titan_power:
    "{attacker} uses {skill} entering a state of unstoppable rage and dealing {damage} massive damage!",
  default: "{attacker} uses {skill} dealing {damage} damage to {defender}!",
};

// Defense move descriptions
const DEFENSE_MOVES = [
  "{defender} braces itself, reducing damage taken!",
  "{defender} takes a defensive stance!",
  "{defender} hunkers down with extra defense!",
];

// Active battles map
const activeDinoBattles = new Map();

module.exports = {
  name: "dinobattle",
  description:
    "Challenge another player to a dinosaur battle with coins at stake",
  aliases: ["dinowar", "dbattle"],
  usage: "!dinobattle @user [bet amount] [dinosaur name]",
  cooldown: 5 * 60 * 1000, // 5 minutes cooldown

  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if the user is on cooldown
    const lastBattled = await db.get(`dinobattle_${userId}`);
    const cooldownCheck = checkCooldown(lastBattled, this.cooldown);

    if (cooldownCheck.onCooldown) {
      // Create a cooldown card using embeds
      const cooldownEmbed = new EmbedBuilder()
        .setColor("#e74c3c") // Red color for cooldown
        .setAuthor({
          name: `${displayName} | Dino Battle Cooldown`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `Your dinosaur is still recovering from its last battle!\nTry again in **${cooldownCheck.timeLeft}**`
        )

        .setFooter({
          text: "Dino Battle cooldown is 5 minutes",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // Parse arguments: @user [bet amount] [dinosaur name]
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply(
        "You need to mention a user to challenge. Usage: `!dinobattle @user [bet amount] [dinosaur name]`"
      );
    }

    if (target.id === userId) {
      return message.reply("You can't battle yourself!");
    }

    if (target.bot) {
      return message.reply("You can't battle bots!");
    }

    // Parse bet amount (optional)
    let betAmount = 0;
    let dinoNameArg = "";

    // If we have more arguments, check if the next one is a number (bet)
    if (args.length > 1) {
      const potentialBet = parseInt(args[1]);
      if (!isNaN(potentialBet) && potentialBet >= 0) {
        betAmount = potentialBet;
        // If there are more args, join them as the dinosaur name
        if (args.length > 2) {
          dinoNameArg = args.slice(2).join(" ");
        }
      } else {
        // If not a valid bet, assume it's part of the dinosaur name
        dinoNameArg = args.slice(1).join(" ");
      }
    }

    // Check if user has enough coins for the bet
    const userBalance = (await db.get(`cash_${userId}`)) || 0;
    if (betAmount > userBalance) {
      return message.reply(
        `You don't have enough coins for this bet! Your balance: ${formatNumber(
          userBalance
        )} coins.`
      );
    }

    // Check if target has enough coins for the bet
    const targetBalance = (await db.get(`cash_${target.id}`)) || 0;
    if (betAmount > targetBalance) {
      return message.reply(
        `${target.username} doesn't have enough coins for this bet!`
      );
    }

    // Check if either user is already in a battle
    if (activeDinoBattles.has(target.id) || activeDinoBattles.has(userId)) {
      return message.reply(
        "Either you or your opponent is already in a dinosaur battle!"
      );
    }

    // Get user's dinosaur collection
    const userDinos = (await db.get(`dinos_${userId}`)) || {};
    if (Object.keys(userDinos).length === 0) {
      return message.reply(
        "You don't have any dinosaurs to battle with! Catch some using `!catch` first."
      );
    }

    // Get target's dinosaur collection
    const targetDinos = (await db.get(`dinos_${target.id}`)) || {};
    if (Object.keys(targetDinos).length === 0) {
      return message.reply(
        `${target.username} doesn't have any dinosaurs to battle with!`
      );
    }

    // If a specific dinosaur was specified, verify it exists in the user's collection
    let selectedDino = null;
    if (dinoNameArg) {
      // Find the dinosaur in collection (case-insensitive)
      for (const [dinoName, dinoData] of Object.entries(userDinos)) {
        if (dinoName.toLowerCase().includes(dinoNameArg.toLowerCase())) {
          selectedDino = { name: dinoName, ...dinoData };
          break;
        }
      }

      if (!selectedDino) {
        return message.reply(
          `You don't have a dinosaur named "${dinoNameArg}" in your collection.`
        );
      }
    }

    // Create battle challenge ID
    const battleId = `dino_${userId}_${target.id}_${Date.now()}`;
    activeDinoBattles.set(userId, battleId);
    activeDinoBattles.set(target.id, battleId);

    // Create battle challenge embed
    const challengeEmbed = new EmbedBuilder()
      .setColor("#ff9900") // Orange color for battle challenges
      .setTitle("🦖 Dinosaur Battle Challenge!")
      .setDescription(
        `${displayName} has challenged ${
          target.username
        } to a dinosaur battle!${
          betAmount > 0
            ? `\nBet Amount: **${formatNumber(betAmount)} coins**`
            : ""
        }${
          selectedDino
            ? `\n${displayName} will use **${selectedDino.name}** (${
                RARITY_EMOJIS[selectedDino.rarity]
              } ${
                selectedDino.rarity.charAt(0).toUpperCase() +
                selectedDino.rarity.slice(1)
              })`
            : "\nYou'll choose your dinosaur if you accept."
        }`
      )
      .setThumbnail(
        selectedDino ? selectedDino.image : "https://i.imgur.com/ZrJnNDq.png"
      )
      .setFooter({
        text: "Battle request will expire in 60 seconds",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Create battle buttons
    const battleButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${battleId}`)
        .setLabel("Accept Challenge")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🦖"),
      new ButtonBuilder()
        .setCustomId(`decline_${battleId}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    );

    // Send battle request
    const battleMsg = await message.channel.send({
      content: `<@${target.id}>, you've been challenged to a dinosaur battle!`,
      embeds: [challengeEmbed],
      components: [battleButtons],
    });

    // Handle battle request expiration
    setTimeout(async () => {
      if (
        activeDinoBattles.has(userId) &&
        activeDinoBattles.get(userId) === battleId
      ) {
        // Battle hasn't been accepted/declined yet, expire it
        activeDinoBattles.delete(userId);
        activeDinoBattles.delete(target.id);

        try {
          await battleMsg.edit({
            embeds: [
              challengeEmbed
                .setColor("#808080") // Gray color for expired
                .setTitle("🦖 Dinosaur Battle Challenge Expired")
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
          content: "This battle challenge isn't for you!",
          ephemeral: true,
        });
      }

      // Handle button interactions
      if (i.customId === `accept_${battleId}`) {
        collector.stop();
        await i.update({ components: [] });

        // If the challenger selected a dinosaur, ask the target to select one
        if (selectedDino) {
          await selectTargetDinosaur(
            message.channel,
            message.author,
            target,
            selectedDino,
            targetDinos,
            betAmount,
            battleId
          );
        } else {
          // If challenger didn't select, let both users select their dinosaurs
          await selectBothDinosaurs(
            message.channel,
            message.author,
            target,
            userDinos,
            targetDinos,
            betAmount,
            battleId
          );
        }
      } else if (i.customId === `decline_${battleId}`) {
        // Target declines the challenge
        collector.stop();
        activeDinoBattles.delete(userId);
        activeDinoBattles.delete(target.id);

        await i.update({
          embeds: [
            challengeEmbed
              .setColor("#e74c3c") // Red for declined
              .setTitle("🦖 Dinosaur Battle Challenge Declined")
              .setDescription(
                `${target.username} declined the dinosaur battle challenge from ${message.author.username}!`
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

// Helper function to select a dinosaur for the target
async function selectTargetDinosaur(
  channel,
  challenger,
  target,
  challengerDino,
  targetDinos,
  betAmount,
  battleId
) {
  const challengerMember = channel.guild.members.cache.get(challenger.id);
  const targetMember = channel.guild.members.cache.get(target.id);

  const challengerName = getDisplayName(challengerMember);
  const targetName = getDisplayName(targetMember);

  // Create selection embed
  const selectEmbed = new EmbedBuilder()
    .setColor(RARITY_COLORS[challengerDino.rarity])
    .setTitle("🦖 Select Your Dinosaur")
    .setDescription(
      `${targetName}, select a dinosaur to battle against ${challengerName}'s **${
        challengerDino.name
      }**!${
        betAmount > 0
          ? `\n\nBet amount: **${formatNumber(betAmount)} coins**`
          : ""
      }`
    )
    .setThumbnail(challengerDino.image)
    .setFooter({
      text: "You have 60 seconds to select a dinosaur",
      iconURL: channel.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Get top 5 dinosaurs from target, sorted by tier and power
  const sortedDinos = Object.entries(targetDinos)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => {
      // Sort by tier (boss > high > mid > low)
      const tierOrder = { boss: 3, high: 2, mid: 1, low: 0 };
      const tierDiff = tierOrder[b.tier || "low"] - tierOrder[a.tier || "low"];
      if (tierDiff !== 0) return tierDiff;

      // Then sort by skill power if tier is the same
      const powerA = a.skill?.power || 0;
      const powerB = b.skill?.power || 0;
      return powerB - powerA;
    })
    .slice(0, 5); // Get top 5

  // Create buttons for each dinosaur
  const dinoButtons = [];
  const rows = [];

  sortedDinos.forEach((dino, idx) => {
    const button = new ButtonBuilder()
      .setCustomId(`select_dino_${battleId}_${idx}`)
      .setLabel(
        `${dino.name} (${
          dino.rarity.charAt(0).toUpperCase() + dino.rarity.slice(1)
        })`
      )
      .setStyle(ButtonStyle.Primary)
      .setEmoji(dino.emoji);

    dinoButtons.push(button);

    // Add details to embed
    selectEmbed.addFields({
      name: `${idx + 1}. ${dino.emoji} ${dino.name}`,
      value: `**Tier:** ${
        dino.tier.charAt(0).toUpperCase() + dino.tier.slice(1)
      }\n**Rarity:** ${
        dino.rarity.charAt(0).toUpperCase() + dino.rarity.slice(1)
      }\n**Skill:** ${dino.skill ? dino.skill.name : "None"}`,
      inline: true,
    });
  });

  // Split buttons into rows (max 5 buttons per row)
  for (let i = 0; i < dinoButtons.length; i += 3) {
    const row = new ActionRowBuilder().addComponents(
      dinoButtons.slice(i, i + 3)
    );
    rows.push(row);
  }

  // Send selection message
  const selectionMsg = await channel.send({
    content: `<@${target.id}>, select your dinosaur for battle!`,
    embeds: [selectEmbed],
    components: rows,
  });

  // Create collector for dinosaur selection
  const collector = selectionMsg.createMessageComponentCollector({
    time: 60000, // 60 seconds to select
  });

  collector.on("collect", async (i) => {
    // Only allow target to select
    if (i.user.id !== target.id) {
      return i.reply({
        content: "This selection is not for you!",
        ephemeral: true,
      });
    }

    // Extract the index from the button ID
    const idParts = i.customId.split("_");
    const selectedIndex = parseInt(idParts[idParts.length - 1]);

    if (
      !isNaN(selectedIndex) &&
      selectedIndex >= 0 &&
      selectedIndex < sortedDinos.length
    ) {
      collector.stop();
      const selectedTargetDino = sortedDinos[selectedIndex];

      await i.update({ components: [] });

      // Start the actual battle
      await startDinoBattle(
        channel,
        challenger,
        target,
        challengerDino,
        selectedTargetDino,
        betAmount,
        battleId
      );
    }
  });

  // Handle selection timeout
  collector.on("end", async (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      await selectionMsg.edit({
        content: `<@${target.id}> didn't select a dinosaur in time. The battle is canceled.`,
        components: [],
      });

      // Clean up the active battle
      activeDinoBattles.delete(challenger.id);
      activeDinoBattles.delete(target.id);
    }
  });
}

// Helper function for when both users need to select dinosaurs
async function selectBothDinosaurs(
  channel,
  challenger,
  target,
  challengerDinos,
  targetDinos,
  betAmount,
  battleId
) {
  // Implementation for both users selecting dinosaurs
  // This would be similar to selectTargetDinosaur but with two parallel selection processes

  // For simplicity, we'll just pick the best dinosaurs automatically for this version
  const challengerDino = findBestDino(challengerDinos);
  const targetDino = findBestDino(targetDinos);

  // Start the battle with the automatically selected dinosaurs
  await startDinoBattle(
    channel,
    challenger,
    target,
    challengerDino,
    targetDino,
    betAmount,
    battleId
  );
}

// Find the best dinosaur in a collection based on tier and skill power
function findBestDino(dinos) {
  let bestDino = null;
  let highestScore = -1;

  for (const [name, data] of Object.entries(dinos)) {
    // Calculate score based on tier and skill power
    const tierScore = { low: 1, mid: 2, high: 3, boss: 4 }[data.tier || "low"];
    const powerScore = data.skill?.power || 0;
    const score = tierScore * 10 + powerScore;

    if (score > highestScore) {
      highestScore = score;
      bestDino = { name, ...data };
    }
  }

  return bestDino;
}

// Start the dinosaur battle
async function startDinoBattle(
  channel,
  challenger,
  target,
  challengerDino,
  targetDino,
  betAmount,
  battleId
) {
  // Get display names
  const challengerMember = channel.guild.members.cache.get(challenger.id);
  const targetMember = channel.guild.members.cache.get(target.id);

  const challengerName = getDisplayName(challengerMember);
  const targetName = getDisplayName(targetMember);

  // Calculate base stats based on dino tier
  const challengerBaseStats = TIER_STATS[challengerDino.tier || "low"];
  const targetBaseStats = TIER_STATS[targetDino.tier || "low"];

  // Initialize battle stats for both dinosaurs with level bonuses
  const battleStats = {
    [challenger.id]: {
      name: challengerName,
      dinoName: challengerDino.name,
      emoji: challengerDino.emoji,
      image: challengerDino.image,
      tier: challengerDino.tier,
      rarity: challengerDino.rarity,
      skill: challengerDino.skill,
      level: challengerDino.level || 1,
      // Apply level bonuses (5% increase per level)
      hp: Math.floor(
        challengerBaseStats.hp * (1 + ((challengerDino.level || 1) - 1) * 0.05)
      ),
      maxHp: Math.floor(
        challengerBaseStats.hp * (1 + ((challengerDino.level || 1) - 1) * 0.05)
      ),
      attack: Math.floor(
        challengerBaseStats.attack *
          (1 + ((challengerDino.level || 1) - 1) * 0.05)
      ),
      defense: Math.floor(
        challengerBaseStats.defense *
          (1 + ((challengerDino.level || 1) - 1) * 0.05)
      ),
      isDefending: false,
      statusEffects: [],
    },
    [target.id]: {
      name: targetName,
      dinoName: targetDino.name,
      emoji: targetDino.emoji,
      image: targetDino.image,
      tier: targetDino.tier,
      rarity: targetDino.rarity,
      skill: targetDino.skill,
      level: targetDino.level || 1,
      // Apply level bonuses (5% increase per level)
      hp: Math.floor(
        targetBaseStats.hp * (1 + ((targetDino.level || 1) - 1) * 0.05)
      ),
      maxHp: Math.floor(
        targetBaseStats.hp * (1 + ((targetDino.level || 1) - 1) * 0.05)
      ),
      attack: Math.floor(
        targetBaseStats.attack * (1 + ((targetDino.level || 1) - 1) * 0.05)
      ),
      defense: Math.floor(
        targetBaseStats.defense * (1 + ((targetDino.level || 1) - 1) * 0.05)
      ),
      isDefending: false,
      statusEffects: [],
    },
  };

  // Apply skill bonuses to stats
  applySkillBonusesToStats(battleStats[challenger.id]);
  applySkillBonusesToStats(battleStats[target.id]);

  // Battle announcement with dinosaur stats
  const startEmbed = new EmbedBuilder()
    .setColor("#ff9900")
    .setTitle("🦖 Dinosaur Battle Started!")
    .setDescription(
      `**${challengerName}'s ${challengerDino.emoji} ${
        challengerDino.name
      }** vs **${targetName}'s ${targetDino.emoji} ${targetDino.name}**${
        betAmount > 0 ? `\n\nBet: **${formatNumber(betAmount)} coins**` : ""
      }`
    )
    .addFields(
      {
        name: `${challengerDino.emoji} ${challengerDino.name} (Lvl ${
          battleStats[challenger.id].level
        }) ${
          battleStats[challenger.id].skill
            ? battleStats[challenger.id].skill.name
            : "No Skill"
        }`,
        value: `HP: ❤️ ${battleStats[challenger.id].hp}/${
          battleStats[challenger.id].maxHp
        }\nAttack: ⚔️ ${battleStats[challenger.id].attack}\nDefense: 🛡️ ${
          battleStats[challenger.id].defense
        }`,
        inline: true,
      },
      {
        name: `${targetDino.emoji} ${targetDino.name} (Lvl ${
          battleStats[target.id].level
        }) ${
          battleStats[target.id].skill
            ? battleStats[target.id].skill.name
            : "No Skill"
        }`,
        value: `HP: ❤️ ${battleStats[target.id].hp}/${
          battleStats[target.id].maxHp
        }\nAttack: ⚔️ ${battleStats[target.id].attack}\nDefense: 🛡️ ${
          battleStats[target.id].defense
        }`,
        inline: true,
      }
    )
    .setImage("https://i.imgur.com/kXwIW0U.png") // Battle arena image
    .setFooter({
      text: "The battle is about to begin!",
      iconURL: channel.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  const battleMessage = await channel.send({ embeds: [startEmbed] });

  // Add a short delay for dramatic effect
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Battle loop
  let turn = 0;
  let currentTurnPlayer = challenger.id; // Challenger goes first
  let otherPlayer = target.id;
  let battleLogs = [];
  let winner = null;

  while (!winner) {
    const attacker = battleStats[currentTurnPlayer];
    const defender = battleStats[otherPlayer];

    // Check status effects (like freeze/stun) - skip turn if applicable
    if (
      attacker.statusEffects.includes("frozen") ||
      attacker.statusEffects.includes("stunned")
    ) {
      // Remove the effect after it applies
      attacker.statusEffects = attacker.statusEffects.filter(
        (e) => e !== "frozen" && e !== "stunned"
      );

      // Log that player's turn was skipped
      battleLogs.push(
        `${attacker.emoji} ${attacker.dinoName} is unable to move this turn!`
      );

      // Show updated battle status
      await updateBattleStatus(
        battleMessage,
        battleStats,
        challenger.id,
        target.id,
        battleLogs,
        currentTurnPlayer
      );

      // Switch to other player's turn
      [currentTurnPlayer, otherPlayer] = [otherPlayer, currentTurnPlayer];
      turn++;

      // Small delay between turns
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    // Create battle action buttons - true indicates it's the current player's turn (buttons enabled)
    const actionButtons = createActionButtons(battleId, turn, true);

    // Update message with action buttons
    const actionEmbed = new EmbedBuilder()
      .setColor(RARITY_COLORS[attacker.rarity])
      .setTitle(`🎮 ${attacker.name}'s Turn`)
      .setDescription(
        `${attacker.emoji} Select an action for your ${attacker.dinoName}:`
      )
      .addFields(
        {
          name: `${attacker.emoji} ${attacker.dinoName} (${attacker.name}) ${
            currentTurnPlayer === challenger.id ? "⭐ YOUR TURN" : ""
          }`,
          value: `HP: ❤️ ${attacker.hp}/${attacker.maxHp}\nAttack: ⚔️ ${attacker.attack}\nDefense: 🛡️ ${attacker.defense}`,
          inline: true,
        },
        {
          name: `${defender.emoji} ${defender.dinoName} (${defender.name}) ${
            currentTurnPlayer === target.id ? "⭐ YOUR TURN" : ""
          }`,
          value: `HP: ❤️ ${defender.hp}/${defender.maxHp}\nAttack: ⚔️ ${defender.attack}\nDefense: 🛡️ ${defender.defense}`,
          inline: true,
        }
      );

    // Add battle logs to the embed
    if (battleLogs.length > 0) {
      actionEmbed.addFields({
        name: "Battle Log",
        value: battleLogs.slice(-3).join("\n"),
      });
    }

    // Add a clear turn indicator
    actionEmbed.setFooter({
      text: `Turn ${turn + 1}: ${attacker.name}'s turn to act`,
      iconURL: channel.client.user.displayAvatarURL(),
    });

    await battleMessage.edit({
      embeds: [actionEmbed],
      components: [actionButtons],
    });

    // Wait for player's action selection
    let selectedAction;
    try {
      selectedAction = await collectAction(
        battleMessage,
        currentTurnPlayer,
        battleId,
        turn
      );
    } catch (error) {
      // If no action selected, default to "Attack"
      selectedAction = "Attack";
      battleLogs.push(
        `${attacker.emoji} ${attacker.dinoName} attacks by default (no action selected in time).`
      );
    }

    // Process the selected action
    const actionResult = processAction(
      selectedAction,
      attacker,
      defender,
      battleLogs
    );

    // Update battle logs
    battleLogs = actionResult.logs;

    // Handle surrender
    if (actionResult.surrender) {
      winner = otherPlayer; // Other player wins if current player surrenders
      break;
    }

    // Update battle status
    await updateBattleStatus(
      battleMessage,
      battleStats,
      challenger.id,
      target.id,
      battleLogs,
      currentTurnPlayer
    );

    // Check if battle has a winner
    if (defender.hp <= 0) {
      winner = currentTurnPlayer;
      break;
    }

    // Reset defending status from previous turn
    if (attacker.isDefending) {
      attacker.defense = Math.max(
        attacker.defense - Math.floor(attacker.defense * 0.5),
        TIER_STATS[attacker.tier].defense
      );
      attacker.isDefending = false;
    }

    // Apply damage over time effects if any
    if (defender.statusEffects.includes("dot")) {
      const dotDamage = Math.floor(attacker.attack * 0.2);
      defender.hp = Math.max(0, defender.hp - dotDamage);
      battleLogs.push(
        `${defender.emoji} ${defender.dinoName} takes ${dotDamage} damage from continuing effects!`
      );

      // Update battle status again after DoT
      await updateBattleStatus(
        battleMessage,
        battleStats,
        challenger.id,
        target.id,
        battleLogs,
        currentTurnPlayer
      );

      // Check if DoT caused a win
      if (defender.hp <= 0) {
        winner = currentTurnPlayer;
        break;
      }
    }

    // Switch to other player's turn
    [currentTurnPlayer, otherPlayer] = [otherPlayer, currentTurnPlayer];
    turn++;

    // Fail-safe to prevent infinite battles
    if (turn >= 20) {
      winner = challenger.id; // Challenger wins in case of a draw
      break;
    }

    // Small delay between turns
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Battle ended, declare winner
  await endDinoBattle(
    channel,
    challenger.id,
    target.id,
    winner,
    battleStats,
    betAmount,
    battleMessage,
    battleLogs
  );
}

// Apply skill bonuses to dinosaur stats
function applySkillBonusesToStats(dinoStats) {
  if (!dinoStats.skill) return;

  const skill = dinoStats.skill;

  switch (skill.effect) {
    case "battle_attack":
      dinoStats.attack += Math.floor(dinoStats.attack * (skill.power / 100));
      break;
    case "battle_defense":
      dinoStats.defense += Math.floor(dinoStats.defense * (skill.power / 100));
      break;
    case "battle_all":
      dinoStats.attack += Math.floor(dinoStats.attack * (skill.power / 200));
      dinoStats.defense += Math.floor(dinoStats.defense * (skill.power / 200));
      break;
    case "all_stats":
      dinoStats.attack += Math.floor(dinoStats.attack * (skill.power / 100));
      dinoStats.defense += Math.floor(dinoStats.defense * (skill.power / 100));
      dinoStats.maxHp += Math.floor(dinoStats.maxHp * (skill.power / 100));
      dinoStats.hp = dinoStats.maxHp;
      break;
    case "skill_boost":
      dinoStats.attack += Math.floor(dinoStats.attack * (skill.power / 150));
      dinoStats.defense += Math.floor(dinoStats.defense * (skill.power / 150));
      break;
    case "titan_power":
      dinoStats.attack += Math.floor(dinoStats.attack * (skill.power / 80));
      dinoStats.defense += Math.floor(dinoStats.defense * (skill.power / 100));
      break;
  }
}

// Create action buttons for battle
function createActionButtons(battleId, turn, isUserTurn = true) {
  const buttons = BATTLE_ACTIONS.map(
    (action) =>
      new ButtonBuilder()
        .setCustomId(`${action.name.toLowerCase()}_${battleId}_${turn}`)
        .setLabel(action.name)
        .setStyle(
          action.name === "Attack"
            ? ButtonStyle.Danger
            : action.name === "Special"
            ? ButtonStyle.Primary
            : action.name === "Surrender"
            ? ButtonStyle.Secondary
            : ButtonStyle.Success
        )
        .setEmoji(action.icon)
        .setDisabled(!isUserTurn) // Disable buttons if it's not the user's turn
  );

  return new ActionRowBuilder().addComponents(buttons);
}

// Collect player's action selection
async function collectAction(message, playerId, battleId, turn) {
  return new Promise((resolve, reject) => {
    const collector = message.createMessageComponentCollector({
      filter: (i) =>
        i.user.id === playerId &&
        i.customId.includes(battleId) &&
        i.customId.includes(`_${turn}`),
      time: 15000, // 15 seconds to select an action
      max: 1,
    });

    collector.on("collect", (i) => {
      const action = i.customId.split("_")[0];
      i.update({ components: [] });
      resolve(action);
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        reject("No action selected");
      }
    });
  });
}

// Process the selected action
function processAction(action, attacker, defender, logs) {
  switch (action) {
    case "attack":
      return handleAttack(attacker, defender, logs);
    case "special":
      return handleSpecial(attacker, defender, logs);
    case "defend":
      return handleDefend(attacker, logs);
    case "surrender":
      return handleSurrender(attacker, defender, logs);
    default:
      return handleAttack(attacker, defender, logs);
  }
}

// Handle surrender action
function handleSurrender(attacker, defender, logs) {
  // Set attacker HP to 0 to end the battle
  attacker.hp = 0;

  // Add surrender message to logs
  logs.push(`${attacker.emoji} ${attacker.dinoName} surrenders the battle!`);

  return { logs, surrender: true };
}

// Handle basic attack action
function handleAttack(attacker, defender, logs) {
  // Calculate base damage based on dinosaur characteristics
  const rarityMultiplier = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.4,
    legendary: 1.8,
  };

  const tierMultiplier = {
    low: 1.0,
    mid: 1.3,
    high: 1.6,
    boss: 2.0,
  };

  // Calculate base damage using rarity and tier
  const baseDamage =
    attacker.attack *
    rarityMultiplier[attacker.rarity] *
    tierMultiplier[attacker.tier];

  // Apply random variation (±20%)
  const variation = Math.random() * 0.4 - 0.2;

  // Apply defense reduction
  const defenseReduction = defender.isDefending ? 0.5 : 0.25;

  // Calculate final damage
  let damage = Math.floor(
    baseDamage *
      (1 + variation) *
      (1 - defenseReduction * (defender.defense / 100))
  );

  // Ensure minimum damage of 1
  damage = Math.max(1, damage);

  // Apply damage to defender
  defender.hp = Math.max(0, defender.hp - damage);

  // Get a random attack message
  const attackMessage = BATTLE_MOVES[
    Math.floor(Math.random() * BATTLE_MOVES.length)
  ]
    .replace("{attacker}", `${attacker.emoji} ${attacker.dinoName}`)
    .replace("{defender}", `${defender.emoji} ${defender.dinoName}`)
    .replace("{damage}", damage);

  logs.push(attackMessage);

  return { logs };
}

// Handle special ability action
function handleSpecial(attacker, defender, logs) {
  // If no skill, default to normal attack
  if (!attacker.skill) {
    return handleAttack(attacker, defender, logs);
  }

  const skill = attacker.skill;

  // Calculate skill-based damage or effect
  let damage = 0;
  let specialMessage = "";

  // Apply rarity and tier multipliers for damage calculations
  const rarityMultiplier = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.4,
    legendary: 1.8,
  };

  const tierMultiplier = {
    low: 1.0,
    mid: 1.3,
    high: 1.6,
    boss: 2.0,
  };

  switch (skill.effect) {
    case "battle_attack":
      // Enhanced attack (+ skill.power %) with rarity/tier multipliers
      damage = Math.floor(
        attacker.attack *
          (1 + skill.power / 100) *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    case "battle_defense":
      // Enhanced defense
      attacker.defense += Math.floor(attacker.defense * (skill.power / 100));
      attacker.isDefending = true;
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    case "critical_chance":
      // Chance for critical hit
      if (Math.random() < skill.power / 100) {
        damage = Math.floor(
          attacker.attack *
            2 *
            rarityMultiplier[attacker.rarity] *
            tierMultiplier[attacker.tier]
        );
        defender.hp = Math.max(0, defender.hp - damage);
        specialMessage = SPECIAL_MOVES[skill.effect];
      } else {
        return handleAttack(attacker, defender, logs);
      }
      break;

    case "damage_over_time":
      // Apply damage over time effect
      damage = Math.floor(
        attacker.attack *
          0.8 *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      defender.statusEffects.push("dot");
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    case "avoid_defeat":
      // Chance to heal when low HP
      if (
        attacker.hp < attacker.maxHp * 0.3 &&
        Math.random() < skill.power / 100
      ) {
        const healAmount = Math.floor(attacker.maxHp * 0.3);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
        specialMessage = SPECIAL_MOVES[skill.effect].replace(
          "{heal_amount}",
          healAmount
        );
      } else {
        return handleAttack(attacker, defender, logs);
      }
      break;

    case "all_stats":
      // Boost all stats
      attacker.attack += Math.floor(attacker.attack * (skill.power / 200));
      attacker.defense += Math.floor(attacker.defense * (skill.power / 200));
      damage = Math.floor(
        attacker.attack *
          1.2 *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    case "skill_boost":
      // Skill boost
      attacker.attack += Math.floor(attacker.attack * (skill.power / 200));
      damage = Math.floor(
        attacker.attack *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    case "freeze_enemy":
      // Chance to freeze enemy
      damage = Math.floor(
        attacker.attack *
          0.6 *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      if (Math.random() < skill.power / 100) {
        defender.statusEffects.push("frozen");
      }
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    case "stun_enemy":
      // Chance to stun enemy
      damage = Math.floor(
        attacker.attack *
          0.6 *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      if (Math.random() < skill.power / 100) {
        defender.statusEffects.push("stunned");
      }
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    case "titan_power":
      // Massive attack with rarity/tier multipliers
      damage = Math.floor(
        attacker.attack *
          1.5 *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      specialMessage = SPECIAL_MOVES[skill.effect];
      break;

    default:
      // Default skill just does more damage with rarity/tier multipliers
      damage = Math.floor(
        attacker.attack *
          1.3 *
          rarityMultiplier[attacker.rarity] *
          tierMultiplier[attacker.tier]
      );
      defender.hp = Math.max(0, defender.hp - damage);
      specialMessage = SPECIAL_MOVES.default;
  }

  // Format special move message
  const formattedMessage = specialMessage
    .replace("{attacker}", `${attacker.emoji} ${attacker.dinoName}`)
    .replace("{defender}", `${defender.emoji} ${defender.dinoName}`)
    .replace("{skill}", `**${skill.name}**`)
    .replace("{damage}", damage)
    .replace("{dot_damage}", Math.floor(attacker.attack * 0.2));

  logs.push(formattedMessage);

  return { logs };
}

// Handle defend action
function handleDefend(attacker, logs) {
  // Increase defense temporarily
  attacker.isDefending = true;
  const defenseBoost = Math.floor(attacker.defense * 0.5);
  attacker.defense += defenseBoost;

  // Get a random defense message
  const defenseMessage = DEFENSE_MOVES[
    Math.floor(Math.random() * DEFENSE_MOVES.length)
  ].replace("{defender}", `${attacker.emoji} ${attacker.dinoName}`);

  logs.push(defenseMessage);

  return { logs };
}

// Update battle status after an action
async function updateBattleStatus(
  message,
  battleStats,
  challengerId,
  targetId,
  battleLogs,
  currentTurnPlayer
) {
  const challenger = battleStats[challengerId];
  const target = battleStats[targetId];

  // Create HP bars
  const challengerHpPercent = Math.max(
    0,
    (challenger.hp / challenger.maxHp) * 100
  );
  const targetHpPercent = Math.max(0, (target.hp / target.maxHp) * 100);

  const challengerHpBar = createHpBar(challengerHpPercent);
  const targetHpBar = createHpBar(targetHpPercent);

  // Determine which player's turn it is for highlighting
  const challengerTurnIndicator =
    currentTurnPlayer === challengerId ? "⭐ CURRENT TURN" : "";
  const targetTurnIndicator =
    currentTurnPlayer === targetId ? "⭐ CURRENT TURN" : "";

  const battleEmbed = new EmbedBuilder()
    .setColor("#ff9900")
    .setTitle("🦖 Dinosaur Battle")
    .addFields(
      {
        name: `${challenger.emoji} ${challenger.dinoName} (${challenger.name}) ${challengerTurnIndicator}`,
        value: `HP: ${challengerHpBar} ${challenger.hp}/${
          challenger.maxHp
        }\nAttack: ⚔️ ${challenger.attack}\nDefense: 🛡️ ${challenger.defense}${
          challenger.isDefending ? " (Defending)" : ""
        }${
          challenger.statusEffects.length > 0
            ? `\nStatus: ${formatStatusEffects(challenger.statusEffects)}`
            : ""
        }`,
        inline: false,
      },
      {
        name: `${target.emoji} ${target.dinoName} (${target.name}) ${targetTurnIndicator}`,
        value: `HP: ${targetHpBar} ${target.hp}/${target.maxHp}\nAttack: ⚔️ ${
          target.attack
        }\nDefense: 🛡️ ${target.defense}${
          target.isDefending ? " (Defending)" : ""
        }${
          target.statusEffects.length > 0
            ? `\nStatus: ${formatStatusEffects(target.statusEffects)}`
            : ""
        }`,
        inline: false,
      }
    );

  // Add battle logs to the embed
  if (battleLogs.length > 0) {
    battleEmbed.addFields({
      name: "Battle Log",
      value: battleLogs.slice(-3).join("\n"),
    });
  }

  // Add turn indicator in the footer
  if (currentTurnPlayer) {
    const currentPlayer =
      currentTurnPlayer === challengerId ? challenger : target;
    battleEmbed.setFooter({
      text: `${currentPlayer.name}'s turn to act`,
      iconURL: message.client.user.displayAvatarURL(),
    });
  }

  await message.edit({
    embeds: [battleEmbed],
    components: [],
  });
}

// Create HP bar with emojis
function createHpBar(percent) {
  const fullBlocks = Math.floor(percent / 10);
  let hpBar = "";

  if (percent > 60) {
    hpBar = "🟩".repeat(fullBlocks);
  } else if (percent > 30) {
    hpBar = "🟨".repeat(fullBlocks);
  } else {
    hpBar = "🟥".repeat(fullBlocks);
  }

  hpBar += "⬜".repeat(10 - fullBlocks);

  return hpBar;
}

// Format status effects for display
function formatStatusEffects(effects) {
  const statusIcons = {
    frozen: "❄️ Frozen",
    stunned: "💫 Stunned",
    dot: "☣️ Bleeding",
  };

  return effects.map((effect) => statusIcons[effect] || effect).join(", ");
}

// End the dinosaur battle
async function endDinoBattle(
  channel,
  challengerId,
  targetId,
  winnerId,
  battleStats,
  betAmount,
  battleMessage,
  battleLogs
) {
  // Remove from active battles
  activeDinoBattles.delete(challengerId);
  activeDinoBattles.delete(targetId);

  // Set cooldown for both players
  await db.set(`dinobattle_${challengerId}`, Date.now());
  await db.set(`dinobattle_${targetId}`, Date.now());

  // Determine winner and loser
  const winner = battleStats[winnerId];
  const loserId = winnerId === challengerId ? targetId : challengerId;
  const loser = battleStats[loserId];

  // 15% chance that the losing dinosaur dies (except on surrenders)
  const dinoDeathChance = 0.15;
  let dinoIsDead = false;

  if (
    !battleLogs[battleLogs.length - 1].includes("surrenders") &&
    Math.random() < dinoDeathChance
  ) {
    // Get the loser's dinosaur collection
    const loserDinos = (await db.get(`dinos_${loserId}`)) || {};

    // Check if the dinosaur exists in their collection
    if (loserDinos[loser.dinoName]) {
      // Store the dead dinosaur for possible revival
      const deadDinos = (await db.get(`dead_dinos_${loserId}`)) || [];

      // Create a copy of the dinosaur with all its properties
      const deadDino = {
        name: loser.dinoName,
        emoji: loser.emoji,
        rarity: loser.rarity,
        tier: loser.tier,
        level: loser.level || 1,
        stats: loserDinos[loser.dinoName].stats || null,
        skill: loserDinos[loser.dinoName].skill || null,
        deathTimestamp: Date.now(),
      };

      // Add to dead dinos list
      deadDinos.push(deadDino);
      await db.set(`dead_dinos_${loserId}`, deadDinos);

      // Remove from active collection
      delete loserDinos[loser.dinoName];
      await db.set(`dinos_${loserId}`, loserDinos);
      dinoIsDead = true;
    }
  }

  // Handle bet amount if any
  if (betAmount > 0) {
    // Deduct from loser
    await db.subtract(`cash_${loserId}`, betAmount);
    // Add to winner
    await db.add(`cash_${winnerId}`, betAmount);
  }

  // Add bonus XP to the winning dinosaur
  await addDinosaurXP(winnerId, winner.dinoName);

  // Track battle win count
  const winCount = (await db.get(`dinoBattleWins_${winnerId}`)) || 0;
  await db.set(`dinoBattleWins_${winnerId}`, winCount + 1);

  // Results embed
  const resultEmbed = new EmbedBuilder()
    .setColor(dinoIsDead ? "#ff0000" : "#00cc00") // Red if dino died, Green for normal completion
    .setTitle(
      dinoIsDead
        ? "☠️ Dinosaur Battle - FATAL DEFEAT!"
        : "🏆 Dinosaur Battle Results"
    )
    .setDescription(
      `**${winner.name}'s ${winner.emoji} ${winner.dinoName}** has ${
        battleLogs[battleLogs.length - 1].includes("surrenders")
          ? "won by forfeit against"
          : "defeated"
      } **${loser.name}'s ${loser.emoji} ${loser.dinoName}** in battle!${
        dinoIsDead
          ? `\n\n☠️ **${loser.dinoName} has died from its wounds and has been removed from ${loser.name}'s collection!**`
          : ""
      }`
    )
    .addFields(
      {
        name: `${winner.emoji} ${winner.dinoName} (Lvl ${winner.level})`,
        value: `HP: ❤️ ${winner.hp}/${winner.maxHp}`,
        inline: true,
      },
      {
        name: `${loser.emoji} ${loser.dinoName} ${
          dinoIsDead ? "☠️" : ""
        } (Lvl ${loser.level})`,
        value: `HP: ❤️ ${loser.hp}/${loser.maxHp}`,
        inline: true,
      }
    );

  // Add rewards section
  resultEmbed.addFields({
    name: "Results",
    value: `**${winner.name}** wins:${
      betAmount > 0 ? `\n• ${formatNumber(betAmount)} coins from the bet` : ""
    }\n• XP for ${winner.dinoName}!\n• Battle victory added to their record!
    
**${loser.name}**:${
      betAmount > 0 ? `\n• Lost ${formatNumber(betAmount)} coins` : ""
    }${dinoIsDead ? `\n• ☠️ Lost ${loser.dinoName} permanently!` : ""}`,
  });

  // Add battle recap if there are logs
  if (battleLogs.length > 0) {
    resultEmbed.addFields({
      name: "Winning Move",
      value: battleLogs[battleLogs.length - 1],
    });
  }

  resultEmbed
    .setImage(winner.image)
    .setFooter({
      text: `${winner.name} now has ${winCount + 1} dino battle victories!`,
      iconURL: channel.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  await battleMessage.edit({ embeds: [resultEmbed], components: [] });
}

// Add XP to the winning dinosaur
async function addDinosaurXP(userId, dinoName) {
  // Get dinosaur collection
  const collection = (await db.get(`dinos_${userId}`)) || {};

  // Find the dinosaur
  if (collection[dinoName]) {
    // Initialize XP and level if not exists
    if (!collection[dinoName].xp) collection[dinoName].xp = 0;
    if (!collection[dinoName].level) collection[dinoName].level = 1;

    // Initialize base stats if they don't exist
    if (!collection[dinoName].baseStats) {
      const baseTierStats = TIER_STATS[collection[dinoName].tier || "low"];
      collection[dinoName].baseStats = {
        hp: baseTierStats.hp,
        attack: baseTierStats.attack,
        defense: baseTierStats.defense,
      };
    }

    // Add random XP between 10-30
    const xpGain = Math.floor(Math.random() * 21) + 10;
    collection[dinoName].xp += xpGain;

    // Check for level up (every 100 XP)
    if (collection[dinoName].xp >= collection[dinoName].level * 100) {
      const oldLevel = collection[dinoName].level;
      collection[dinoName].level++;

      // Calculate and store new stats based on level increase (5% per level)
      const baseStats = collection[dinoName].baseStats;

      // Apply stat increases for the new level
      if (!collection[dinoName].stats) {
        collection[dinoName].stats = {};
      }

      collection[dinoName].stats = {
        hp: Math.floor(
          baseStats.hp * (1 + (collection[dinoName].level - 1) * 0.05)
        ),
        attack: Math.floor(
          baseStats.attack * (1 + (collection[dinoName].level - 1) * 0.05)
        ),
        defense: Math.floor(
          baseStats.defense * (1 + (collection[dinoName].level - 1) * 0.05)
        ),
      };

      // Improve skill power on level up if there's a skill
      if (collection[dinoName].skill) {
        // Increase skill power by 1 (up to max 30)
        collection[dinoName].skill.power = Math.min(
          30,
          collection[dinoName].skill.power + 1
        );
      }

      // Log level up information for the player later (could be displayed in a separate command)
      if (!collection[dinoName].levelUps) {
        collection[dinoName].levelUps = [];
      }

      collection[dinoName].levelUps.push({
        timestamp: Date.now(),
        fromLevel: oldLevel,
        toLevel: collection[dinoName].level,
        xpGained: xpGain,
        statIncrease: {
          hp:
            collection[dinoName].stats.hp -
            Math.floor(baseStats.hp * (1 + (oldLevel - 1) * 0.05)),
          attack:
            collection[dinoName].stats.attack -
            Math.floor(baseStats.attack * (1 + (oldLevel - 1) * 0.05)),
          defense:
            collection[dinoName].stats.defense -
            Math.floor(baseStats.defense * (1 + (oldLevel - 1) * 0.05)),
        },
      });
    }

    // Save updated collection
    await db.set(`dinos_${userId}`, collection);

    // Return level up info if applicable
    return {
      xpGained: xpGain,
      leveledUp:
        collection[dinoName].xp >= (collection[dinoName].level - 1) * 100,
      currentLevel: collection[dinoName].level,
      xpToNextLevel: collection[dinoName].level * 100 - collection[dinoName].xp,
    };
  }

  return null; // Dinosaur not found
}
