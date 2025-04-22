const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Animal rarity tiers and their essence values
const RARITIES = {
  common: { emoji: "⚪", value: 1, essenceValue: 1 },
  uncommon: { emoji: "🟢", value: 3, essenceValue: 3 },
  rare: { emoji: "🔵", value: 8, essenceValue: 10 },
  legendary: { emoji: "🟣", value: 15, essenceValue: 25 },
};

module.exports = {
  name: "sacrifice",
  description: "Sacrifice animals for essence",
  usage: "!sacrifice [animal/rarity/all]",
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Get animal collection from database
    let animals = (await db.get(`animals_${userId}`)) || {};

    // Check if zoo is empty
    if (Object.keys(animals).length === 0) {
      return message.reply(
        "You don't have any animals to sacrifice! Use `!hunt` to catch some first."
      );
    }

    // Check if argument is provided
    if (!args || args.length === 0) {
      // Show sacrifice help if no arguments
      return showSacrificeHelp(message, userId, displayName, animals);
    }

    const target = args.join(" ").toLowerCase();

    // Handle different sacrifice targets
    if (target === "all") {
      // Sacrifice all animals
      return sacrificeAll(message, userId, displayName, animals);
    } else if (["common", "uncommon", "rare", "legendary"].includes(target)) {
      // Sacrifice animals of specific rarity
      return sacrificeRarity(message, userId, displayName, animals, target);
    } else {
      // Try to find specific animal by name
      return sacrificeSpecific(message, userId, displayName, animals, target);
    }
  },
};

