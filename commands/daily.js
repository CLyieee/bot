const db = require("../utils/database");
const {
  getDisplayName,
  formatNumber,
  checkCooldown,
} = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "daily",
  description: "Claim your daily atlyss coins",
  usage: "!daily",
  cooldown: 24 * 60 * 60 * 1000, // 24 hours
  async execute(message) {
    // Check if the user is on cooldown
    const lastClaimed = await db.get(`daily_${message.author.id}`);
    const cooldownCheck = checkCooldown(lastClaimed, this.cooldown);

    if (cooldownCheck.onCooldown) {
      // Create a cooldown card using embeds
      const cooldownEmbed = new EmbedBuilder()
        .setColor("#e74c3c") // Red color for cooldown
        .setAuthor({
          name: `${getDisplayName(message.member)} | Daily Reward Cooldown`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `You already claimed your daily reward!\nTry again in **${cooldownCheck.timeLeft}**`
        )
        
        .setFooter({
          text: "Rewards reset every 24 hours",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // User can claim daily reward
    const amount = Math.floor(Math.random() * 5000) + 10000; // Random 100 - 600

    // Update database
    await db.add(`cash_${message.author.id}`, amount);
    await db.set(`daily_${message.author.id}`, Date.now());

    // Get user's display name
    const displayName = getDisplayName(message.member);

    // Create a success card using embeds
    const successEmbed = new EmbedBuilder()
      .setColor("#f1c40f") // Gold color for daily rewards
      .setAuthor({
        name: `${displayName} | Daily Reward`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `You claimed your daily reward and received **${formatNumber(
          amount
        )}** atlyss coins!`
      )
      .setThumbnail("https://i.imgur.com/qRsCeRO.png") // Gift/treasure icon
      .setFooter({
        text: "Come back tomorrow for more rewards",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Send the card design message
    message.channel.send({ embeds: [successEmbed] });
  },
};
