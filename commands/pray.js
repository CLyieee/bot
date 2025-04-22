// filepath: c:\bot\commands\pray.js
const db = require("../utils/database");
const {
  getDisplayName,
  formatNumber,
  checkCooldown,
} = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "pray",
  description:
    "Pray to the ARK gods to increase your chance of finding rare dinosaurs",
  aliases: ["worship", "ritual"],
  usage: "!pray",
  cooldown: 60 * 60 * 1000, // 1 hour cooldown

  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Check if the user is on cooldown
    const lastPrayed = await db.get(`pray_${userId}`);
    const cooldownCheck = checkCooldown(lastPrayed, this.cooldown);

    if (cooldownCheck.onCooldown) {
      // Create a cooldown card using embeds
      const cooldownEmbed = new EmbedBuilder()
        .setColor("#e74c3c") // Red color for cooldown
        .setAuthor({
          name: `${displayName} | Prayer Cooldown`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `The ARK gods are still listening to your previous prayer!\nYou can pray again in **${cooldownCheck.timeLeft}**`
        )
        .setThumbnail("https://i.imgur.com/s7lfyWJ.png") // Prayer/altar icon
        .setFooter({
          text: "Prayer cooldown is 1 hour",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // Set prayer buff duration (30 minutes)
    const buffDuration = 30 * 60 * 1000;
    const buffExpiry = Date.now() + buffDuration;

    // Calculate boost amount based on randomness with weighted chances
    // Values between 10% and 50% with higher chance of lower values
    const roll = Math.random();
    let rareBoost;

    if (roll < 0.5) {
      // 50% chance for 10-20% boost
      rareBoost = 10 + Math.floor(Math.random() * 11);
    } else if (roll < 0.8) {
      // 30% chance for 21-35% boost
      rareBoost = 21 + Math.floor(Math.random() * 15);
    } else if (roll < 0.95) {
      // 15% chance for 36-45% boost
      rareBoost = 36 + Math.floor(Math.random() * 10);
    } else {
      // 5% chance for 46-50% boost
      rareBoost = 46 + Math.floor(Math.random() * 5);
    }

    // Save prayer buff to database
    await db.set(`prayBuff_${userId}`, {
      rareBoost: rareBoost,
      expiry: buffExpiry,
    });

    // Set prayer cooldown
    await db.set(`pray_${userId}`, Date.now());

    // Create prayer messages array
    const prayerMessages = [
      "You kneel and offer a silent prayer to the ARK gods.",
      "You light incense and meditate, seeking the favor of the ARK gods.",
      "You perform an ancient ritual to appease the guardians of the rare dinosaurs.",
      "You offer tribute to the spirits of the prehistoric beasts.",
      "You recite ancient words passed down from the most successful dinosaur hunters.",
    ];

    // Select random prayer message
    const prayerMessage =
      prayerMessages[Math.floor(Math.random() * prayerMessages.length)];

    // Create prayer success embed
    const prayerEmbed = new EmbedBuilder()
      .setColor("#9B59B6") // Purple color for spiritual/mystical
      .setTitle("🙏 Prayer to the ARK Gods")
      .setDescription(
        `${prayerMessage}\n\nThe ARK gods have heard your prayer!`
      )
      .addFields(
        {
          name: "Blessing Received",
          value: `Increased chance to find rare and legendary dinosaurs by **${rareBoost}%**!`,
          inline: false,
        },
        {
          name: "Duration",
          value: `This blessing will last for **30 minutes**`,
          inline: true,
        },
        {
          name: "Cooldown",
          value: "You can pray again in **1 hour**",
          inline: true,
        }
      )
      .setImage("https://i.imgur.com/GJqsrhP.png") // ARK altar/obelisk image
      .setFooter({
        text: "Use !catch within the next 30 minutes for better chances!",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Send the prayer result
    return message.channel.send({ embeds: [prayerEmbed] });
  },
};