// Show sacrifice help information
async function showSacrificeHelp(message, userId, displayName, animals) {
  // Calculate potential essence from animals
  let totalPotentialEssence = 0;
  let essenceByRarity = {
    common: 0,
    uncommon: 0,
    rare: 0,
    legendary: 0,
  };

  // Current essence
  const currentEssence = (await db.get(`essence_${userId}`)) || 0;

  // Calculate essence values by rarity
  for (const [animalName, animalData] of Object.entries(animals)) {
    const count = animalData.count || 0;
    const rarity = animalData.rarity || "common";
    const essencePerAnimal = RARITIES[rarity].essenceValue;

    totalPotentialEssence += count * essencePerAnimal;
    essenceByRarity[rarity] += count * essencePerAnimal;
  }

  // Create embed
  const embed = new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle(`${displayName}'s Animal Sacrifice`)
    .setDescription(
      "Sacrifice your animals for essence, which can be used for special items!"
    )
    .addFields(
      {
        name: "Current Essence",
        value: `✨ ${formatNumber(currentEssence)} essence`,
        inline: false,
      },
      {
        name: "Available Sacrifices",
        value: "Choose what to sacrifice:",
        inline: false,
      },
      {
        name: `${RARITIES.legendary.emoji} Legendary`,
        value: `${formatNumber(essenceByRarity.legendary)} essence potential`,
        inline: true,
      },
      {
        name: `${RARITIES.rare.emoji} Rare`,
        value: `${formatNumber(essenceByRarity.rare)} essence potential`,
        inline: true,
      },
      {
        name: `${RARITIES.uncommon.emoji} Uncommon`,
        value: `${formatNumber(essenceByRarity.uncommon)} essence potential`,
        inline: true,
      },
      {
        name: `${RARITIES.common.emoji} Common`,
        value: `${formatNumber(essenceByRarity.common)} essence potential`,
        inline: true,
      },
      {
        name: "All Animals",
        value: `${formatNumber(totalPotentialEssence)} total essence potential`,
        inline: true,
      }
    )
    .addFields({
      name: "Commands",
      value:
        "• `!sacrifice all` - Sacrifice all animals\n" +
        "• `!sacrifice common` - Sacrifice all common animals\n" +
        "• `!sacrifice uncommon` - Sacrifice all uncommon animals\n" +
        "• `!sacrifice rare` - Sacrifice all rare animals\n" +
        "• `!sacrifice legendary` - Sacrifice all legendary animals\n" +
        "• `!sacrifice [animal name]` - Sacrifice a specific animal",
    })
    .setThumbnail("https://i.imgur.com/jxBd9NZ.png") // Sacrifice icon
    .setFooter({
      text: "Sacrifice animals to gain essence!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Sacrifice all animals
async function sacrificeAll(message, userId, displayName, animals) {
  let totalEssence = 0;
  let sacrificedCount = 0;

  // Calculate essence from all animals
  for (const [animalName, animalData] of Object.entries(animals)) {
    const count = animalData.count || 0;
    const rarity = animalData.rarity || "common";
    const essencePerAnimal = RARITIES[rarity].essenceValue;

    totalEssence += count * essencePerAnimal;
    sacrificedCount += count;
  }

  // Check if there are animals to sacrifice
  if (sacrificedCount === 0) {
    return message.reply("You don't have any animals to sacrifice!");
  }

  // Update essence
  const currentEssence = (await db.get(`essence_${userId}`)) || 0;
  await db.set(`essence_${userId}`, currentEssence + totalEssence);

  // Clear animal collection
  await db.set(`animals_${userId}`, {});

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle("✨ Sacrifice Complete")
    .setDescription(
      `${displayName} sacrificed **${formatNumber(sacrificedCount)}** animals!`
    )
    .addFields(
      {
        name: "Essence Gained",
        value: `✨ ${formatNumber(totalEssence)}`,
        inline: true,
      },
      {
        name: "New Total",
        value: `✨ ${formatNumber(currentEssence + totalEssence)}`,
        inline: true,
      }
    )
    .setThumbnail("https://i.imgur.com/jxBd9NZ.png")
    .setFooter({
      text: "Your zoo has been cleared!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Sacrifice animals of a specific rarity
async function sacrificeRarity(
  message,
  userId,
  displayName,
  animals,
  rarityTarget
) {
  let totalEssence = 0;
  let sacrificedCount = 0;
  const animalNamesToRemove = [];
  const animalsToReduce = {};

  // Calculate essence from animals of the target rarity
  for (const [animalName, animalData] of Object.entries(animals)) {
    const count = animalData.count || 0;
    const rarity = animalData.rarity || "common";

    if (rarity === rarityTarget) {
      const essencePerAnimal = RARITIES[rarity].essenceValue;
      totalEssence += count * essencePerAnimal;
      sacrificedCount += count;
      animalNamesToRemove.push(animalName);
    }
  }

  // Check if there are animals to sacrifice
  if (sacrificedCount === 0) {
    return message.reply(
      `You don't have any ${rarityTarget} animals to sacrifice!`
    );
  }

  // Update essence
  const currentEssence = (await db.get(`essence_${userId}`)) || 0;
  await db.set(`essence_${userId}`, currentEssence + totalEssence);

  // Remove sacrificed animals
  animalNamesToRemove.forEach((name) => {
    delete animals[name];
  });

  // Update animal collection
  await db.set(`animals_${userId}`, animals);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle("✨ Sacrifice Complete")
    .setDescription(
      `${displayName} sacrificed **${formatNumber(sacrificedCount)}** ${
        RARITIES[rarityTarget].emoji
      } ${rarityTarget} animals!`
    )
    .addFields(
      {
        name: "Essence Gained",
        value: `✨ ${formatNumber(totalEssence)}`,
        inline: true,
      },
      {
        name: "New Total",
        value: `✨ ${formatNumber(currentEssence + totalEssence)}`,
        inline: true,
      }
    )
    .setThumbnail("https://i.imgur.com/jxBd9NZ.png")
    .setFooter({
      text: "All your " + rarityTarget + " animals have been sacrificed!",
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// Sacrifice a specific animal
async function sacrificeSpecific(
  message,
  userId,
  displayName,
  animals,
  targetAnimal
) {
  // Try to find the animal
  let found = false;
  let animalName = "";
  let animalData = null;

  // Find exact or partial match for animal name
  for (const [name, data] of Object.entries(animals)) {
    const lowerName = name.toLowerCase();
    if (lowerName === targetAnimal || lowerName.includes(targetAnimal)) {
      animalName = name;
      animalData = data;
      found = true;
      break;
    }
  }

  if (!found || !animalData) {
    return message.reply(`You don't have any "${targetAnimal}" in your zoo!`);
  }

  const count = animalData.count || 0;
  const rarity = animalData.rarity || "common";
  const essencePerAnimal = RARITIES[rarity].essenceValue;
  const totalEssence = count * essencePerAnimal;

  // Update essence
  const currentEssence = (await db.get(`essence_${userId}`)) || 0;
  await db.set(`essence_${userId}`, currentEssence + totalEssence);

  // Remove the animal from collection
  delete animals[animalName];
  await db.set(`animals_${userId}`, animals);

  // Create success embed
  const embed = new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle("✨ Sacrifice Complete")
    .setDescription(`${displayName} sacrificed **${count}x ${animalName}**!`)
    .addFields(
      {
        name: "Rarity",
        value: `${RARITIES[rarity].emoji} ${rarity}`,
        inline: true,
      },
      {
        name: "Essence Gained",
        value: `✨ ${formatNumber(totalEssence)}`,
        inline: true,
      },
      {
        name: "New Total",
        value: `✨ ${formatNumber(currentEssence + totalEssence)}`,
        inline: true,
      }
    )
    .setThumbnail("https://i.imgur.com/jxBd9NZ.png")
    .setFooter({
      text: `All your ${animalName} have been sacrificed!`,
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}
