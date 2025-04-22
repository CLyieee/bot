// filepath: c:\bot\commands\use.js
const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Items that can be used with their effects
const USABLE_ITEMS = {
  narcoberry: {
    name: "Narcoberries",
    emoji: "🫐",
    description: "Increases chance to catch dinosaurs by 10% for 15 minutes",
    duration: 15 * 60 * 1000, // 15 minutes
    effect: {
      type: "catch_rate",
      value: 10, // 10% boost
    },
  },
  kibble: {
    name: "Exceptional Kibble",
    emoji: "🥩",
    description: "Increases chance to catch dinosaurs by 15% for 20 minutes",
    duration: 20 * 60 * 1000, // 20 minutes
    effect: {
      type: "catch_rate",
      value: 15, // 15% boost
    },
  },
  tranq_dart: {
    name: "Tranq Dart",
    emoji: "💉",
    description:
      "Increases chance to catch rare dinosaurs by 20% for 10 minutes",
    duration: 10 * 60 * 1000, // 10 minutes
    effect: {
      type: "rare_catch_rate",
      value: 20, // 20% boost for rare dinos
    },
  },
  tranq_arrow: {
    name: "Tranq Arrow",
    emoji: "🏹",
    description: "Increases chance to catch dinosaurs by 12% for 15 minutes",
    duration: 15 * 60 * 1000, // 15 minutes
    effect: {
      type: "catch_rate",
      value: 12, // 12% boost
    },
  },
  shocking_tranq_dart: {
    name: "Shocking Tranq Dart",
    emoji: "⚡",
    description:
      "Increases chance to catch high tier dinosaurs by 25% for 10 minutes",
    duration: 10 * 60 * 1000, // 10 minutes
    effect: {
      type: "high_tier_catch_rate",
      value: 25, // 25% boost for high/boss tiers
    },
  },
  rare_flower: {
    name: "Rare Flower",
    emoji: "🌸",
    description:
      "Increases chance to catch rare and legendary dinosaurs by 18% for 15 minutes",
    duration: 15 * 60 * 1000, // 15 minutes
    effect: {
      type: "rare_catch_rate",
      value: 18, // 18% boost for rare/legendary
    },
  },
  biotoxin: {
    name: "Biotoxin",
    emoji: "☣️",
    description:
      "Increases chance to catch boss tier dinosaurs by 30% for 10 minutes",
    duration: 10 * 60 * 1000, // 10 minutes
    effect: {
      type: "boss_catch_rate",
      value: 30, // 30% boost for boss tier
    },
  },
  element: {
    name: "Element",
    emoji: "💠",
    description:
      "Increases chance to catch all dinosaurs by 20% for 30 minutes",
    duration: 30 * 60 * 1000, // 30 minutes
    effect: {
      type: "catch_rate",
      value: 20, // 20% boost for all dinos
    },
  },
  tek_rifle: {
    name: "Tek Rifle",
    emoji: "🔫",
    description: "Guarantees your next catch attempt will be successful",
    duration: 1, // One-time use
    effect: {
      type: "guaranteed_catch",
      value: 1, // Guarantees 1 catch
    },
  },
  // Premium Items
  tek_saddle: {
    name: "TEK Saddle",
    emoji: "🛡️",
    description:
      "Provides a 30% defense boost to your dinosaur in battles for 5 battles",
    duration: 5,
    effect: {
      type: "battle_defense",
      value: 30,
    },
  },
  tek_transmitter: {
    name: "TEK Transmitter",
    emoji: "📡",
    description:
      "Allows you to see what dinosaur your opponent will use in battle before choosing yours",
    duration: 3,
    effect: {
      type: "battle_insight",
      value: 3,
    },
  },
  cryofridge: {
    name: "Cryofridge",
    emoji: "❄️",
    description:
      "Store up to 3 dinosaurs that won't be affected by battle deaths (protects for 7 days)",
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days
    effect: {
      type: "death_prevention",
      value: 3,
    },
    // Special handling for cryofridge
    special: true,
    handler: async (message, userId, displayName) => {
      // Get current cryofridge data
      const cryofridge = (await db.get(`cryofridge_${userId}`)) || {
        dinosaurs: [],
      };

      // Check if this is the first time using the cryofridge
      if (!cryofridge.expires || cryofridge.expires < Date.now()) {
        cryofridge.expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        cryofridge.dinosaurs = cryofridge.dinosaurs || [];
      }

      // Show options
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("❄️ Cryofridge")
        .setDescription(
          `${displayName}'s Cryofridge (Expires <t:${Math.floor(
            cryofridge.expires / 1000
          )}:R>)`
        )
        .addFields({
          name: "Storage Status",
          value: `${cryofridge.dinosaurs.length}/3 slots used`,
          inline: false,
        });

      // Add stored dinosaurs if any
      if (cryofridge.dinosaurs.length > 0) {
        const storedDinos = cryofridge.dinosaurs
          .map(
            (dino, index) =>
              `${index + 1}. ${dino.emoji} **${dino.name}** (Lvl ${
                dino.level || 1
              }) - ${dino.rarity}`
          )
          .join("\n");
        embed.addFields({
          name: "Stored Dinosaurs",
          value: storedDinos,
          inline: false,
        });
      } else {
        embed.addFields({
          name: "Stored Dinosaurs",
          value: "*No dinosaurs currently stored*",
          inline: false,
        });
      }

      embed.addFields({
        name: "Options",
        value:
          "Reply with:\n- `store [dinosaur name]` to store a dinosaur\n- `retrieve [number]` to retrieve a stored dinosaur\n- `cancel` to exit",
        inline: false,
      });

      const promptMsg = await message.channel.send({ embeds: [embed] });

      // Set up collector for user response
      const filter = (m) => m.author.id === userId;
      const collector = message.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1,
      });

      collector.on("collect", async (msg) => {
        const response = msg.content.toLowerCase().trim();

        // Handle cancel
        if (response === "cancel") {
          return msg.reply("❌ Cryofridge operation cancelled.");
        }

        // Handle store command
        if (response.startsWith("store ")) {
          // Check if cryofridge is full
          if (cryofridge.dinosaurs.length >= 3) {
            return msg.reply(
              "❌ Your cryofridge is full! Retrieve a dinosaur first."
            );
          }

          const dinoName = response.substring(6).trim();
          const collection = (await db.get(`dinos_${userId}`)) || {};

          // Find the dinosaur to store (case-insensitive partial match)
          let foundDinoName = null;

          for (const [name, _] of Object.entries(collection)) {
            if (name.toLowerCase().includes(dinoName.toLowerCase())) {
              foundDinoName = name;
              break;
            }
          }

          if (!foundDinoName) {
            return msg.reply(
              `You don't have a dinosaur named "${dinoName}" in your collection.`
            );
          }

          const dino = collection[foundDinoName];

          // Check if the dinosaur is in battle
          const activeDino = await db.get(`activeDino_${userId}`);
          if (activeDino === foundDinoName) {
            return msg.reply(
              `❌ Cannot store your active battle dinosaur! Use \`!dino set\` to change your active dinosaur first.`
            );
          }

          // Store the dinosaur
          const dinoToStore = {
            name: foundDinoName,
            emoji: dino.emoji,
            level: dino.level || 1,
            rarity: dino.rarity,
            tier: dino.tier,
            stats: dino.stats ? { ...dino.stats } : null,
            skill: dino.skill ? { ...dino.skill } : null,
            storedAt: Date.now(),
          };

          // Add to cryofridge
          cryofridge.dinosaurs.push(dinoToStore);

          // Decrement count in collection or remove if it's the last one
          if (dino.count > 1) {
            dino.count--;
          } else {
            delete collection[foundDinoName];
          }

          // Save data
          await db.set(`cryofridge_${userId}`, cryofridge);
          await db.set(`dinos_${userId}`, collection);

          return msg.reply(
            `✅ Successfully stored **${foundDinoName}** in your cryofridge! It will be protected from battle deaths.`
          );
        }

        // Handle retrieve command
        if (response.startsWith("retrieve ")) {
          // Check if cryofridge is empty
          if (cryofridge.dinosaurs.length === 0) {
            return msg.reply("❌ Your cryofridge is empty!");
          }

          const index = parseInt(response.substring(9).trim()) - 1;

          if (
            isNaN(index) ||
            index < 0 ||
            index >= cryofridge.dinosaurs.length
          ) {
            return msg.reply(
              `❌ Invalid dinosaur number. Choose between 1 and ${cryofridge.dinosaurs.length}.`
            );
          }

          const dinoToRetrieve = cryofridge.dinosaurs[index];
          const collection = (await db.get(`dinos_${userId}`)) || {};

          // Check if the dinosaur exists in the collection
          if (!collection[dinoToRetrieve.name]) {
            collection[dinoToRetrieve.name] = {
              emoji: dinoToRetrieve.emoji,
              rarity: dinoToRetrieve.rarity,
              tier: dinoToRetrieve.tier,
              count: 0,
              level: dinoToRetrieve.level || 1,
            };

            if (dinoToRetrieve.stats) {
              collection[dinoToRetrieve.name].stats = {
                ...dinoToRetrieve.stats,
              };
              collection[dinoToRetrieve.name].baseStats = {
                ...dinoToRetrieve.stats,
              };
            }

            if (dinoToRetrieve.skill) {
              collection[dinoToRetrieve.name].skill = {
                ...dinoToRetrieve.skill,
              };
            }
          }

          // Increment count in collection
          collection[dinoToRetrieve.name].count++;

          // Remove from cryofridge
          cryofridge.dinosaurs.splice(index, 1);

          // Save data
          await db.set(`cryofridge_${userId}`, cryofridge);
          await db.set(`dinos_${userId}`, collection);

          return msg.reply(
            `✅ Successfully retrieved **${dinoToRetrieve.name}** from your cryofridge! It has been added to your collection.`
          );
        }

        // Invalid command
        return msg.reply(
          "❌ Invalid option. Please use `store [dinosaur name]`, `retrieve [number]`, or `cancel`."
        );
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          message.channel.send(
            `${displayName}, cryofridge operation timed out.`
          );
        }
      });

      return {
        success: true,
        skipConsumption: true,
        message: "Operating cryofridge...",
      };
    },
  },
  // Luxury Items
  tek_replicator: {
    name: "TEK Replicator",
    emoji: "🔷",
    description: "Create one copy of any dinosaur you already own",
    duration: 1, // One-time use
    effect: {
      type: "dino_clone",
      value: 1,
      cooldown: 7 * 24 * 60 * 60 * 1000, // 7 days cooldown
    },
    // Special handling for TEK Replicator
    special: true,
    handler: async (message, userId, displayName) => {
      // Get user's dinosaur collection
      const collection = (await db.get(`dinos_${userId}`)) || {};

      if (Object.keys(collection).length === 0) {
        return {
          success: false,
          message:
            "You don't have any dinosaurs to clone! Your TEK Replicator has been returned to your inventory.",
          returnItem: true,
        };
      }

      // Check if user already has an active cooldown
      const replicatorCooldown = await db.get(`replicator_cooldown_${userId}`);
      if (replicatorCooldown && replicatorCooldown > Date.now()) {
        const cooldownTimeLeft = Math.ceil(
          (replicatorCooldown - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return {
          success: false,
          message: `Your TEK Replicator is still recharging. It will be ready in ${cooldownTimeLeft} days.`,
          returnItem: true,
        };
      }

      // Create an embed to display the dinosaurs
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("🔷 TEK Replicator")
        .setDescription(`${displayName}, choose a dinosaur to clone:`)
        .setFooter({
          text: "Type the name of the dinosaur you want to clone or 'cancel'",
          iconURL: message.client.user.displayAvatarURL(),
        });

      // Add dinosaurs to the embed
      let dinoList = "";
      for (const [name, dino] of Object.entries(collection)) {
        dinoList += `${dino.emoji} **${name}** (Lvl ${dino.level || 1}) - ${
          dino.rarity || "Common"
        } - Count: ${dino.count}x\n`;
      }

      embed.addFields({
        name: "Your Dinosaurs",
        value: dinoList || "No dinosaurs available to clone.",
        inline: false,
      });

      // Send the embed
      const promptMsg = await message.channel.send({ embeds: [embed] });

      // Set up collector for user response
      const filter = (m) => m.author.id === userId;
      const collector = message.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1,
      });

      collector.on("collect", async (msg) => {
        const response = msg.content.trim();

        // Handle cancel
        if (response.toLowerCase() === "cancel") {
          return msg.reply(
            "❌ Cloning canceled. Your TEK Replicator has been returned to your inventory."
          );
        }

        // Find the dinosaur to clone (case-insensitive partial match)
        let foundDinoName = null;

        for (const [name, _] of Object.entries(collection)) {
          if (name.toLowerCase().includes(response.toLowerCase())) {
            foundDinoName = name;
            break;
          }
        }

        if (!foundDinoName) {
          // Return the item to inventory on failure
          const inventory = (await db.get(`inventory_${userId}`)) || {};
          if (!inventory["tek_replicator"]) {
            inventory["tek_replicator"] = {
              name: "TEK Replicator",
              description: "Create one copy of any dinosaur you already own",
              emoji: "🔷",
              quantity: 0,
            };
          }
          inventory["tek_replicator"].quantity++;
          await db.set(`inventory_${userId}`, inventory);

          return msg.reply(
            `❌ You don't have a dinosaur named "${response}" in your collection. Your TEK Replicator has been returned to your inventory.`
          );
        }

        // Clone the dinosaur
        collection[foundDinoName].count++;

        // Save collection and set cooldown
        await db.set(`dinos_${userId}`, collection);
        await db.set(
          `replicator_cooldown_${userId}`,
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ); // 7 days cooldown

        return msg.reply(
          `🔷 **CLONING SUCCESSFUL!** Your **${foundDinoName}** has been cloned! You now have ${collection[foundDinoName].count}x of this dinosaur.`
        );
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          message.channel.send(
            `${displayName}, cloning timed out. Your TEK Replicator has been returned to your inventory.`
          );

          // Return the item to inventory on timeout
          (async () => {
            const inventory = (await db.get(`inventory_${userId}`)) || {};
            if (!inventory["tek_replicator"]) {
              inventory["tek_replicator"] = {
                name: "TEK Replicator",
                description: "Create one copy of any dinosaur you already own",
                emoji: "🔷",
                quantity: 0,
              };
            }
            inventory["tek_replicator"].quantity++;
            await db.set(`inventory_${userId}`, inventory);
          })();
        }
      });

      return {
        success: true,
        skipConsumption: true,
        message: "Preparing the TEK Replicator...",
      };
    },
  },
  ascension_terminal: {
    name: "Ascension Terminal",
    emoji: "⚡",
    description:
      "Ascend one dinosaur, permanently adding +3 levels and 20% to all stats",
    duration: 1, // One-time use
    effect: {
      type: "permanent_ascension",
      value: {
        levels: 3,
        statBoost: 0.2,
      },
    },
  },
  genesis_device: {
    name: "Genesis Device",
    emoji: "🧬",
    description:
      "Create a new dinosaur with random stats and guaranteed legendary rarity",
    duration: 1, // One-time use
    effect: {
      type: "create_legendary",
      value: 1,
    },
  },
  artifact_of_power: {
    name: "Artifact of Power",
    emoji: "🔮",
    description:
      "Master a dinosaur's skill instantly, greatly increasing its power",
    duration: 1, // One-time use
    effect: {
      type: "skill_mastery",
      value: 1,
    },
    special: true,
    handler: async (message, userId, displayName) => {
      // Get user's dinosaur collection
      const collection = (await db.get(`dinos_${userId}`)) || {};

      if (Object.keys(collection).length === 0) {
        return {
          success: false,
          message:
            "You don't have any dinosaurs to empower! Your Artifact of Power has been returned to your inventory.",
          returnItem: true,
        };
      }

      // Create an embed to display the dinosaurs
      const embed = new EmbedBuilder()
        .setColor("#9400D3")
        .setTitle("🔮 Artifact of Power")
        .setDescription(
          `${displayName}, choose a dinosaur to master its skill:`
        )
        .setFooter({
          text: "Type the name of the dinosaur you want to empower or 'cancel'",
          iconURL: message.client.user.displayAvatarURL(),
        });

      // Add dinosaurs to the embed - split into multiple fields to avoid character limit
      const dinoEntries = Object.entries(collection);
      const DINOS_PER_FIELD = 10; // Adjust based on average dinosaur name length

      for (let i = 0; i < dinoEntries.length; i += DINOS_PER_FIELD) {
        const fieldDinos = dinoEntries.slice(i, i + DINOS_PER_FIELD);
        let fieldContent = "";

        fieldDinos.forEach(([name, dino]) => {
          const skillStatus = dino.skillMastery
            ? "✅ MASTERED"
            : "❌ NOT MASTERED";
          fieldContent += `${dino.emoji} **${name}** (Lvl ${
            dino.level || 1
          }) - ${dino.rarity || "Common"} - Skill: ${skillStatus}\n`;
        });

        embed.addFields({
          name: `Your Dinosaurs (${i + 1}-${Math.min(
            i + DINOS_PER_FIELD,
            dinoEntries.length
          )})`,
          value: fieldContent || "No dinosaurs available.",
          inline: false,
        });
      }

      // Send the embed
      const promptMsg = await message.channel.send({ embeds: [embed] });

      // Set up collector for user response
      const filter = (m) => m.author.id === userId;
      const collector = message.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1,
      });

      // Rest of the handler function remains the same
      collector.on("collect", async (msg) => {
        const response = msg.content.trim();

        // Handle cancel
        if (response.toLowerCase() === "cancel") {
          return msg.reply(
            "❌ Skill mastery canceled. Your Artifact of Power has been returned to your inventory."
          );
        }

        // Find the dinosaur to empower (case-insensitive partial match)
        let foundDinoName = null;

        for (const [name, _] of Object.entries(collection)) {
          if (name.toLowerCase().includes(response.toLowerCase())) {
            foundDinoName = name;
            break;
          }
        }

        if (!foundDinoName) {
          // Return the item to inventory on failure
          const inventory = (await db.get(`inventory_${userId}`)) || {};
          if (!inventory["artifact_of_power"]) {
            inventory["artifact_of_power"] = {
              name: "Artifact of Power",
              description:
                "Master a dinosaur's skill instantly, greatly increasing its power",
              emoji: "🔮",
              quantity: 0,
            };
          }
          inventory["artifact_of_power"].quantity++;
          await db.set(`inventory_${userId}`, inventory);

          return msg.reply(
            `❌ You don't have a dinosaur named "${response}" in your collection. Your Artifact of Power has been returned to your inventory.`
          );
        }

        // Check if skill is already mastered
        if (collection[foundDinoName].skillMastery) {
          // Return the item to inventory
          const inventory = (await db.get(`inventory_${userId}`)) || {};
          if (!inventory["artifact_of_power"]) {
            inventory["artifact_of_power"] = {
              name: "Artifact of Power",
              description:
                "Master a dinosaur's skill instantly, greatly increasing its power",
              emoji: "🔮",
              quantity: 0,
            };
          }
          inventory["artifact_of_power"].quantity++;
          await db.set(`inventory_${userId}`, inventory);

          return msg.reply(
            `❌ Your **${foundDinoName}** has already mastered its skill! Your Artifact of Power has been returned to your inventory.`
          );
        }

        // Check if dinosaur has a skill
        if (!collection[foundDinoName].skill) {
          // Return the item to inventory
          const inventory = (await db.get(`inventory_${userId}`)) || {};
          if (!inventory["artifact_of_power"]) {
            inventory["artifact_of_power"] = {
              name: "Artifact of Power",
              description:
                "Master a dinosaur's skill instantly, greatly increasing its power",
              emoji: "🔮",
              quantity: 0,
            };
          }
          inventory["artifact_of_power"].quantity++;
          await db.set(`inventory_${userId}`, inventory);

          return msg.reply(
            `❌ Your **${foundDinoName}** doesn't have a skill that can be mastered. Your Artifact of Power has been returned to your inventory.`
          );
        }

        // Master the dinosaur's skill
        collection[foundDinoName].skillMastery = true;

        // Apply stat bonus for mastery (15% boost to all stats)
        const baseStats = collection[foundDinoName].stats || {
          attack: 10,
          defense: 10,
          health: 100,
          speed: 10,
        };

        // If stats don't exist, create them
        if (!collection[foundDinoName].stats) {
          collection[foundDinoName].stats = baseStats;
        }

        // Apply 15% boost to all stats
        for (const stat in baseStats) {
          collection[foundDinoName].stats[stat] = Math.floor(
            baseStats[stat] * 1.15
          );
        }

        // Boost the skill's power
        const oldPower = collection[foundDinoName].skill.power;
        collection[foundDinoName].skill.power = Math.min(
          50,
          collection[foundDinoName].skill.power * 1.5
        ); // Cap at 50% boost, but increase by 50%

        // Add a secondary effect based on the primary skill type
        if (!collection[foundDinoName].skill.secondaryEffect) {
          switch (collection[foundDinoName].skill.effect) {
            case "attack_boost":
              collection[foundDinoName].skill.secondaryEffect = {
                name: "Intimidation",
                description: "10% chance to make opponent miss their turn",
                effect: "stun_chance",
                power: 10,
              };
              break;
            case "defense_boost":
              collection[foundDinoName].skill.secondaryEffect = {
                name: "Reflective Scales",
                description: "Reflects 15% of damage back to attacker",
                effect: "damage_reflect",
                power: 15,
              };
              break;
            case "dodge_chance":
              collection[foundDinoName].skill.secondaryEffect = {
                name: "Counter Strike",
                description: "15% chance to deal bonus damage after dodging",
                effect: "counter_attack",
                power: 15,
              };
              break;
            case "damage_boost":
              collection[foundDinoName].skill.secondaryEffect = {
                name: "Critical Strike",
                description: "10% chance to deal double damage",
                effect: "critical_hit",
                power: 10,
              };
              break;
            default:
              collection[foundDinoName].skill.secondaryEffect = {
                name: "Primal Instinct",
                description: "10% chance to heal after attacking",
                effect: "heal_on_hit",
                power: 10,
              };
          }
        } else {
          // If secondary effect already exists, boost it too
          collection[foundDinoName].skill.secondaryEffect.power = Math.min(
            25,
            collection[foundDinoName].skill.secondaryEffect.power * 1.3
          );
        }

        // Save collection
        await db.set(`dinos_${userId}`, collection);

        return msg.reply(
          `🔮 **SKILL MASTERY SUCCESSFUL!** Your **${foundDinoName}** has mastered its skill!\n\n- Primary effect boosted from ${oldPower}% to ${collection[
            foundDinoName
          ].skill.power.toFixed(
            1
          )}%\n- All stats increased by 15%\n- Secondary effect added: **${
            collection[foundDinoName].skill.secondaryEffect.name
          }** - ${collection[foundDinoName].skill.secondaryEffect.description}`
        );
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          message.channel.send(
            `${displayName}, skill mastery timed out. Your Artifact of Power has been returned to your inventory.`
          );

          // Return the item to inventory on timeout
          (async () => {
            const inventory = (await db.get(`inventory_${userId}`)) || {};
            if (!inventory["artifact_of_power"]) {
              inventory["artifact_of_power"] = {
                name: "Artifact of Power",
                description:
                  "Master a dinosaur's skill instantly, greatly increasing its power",
                emoji: "🔮",
                quantity: 0,
              };
            }
            inventory["artifact_of_power"].quantity++;
            await db.set(`inventory_${userId}`, inventory);
          })();
        }
      });

      return {
        success: true,
        skipConsumption: true,
        message: "Preparing the Artifact of Power...",
      };
    },
  },
  extinction_core: {
    name: "Extinction Core",
    emoji: "🌋",
    description:
      "Gain the ability to tame the extremely rare Titanosaur King (chance: 0.01%)",
    duration: -1, // Permanent unlock
    effect: {
      type: "king_chance",
      value: 0.01,
    },
  },
  revival_stone: {
    name: "Revival Stone",
    emoji: "💎",
    description:
      "Revives a dinosaur that has died in battle and returns it to your collection",
    duration: 1, // One-time use
    effect: {
      type: "dino_revival",
      value: 1,
    },
    // Special handling for revival stone
    special: true,
    handler: async (message, userId, displayName) => {
      // Get the user's dead dinosaurs
      const deadDinos = (await db.get(`dead_dinos_${userId}`)) || [];

      if (deadDinos.length === 0) {
        return {
          success: false,
          message:
            "You don't have any dead dinosaurs to revive! Your Revival Stone has been returned to your inventory.",
          returnItem: true,
        };
      }

      // Create an embed to display the dead dinosaurs
      const embed = new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("💎 Revival Stone")
        .setDescription(`${displayName}, choose a dinosaur to revive:`)
        .setFooter({
          text: "Type the number of the dinosaur you want to revive or 'cancel'",
          iconURL: message.client.user.displayAvatarURL(),
        });

      // Add dead dinosaurs to the embed
      let dinoList = "";
      for (let i = 0; i < deadDinos.length; i++) {
        const dino = deadDinos[i];
        dinoList += `**${i + 1}.** ${dino.emoji} **${dino.name}** (Lvl ${
          dino.level || 1
        }) - ${dino.rarity || "Common"}\n`;
      }

      embed.addFields({
        name: "Available Dinosaurs to Revive",
        value: dinoList || "No dead dinosaurs to revive.",
        inline: false,
      });

      // Send the embed
      const promptMsg = await message.channel.send({ embeds: [embed] });

      // Set up collector for user response
      const filter = (m) => m.author.id === userId;
      const collector = message.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1,
      });

      collector.on("collect", async (msg) => {
        const response = msg.content.toLowerCase().trim();

        // Handle cancel
        if (response === "cancel") {
          // Return the item to inventory
          return msg.reply(
            "❌ Revival canceled. Your Revival Stone has been returned to your inventory."
          );
        }

        const index = parseInt(response) - 1;

        if (isNaN(index) || index < 0 || index >= deadDinos.length) {
          return msg.reply(
            `❌ Invalid choice. Please choose a number between 1 and ${deadDinos.length}.`
          );
        }

        // Get the dinosaur to revive
        const dinoToRevive = deadDinos[index];

        // Get user's dinosaur collection
        const collection = (await db.get(`dinos_${userId}`)) || {};

        // Add the dinosaur back to the collection
        if (collection[dinoToRevive.name]) {
          collection[dinoToRevive.name].count++;
        } else {
          collection[dinoToRevive.name] = {
            emoji: dinoToRevive.emoji,
            rarity: dinoToRevive.rarity,
            tier: dinoToRevive.tier,
            count: 1,
            level: dinoToRevive.level || 1,
          };

          // Restore the dinosaur's stats if they existed
          if (dinoToRevive.stats) {
            collection[dinoToRevive.name].stats = { ...dinoToRevive.stats };
            collection[dinoToRevive.name].baseStats = { ...dinoToRevive.stats };
          }

          // Restore the dinosaur's skill if it had one
          if (dinoToRevive.skill) {
            collection[dinoToRevive.name].skill = { ...dinoToRevive.skill };
          }
        }

        // Remove the dinosaur from the dead list
        deadDinos.splice(index, 1);

        // Save updated collections
        await db.set(`dinos_${userId}`, collection);
        await db.set(`dead_dinos_${userId}`, deadDinos);

        return msg.reply(
          `✨ **REVIVAL SUCCESSFUL!** Your **${dinoToRevive.name}** has been revived and returned to your collection!`
        );
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          message.channel.send(
            `${displayName}, revival timed out. Your Revival Stone has been returned to your inventory.`
          );
        }
      });

      return {
        success: true,
        skipConsumption: true, // Skip default consumption so we can handle returns
        message: "Preparing revival ritual...",
      };
    },
  },
};

