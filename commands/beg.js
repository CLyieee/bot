const db = require("../utils/database");
const {
  getDisplayName,
  formatNumber,
  checkCooldown,
} = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "beg",
  description: "Beg for atlyss coins",
  usage: "!beg",
  cooldown: 24 * 60 * 60 * 1000, // 24 hours
  async execute(message) {
    // Check if the user is on cooldown
    const lastBegged = await db.get(`beg_${message.author.id}`);
    const cooldownCheck = checkCooldown(lastBegged, this.cooldown);

    if (cooldownCheck.onCooldown) {
      // Create a cooldown card using embeds
      const cooldownEmbed = new EmbedBuilder()
        .setColor("#e74c3c") // Red color for cooldown
        .setAuthor({
          name: `${getDisplayName(message.member)} | Begging Cooldown`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `You already begged today!\nTry again in **${cooldownCheck.timeLeft}**`
        )
        .setThumbnail("https://i.imgur.com/wuDq3yU.png") // Clock/timer icon
        .setFooter({
          text: "Cooldown resets in 24 hours",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // User can beg for coins
    const amount = Math.floor(Math.random() * 5000) + 1000; // Random 10 - 60

    // Update database
    await db.add(`cash_${message.author.id}`, amount);
    await db.set(`beg_${message.author.id}`, Date.now());

    // Get user's display name
    const displayName = getDisplayName(message.member);

    // Create a success card using embeds
    const successEmbed = new EmbedBuilder()
      .setColor("#3498db") // Blue color for success
      .setAuthor({
        name: `${displayName} | Begging Results`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `You begged and received **${formatNumber(amount)}** atlyss coins!`
      )
      .setThumbnail("https://i.imgur.com/FpZ3WEs.png") // Hand/begging icon
      .setFooter({
        text: "Come back tomorrow to beg again",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Send the card design message
    message.channel.send({ embeds: [successEmbed] });
  },
};
