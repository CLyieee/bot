const db = require("../utils/database");
const {
  getDisplayName,
  formatNumber,
  checkCooldown,
} = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

// Animals with rarity tiers and rewards
const ANIMALS = [
  { name: "🐭 Mouse", rarity: "common", value: 500, chance: 30 },
  { name: "🐰 Rabbit", rarity: "common", value: 1000, chance: 25 },
  { name: "🐿️ Squirrel", rarity: "common", value: 1005, chance: 20 },
  { name: "🦊 Fox", rarity: "uncommon", value: 2500, chance: 10 },
  { name: "🦌 Deer", rarity: "uncommon", value: 3500, chance: 7 },
  { name: "🐺 Wolf", rarity: "rare", value: 5000, chance: 5 },
  { name: "🦁 Lion", rarity: "rare", value: 7500, chance: 2 },
  { name: "🐉 Dragon", rarity: "legendary", value: 10000, chance: 1 },
];

module.exports = {
  name: "hunt",
  description: "Hunt for animals to earn atlyss coins",
  usage: "!hunt",
  cooldown: 5 * 60 * 1000, // 5 minutes cooldown
  async execute(message) {
    const userId = message.author.id;

    // Check if the user is on cooldown
    const lastHunted = await db.get(`hunt_${userId}`);
    const cooldownCheck = checkCooldown(lastHunted, this.cooldown);

    if (cooldownCheck.onCooldown) {
      // Create a cooldown card using embeds
      const cooldownEmbed = new EmbedBuilder()
        .setColor("#e74c3c") // Red color for cooldown
        .setAuthor({
          name: `${getDisplayName(message.member)} | Hunting Cooldown`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `You're too tired to hunt again!\nTry again in **${cooldownCheck.timeLeft}**`
        )
        
        .setFooter({
          text: "Hunting cooldown is 5 minutes",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // Generate random hunt results
    const huntResults = generateHuntResults();
    const huntedAnimals = huntResults.animals;
    const totalCoins = huntResults.totalValue;

    // Update database
    await db.add(`cash_${userId}`, totalCoins);
    await db.set(`hunt_${userId}`, Date.now());

    // Track hunt count and increment
    const huntCount = (await db.get(`huntCount_${userId}`)) || 0;
    await db.set(`huntCount_${userId}`, huntCount + 1);

    // Add animals to user's collection
    await addAnimalsToCollection(userId, huntedAnimals);

    // Get user's display name
    const displayName = getDisplayName(message.member);

    // Create animal list for display
    let animalList = "";
    huntedAnimals.forEach((animal) => {
      const rarityColor = getRarityColor(animal.rarity);
      animalList += `${animal.name} (**${rarityColor}${
        animal.rarity
      }**) - ${formatNumber(animal.value)} coins\n`;
    });

    // Create a success card using embeds
    const successEmbed = new EmbedBuilder()
      .setColor("#9b59b6") // Purple color for hunting
      .setAuthor({
        name: `${displayName}'s Hunting Results`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `You went hunting and caught ${
          huntedAnimals.length
        } animal(s)!\n\n${animalList}\n**Total Earnings:** ${formatNumber(
          totalCoins
        )} atlyss coins`
      )
      .setThumbnail("https://i.imgur.com/KILibqU.png") // Hunting bow/target icon
      .setFooter({
        text: `Total hunts: ${
          huntCount + 1
        } | Next hunt available in 5 minutes | Use !zoo to see your collection`,
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Send the card design message
    message.channel.send({ embeds: [successEmbed] });
  },
};

// Generate random hunting results based on animal chances
function generateHuntResults() {
  const results = { animals: [], totalValue: 0 };
  const numAnimals = Math.floor(Math.random() * 3) + 1; // Catch 1-3 animals per hunt

  // Select random animals based on their chance
  for (let i = 0; i < numAnimals; i++) {
    const roll = Math.random() * 100;
    let chanceSum = 0;

    for (const animal of ANIMALS) {
      chanceSum += animal.chance;
      if (roll < chanceSum) {
        results.animals.push(animal);
        results.totalValue += animal.value;
        break;
      }
    }
  }

  return results;
}

// Get color codes for rarity display
function getRarityColor(rarity) {
  switch (rarity) {
    case "common":
      return "⚪ ";
    case "uncommon":
      return "🟢 ";
    case "rare":
      return "🔵 ";
    case "legendary":
      return "🟣 ";
    default:
      return "";
  }
}

// Add hunted animals to user's collection
async function addAnimalsToCollection(userId, animals) {
  // Get user's current animal collection
  let collection = (await db.get(`animals_${userId}`)) || {};

  // Add each hunted animal to collection
  animals.forEach((animal) => {
    const animalName = animal.name;

    // If animal already exists in collection, increment count
    if (collection[animalName]) {
      collection[animalName].count = (collection[animalName].count || 0) + 1;
    } else {
      // Otherwise add new animal to collection
      collection[animalName] = {
        rarity: animal.rarity,
        count: 1,
        value: animal.value,
      };
    }
  });

  // Save updated collection
  await db.set(`animals_${userId}`, collection);
}