module.exports = {
  name: "use",
  description: "Use an item from your inventory to gain its effects",
  usage: "!use [item name]",
  aliases: ["consume", "activate"],

  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if item name was provided
    if (!args.length) {
      // List usable items in inventory
      return listUsableItems(message, userId, displayName);
    }

    // Get the item name from args
    const itemNameArg = args.join(" ").toLowerCase();

    // Get user's inventory
    const inventory = (await db.get(`inventory_${userId}`)) || {};

    // Find the item in inventory (case insensitive partial match)
    let foundItemName = null;
    let foundItemId = null;

    for (const [itemId, itemData] of Object.entries(inventory)) {
      const itemName = itemData.name.toLowerCase();
      if (
        itemName.includes(itemNameArg) ||
        itemId.toLowerCase().includes(itemNameArg)
      ) {
        foundItemName = itemData.name;
        foundItemId = itemId;
        break;
      }
    }

    if (!foundItemId) {
      return message.reply(
        `You don't have an item called "${args.join(" ")}" in your inventory.`
      );
    }

    // Check if the item is usable
    const usableItem = USABLE_ITEMS[foundItemId];
    if (!usableItem) {
      return message.reply(
        `${foundItemName} cannot be used directly. Try using it in a specific command instead.`
      );
    }

    // Check if user has the item
    if (!inventory[foundItemId] || inventory[foundItemId].quantity <= 0) {
      return message.reply(`You don't have any ${foundItemName} to use.`);
    }

    // Use the item
    const result = await useItem(
      message,
      userId,
      displayName,
      foundItemId,
      usableItem
    );

    if (result.success) {
      // Deduct one item from inventory
      inventory[foundItemId].quantity--;

      // Remove item from inventory if quantity is 0
      if (inventory[foundItemId].quantity <= 0) {
        delete inventory[foundItemId];
      }

      // Save inventory
      await db.set(`inventory_${userId}`, inventory);

      // Send success message
      const successEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle(`${usableItem.emoji} Item Used: ${usableItem.name}`)
        .setDescription(
          `${displayName} used ${usableItem.name}!\n\n${usableItem.description}`
        )
        .addFields({
          name: "Effect Duration",
          value:
            usableItem.duration === 1
              ? "One-time use for your next action"
              : `${usableItem.duration / (60 * 1000)} minutes`,
        })
        .setFooter({
          text: result.message || "The item was used successfully!",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [successEmbed] });
    } else {
      // Send error message
      return message.reply(
        result.message || "There was an error using this item."
      );
    }
  },
};

// List usable items in user's inventory
async function listUsableItems(message, userId, displayName) {
  // Get user's inventory
  const inventory = (await db.get(`inventory_${userId}`)) || {};

  // Filter for usable items
  const usableItemsInInventory = [];

  for (const [itemId, itemData] of Object.entries(inventory)) {
    if (USABLE_ITEMS[itemId] && itemData.quantity > 0) {
      usableItemsInInventory.push({
        id: itemId,
        name: itemData.name,
        emoji: USABLE_ITEMS[itemId].emoji,
        description: USABLE_ITEMS[itemId].description,
        quantity: itemData.quantity,
      });
    }
  }

  if (usableItemsInInventory.length === 0) {
    return message.reply(
      "You don't have any usable items in your inventory. Check the shop with `!shop` to buy some!"
    );
  }

  // Create embed to display usable items
  const embed = new EmbedBuilder()
    .setColor("#3498db")
    .setTitle("🎒 Your Usable Items")
    .setDescription(
      `${displayName}, here are the items you can use with the \`!use\` command:`
    )
    .setFooter({
      text: "Type !use [item name] to use an item",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Add each item as a field
  usableItemsInInventory.forEach((item) => {
    embed.addFields({
      name: `${item.emoji} ${item.name} (${item.quantity}x)`,
      value: item.description,
    });
  });

  return message.channel.send({ embeds: [embed] });
}

// Use an item and apply its effects
async function useItem(message, userId, displayName, itemId, item) {
  // Check if this is a special item with custom handling
  if (item.special && typeof item.handler === "function") {
    return await item.handler(message, userId, displayName);
  }

  // Check for existing buffs of the same type
  const existingBuffs = (await db.get(`buffs_${userId}`)) || [];

  // Filter out expired buffs
  const currentBuffs = existingBuffs.filter((buff) => buff.expiry > Date.now());

  // Check for conflicting buffs
  const conflictingBuff = currentBuffs.find(
    (buff) =>
      buff.effect.type === item.effect.type &&
      buff.effect.type !== "guaranteed_catch"
  );

  if (conflictingBuff) {
    return {
      success: false,
      message: `You already have a ${conflictingBuff.name} active! Wait for it to expire before using another ${item.effect.type} effect.`,
    };
  }

  // Calculate expiry time
  const now = Date.now();
  const expiry =
    item.effect.type === "guaranteed_catch" ? -1 : now + item.duration;

  // Create buff object
  const buff = {
    id: itemId,
    name: item.name,
    emoji: item.emoji,
    effect: item.effect,
    appliedAt: now,
    expiry: expiry,
  };

  // Add buff to user's active buffs
  currentBuffs.push(buff);

  // Save updated buffs
  await db.set(`buffs_${userId}`, currentBuffs);

  // Handle special item effects that need immediate action
  let specialActionResult = "";

  switch (item.effect.type) {
    case "create_legendary":
      // Genesis Device - Create a new legendary dinosaur
      specialActionResult = await createLegendaryDinosaur(message, userId);
      break;

    case "dino_clone":
      // TEK Replicator - Clone an existing dinosaur
      // Get user's dinosaur collection for displaying
      const collection = (await db.get(`dinos_${userId}`)) || {};

      if (Object.keys(collection).length === 0) {
        return {
          success: false,
          message:
            "You don't have any dinosaurs to clone yet. Catch some first!",
        };
      }

      // Check if user already has an active cooldown
      const replicatorCooldown = await db.get(`replicator_cooldown_${userId}`);
      if (replicatorCooldown && replicatorCooldown > Date.now()) {
        const cooldownTimeLeft = Math.ceil(
          (replicatorCooldown - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return {
          success: false,
          message: `Your TEK Replicator is still recharging. It will be ready in ${cooldownTimeLeft} days.`,
        };
      }

      // Create an embed showing the user's dinosaurs they can clone
      const dinoEmbed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("🔷 TEK Replicator - Clone a Dinosaur")
        .setDescription(
          `${displayName}, type the name of the dinosaur you want to clone.`
        )
        .setFooter({
          text: "Type a dinosaur name to clone it or 'cancel' to cancel",
          iconURL: message.client.user.displayAvatarURL(),
        });

      // Add user's dinosaurs to the embed
      let dinoList = "";
      for (const [name, dino] of Object.entries(collection)) {
        dinoList += `${dino.emoji} **${name}** (Lvl ${dino.level || 1}) - ${
          dino.rarity || "Common"
        } - Count: ${dino.count}x\n`;
      }

      dinoEmbed.addFields({
        name: "Your Dinosaurs",
        value: dinoList || "No dinosaurs available to clone.",
        inline: false,
      });

      // Send the embed
      const embedMsg = await message.channel.send({ embeds: [dinoEmbed] });

      // Set up a collector for the user's response
      const cloneFilter = (m) => m.author.id === userId;
      const cloneCollector = message.channel.createMessageCollector({
        filter: cloneFilter,
        time: 60000,
        max: 1,
      });

      try {
        cloneCollector.on("collect", async (cloneMsg) => {
          const content = cloneMsg.content.trim();

          // Check if user wants to cancel
          if (content.toLowerCase() === "cancel") {
            cloneMsg.reply("TEK Replicator operation cancelled.");

            // Return the item to inventory
            const inventory = (await db.get(`inventory_${userId}`)) || {};
            if (!inventory[itemId]) {
              inventory[itemId] = {
                name: item.name,
                description: item.description || "",
                emoji: item.emoji,
                quantity: 0,
              };
            }
            inventory[itemId].quantity++;
            await db.set(`inventory_${userId}`, inventory);
            return;
          }

          const dinoName = content;
          try {
            const cloneResult = await cloneDinosaur(cloneMsg, userId, dinoName);

            if (cloneResult.success) {
              // Set cooldown if successful
              await db.set(
                `replicator_cooldown_${userId}`,
                Date.now() + item.effect.cooldown
              );
              cloneMsg.reply(cloneResult.message);
            } else {
              cloneMsg.reply(
                `Failed to clone dinosaur: ${cloneResult.message}`
              );
              // Return item to inventory since it failed
              const inventory = (await db.get(`inventory_${userId}`)) || {};
              if (!inventory[itemId]) {
                inventory[itemId] = {
                  name: item.name,
                  description: item.description || "",
                  emoji: item.emoji,
                  quantity: 0,
                };
              }
              inventory[itemId].quantity++;
              await db.set(`inventory_${userId}`, inventory);
              cloneMsg.reply(
                `Your ${item.name} has been returned to your inventory.`
              );
            }
          } catch (error) {
            console.error("Error in cloning process:", error);
            cloneMsg.reply(
              "An error occurred during the cloning process. Your TEK Replicator has been returned to your inventory."
            );

            // Return the item to inventory on error
            const inventory = (await db.get(`inventory_${userId}`)) || {};
            if (!inventory[itemId]) {
              inventory[itemId] = {
                name: item.name,
                description: item.description || "",
                emoji: item.emoji,
                quantity: 0,
              };
            }
            inventory[itemId].quantity++;
            await db.set(`inventory_${userId}`, inventory);
          }
        });

        cloneCollector.on("end", (collected) => {
          if (collected.size === 0) {
            message.channel.send(
              `${displayName}, you didn't specify a dinosaur to clone in time. Your TEK Replicator has been returned to your inventory.`
            );

            // Return the item to inventory
            (async () => {
              try {
                const inventory = (await db.get(`inventory_${userId}`)) || {};
                if (!inventory[itemId]) {
                  inventory[itemId] = {
                    name: item.name,
                    description: item.description || "",
                    emoji: item.emoji,
                    quantity: 0,
                  };
                }
                inventory[itemId].quantity++;
                await db.set(`inventory_${userId}`, inventory);
              } catch (error) {
                console.error("Error returning item to inventory:", error);
              }
            })();
          }
        });
      } catch (error) {
        console.error("Error setting up collector:", error);
        message.channel.send(
          "There was an error with the TEK Replicator. Your item has been returned to your inventory."
        );

        // Return the item to inventory on setup error
        (async () => {
          const inventory = (await db.get(`inventory_${userId}`)) || {};
          if (!inventory[itemId]) {
            inventory[itemId] = {
              name: item.name,
              description: item.description || "",
              emoji: item.emoji,
              quantity: 0,
            };
          }
          inventory[itemId].quantity++;
          await db.set(`inventory_${userId}`, inventory);
        })();
      }

      // This will make it wait for user input
      return {
        success: true,
        message:
          "Operating TEK Replicator... Please type the name of a dinosaur to clone.",
      };
      break;

    case "permanent_ascension":
      // Ascension Terminal - Permanently ascend a dinosaur
      message.channel.send(
        `${displayName}, type the name of the dinosaur you want to ascend.`
      );

      // Set up a collector for the user's response
      const ascendFilter = (m) => m.author.id === userId;
      const ascendCollector = message.channel.createMessageCollector({
        filter: ascendFilter,
        time: 30000,
        max: 1,
      });

      ascendCollector.on("collect", async (ascendMsg) => {
        const dinoName = ascendMsg.content.trim();
        const ascendResult = await ascendDinosaur(
          ascendMsg,
          userId,
          dinoName,
          item.effect.value
        );

        if (ascendResult.success) {
          ascendMsg.reply(ascendResult.message);
        } else {
          ascendMsg.reply(`Failed to ascend dinosaur: ${ascendResult.message}`);
        }
      });

      ascendCollector.on("end", (collected) => {
        if (collected.size === 0) {
          message.channel.send(
            `${displayName}, you didn't specify a dinosaur to ascend in time. The Ascension Terminal has been used, but no dinosaur was ascended.`
          );
        }
      });
      break;

    case "skill_mastery":
      // Artifact of Power - Upgrade a dinosaur's skill
      message.channel.send(
        `${displayName}, type the name of the dinosaur whose skill you want to master.`
      );

      // Set up a collector for the user's response
      const skillFilter = (m) => m.author.id === userId;
      const skillCollector = message.channel.createMessageCollector({
        filter: skillFilter,
        time: 30000,
        max: 1,
      });

      skillCollector.on("collect", async (skillMsg) => {
        const dinoName = skillMsg.content.trim();
        const skillResult = await masterDinosaurSkill(
          skillMsg,
          userId,
          dinoName
        );

        if (skillResult.success) {
          skillMsg.reply(skillResult.message);
        } else {
          skillMsg.reply(
            `Failed to master dinosaur skill: ${skillResult.message}`
          );
        }
      });

      skillCollector.on("end", (collected) => {
        if (collected.size === 0) {
          message.channel.send(
            `${displayName}, you didn't specify a dinosaur for skill mastery in time. The Artifact of Power has been used, but no dinosaur skill was mastered.`
          );
        }
      });
      break;
  }

  return {
    success: true,
    message: `${item.name} has been activated! ${item.description}${
      specialActionResult ? `\n\n${specialActionResult}` : ""
    }`,
  };
}

// Create a new legendary dinosaur with the Genesis Device
async function createLegendaryDinosaur(message, userId) {
  // Define legendary dinosaurs
  const LEGENDARY_DINOS = [
    {
      name: "Alpha Tyrannosaurus",
      emoji: "🦖",
      image: "https://www.dododex.com/media/creature/tyrannosaurus-rex.png",
      tier: "boss",
      rarity: "legendary",
      value: 5000,
      skill: {
        name: "Alpha Dominance",
        description: "Increases attack by 25% in battles",
        effect: "attack_boost",
        power: 25,
      },
    },
    {
      name: "Tek Giganotosaurus",
      emoji: "🦖",
      image: "https://www.dododex.com/media/creature/giganotosaurus.png",
      tier: "boss",
      rarity: "legendary",
      value: 4800,
      skill: {
        name: "Tek Reinforcement",
        description: "Increases defense by 25% in battles",
        effect: "defense_boost",
        power: 25,
      },
    },
    {
      name: "Ghost Reaper",
      emoji: "👻",
      image: "https://www.dododex.com/media/creature/reaper.png",
      tier: "boss",
      rarity: "legendary",
      value: 4500,
      skill: {
        name: "Spectral Phase",
        description: "25% chance to avoid attacks in battles",
        effect: "dodge_chance",
        power: 25,
      },
    },
    {
      name: "Celestial Wyvern",
      emoji: "🐉",
      image: "https://www.dododex.com/media/creature/wyvern.png",
      tier: "boss",
      rarity: "legendary",
      value: 5200,
      skill: {
        name: "Starfire Breath",
        description: "Deals 20% bonus damage in battles",
        effect: "damage_boost",
        power: 20,
      },
    },
  ];

  // Select a random legendary dinosaur
  const newDino =
    LEGENDARY_DINOS[Math.floor(Math.random() * LEGENDARY_DINOS.length)];

  // Get user's dinosaur collection
  const collection = (await db.get(`dinos_${userId}`)) || {};

  // Add or update dino in collection with enhanced stats
  if (collection[newDino.name]) {
    collection[newDino.name].count++;
  } else {
    // Base stats for the legendary dinosaur
    const baseStats = {
      hp: 200,
      attack: 30,
      defense: 20,
    };

    collection[newDino.name] = {
      emoji: newDino.emoji,
      image: newDino.image,
      tier: newDino.tier,
      rarity: newDino.rarity,
      value: newDino.value,
      skill: newDino.skill,
      count: 1,
      level: 1,
      stats: baseStats,
      baseStats: baseStats,
    };
  }

  // Save collection
  await db.set(`dinos_${userId}`, collection);

  return `🧬 You've created a **${newDino.name}** (${newDino.rarity}) with the Genesis Device! This powerful creature has been added to your collection.`;
}

// Clone an existing dinosaur with the TEK Replicator
async function cloneDinosaur(message, userId, dinoName) {
  // Get user's dinosaur collection
  const collection = (await db.get(`dinos_${userId}`)) || {};

  // Find the dinosaur to clone (case-insensitive partial match)
  let foundDinoName = null;

  for (const [name, _] of Object.entries(collection)) {
    if (name.toLowerCase().includes(dinoName.toLowerCase())) {
      foundDinoName = name;
      break;
    }
  }

  if (!foundDinoName) {
    return {
      success: false,
      message:
        "Dinosaur not found in your collection. Please check the name and try again.",
    };
  }

  // Increment the count of the dinosaur in the collection
  collection[foundDinoName].count++;

  // Save the updated collection
  await db.set(`dinos_${userId}`, collection);

  return {
    success: true,
    message: `🔷 Successfully cloned your **${foundDinoName}**! You now have ${collection[foundDinoName].count}x of this dinosaur.`,
  };
}

// Ascend a dinosaur with the Ascension Terminal
async function ascendDinosaur(message, userId, dinoName, ascensionBoost) {
  // Get user's dinosaur collection
  const collection = (await db.get(`dinos_${userId}`)) || {};

  // Find the dinosaur to ascend (case-insensitive partial match)
  let foundDinoName = null;

  for (const [name, _] of Object.entries(collection)) {
    if (name.toLowerCase().includes(dinoName.toLowerCase())) {
      foundDinoName = name;
      break;
    }
  }

  if (!foundDinoName) {
    return {
      success: false,
      message:
        "Dinosaur not found in your collection. Please check the name and try again.",
    };
  }

  const dino = collection[foundDinoName];

  // Apply ascension boost
  dino.level += ascensionBoost.levels;

  // Boost all stats by the percentage
  for (const stat in dino.stats) {
    dino.stats[stat] = Math.floor(
      dino.stats[stat] * (1 + ascensionBoost.statBoost)
    );
  }

  // Save the updated collection
  await db.set(`dinos_${userId}`, collection);

  return {
    success: true,
    message: `⚡ **${foundDinoName}** has ascended to level ${
      dino.level
    }! All stats have been boosted by ${ascensionBoost.statBoost * 100}%.`,
  };
}

// Master a dinosaur's skill with the Artifact of Power
async function masterDinosaurSkill(message, userId, dinoName) {
  // Get user's dinosaur collection
  const collection = (await db.get(`dinos_${userId}`)) || {};

  // Find the dinosaur (case-insensitive partial match)
  let foundDinoName = null;

  for (const [name, _] of Object.entries(collection)) {
    if (name.toLowerCase().includes(dinoName.toLowerCase())) {
      foundDinoName = name;
      break;
    }
  }

  if (!foundDinoName) {
    return {
      success: false,
      message:
        "Dinosaur not found in your collection. Please check the name and try again.",
    };
  }

  const dino = collection[foundDinoName];

  // Check if dinosaur has a skill
  if (!dino.skill) {
    return {
      success: false,
      message: "This dinosaur doesn't have a skill that can be mastered.",
    };
  }

  // Boost the skill's power
  const oldPower = dino.skill.power;
  dino.skill.power = Math.min(50, dino.skill.power * 1.5); // Cap at 50% boost, but increase by 50%

  // Add a secondary effect based on the primary skill type
  if (!dino.skill.secondaryEffect) {
    switch (dino.skill.effect) {
      case "attack_boost":
        dino.skill.secondaryEffect = {
          name: "Intimidation",
          description: "10% chance to make opponent miss their turn",
          effect: "stun_chance",
          power: 10,
        };
        break;
      case "defense_boost":
        dino.skill.secondaryEffect = {
          name: "Reflective Scales",
          description: "Reflects 15% of damage back to attacker",
          effect: "damage_reflect",
          power: 15,
        };
        break;
      case "dodge_chance":
        dino.skill.secondaryEffect = {
          name: "Counter Strike",
          description: "15% chance to deal bonus damage after dodging",
          effect: "counter_attack",
          power: 15,
        };
        break;
      case "damage_boost":
        dino.skill.secondaryEffect = {
          name: "Critical Strike",
          description: "10% chance to deal double damage",
          effect: "critical_hit",
          power: 10,
        };
        break;
      default:
        dino.skill.secondaryEffect = {
          name: "Primal Instinct",
          description: "10% chance to heal after attacking",
          effect: "heal_on_hit",
          power: 10,
        };
    }
  } else {
    // If secondary effect already exists, boost it too
    dino.skill.secondaryEffect.power = Math.min(
      25,
      dino.skill.secondaryEffect.power * 1.3
    );
  }

  // Save the updated collection
  await db.set(`dinos_${userId}`, collection);

  return {
    success: true,
    message: `🔮 **${foundDinoName}**'s skill has been mastered! Primary effect boosted from ${oldPower}% to ${dino.skill.power.toFixed(
      1
    )}%.\n\nSecondary effect added: **${dino.skill.secondaryEffect.name}** - ${
      dino.skill.secondaryEffect.description
    }.`,
  };
}
