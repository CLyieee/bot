const db = require("../utils/database");
const {
  getDisplayName,
  getHighestRole,
  formatNumber,
} = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "balance",
  description: "Check your atlyss coins balance",
  usage: "!balance",
  async execute(message) {
    // Get user's balance from database
    const balance = (await db.get(`cash_${message.author.id}`)) || 0;

    // Get user's display name and role
    const displayName = getDisplayName(message.member);
    const role = getHighestRole(message.member);

    // Create a card design using embeds
    const embed = new EmbedBuilder()
      .setColor("#2ecc71") // Green color
      .setAuthor({
        name: `${displayName}'s Balance`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `You currently have **${formatNumber(balance)}** atlyss coins!`
      )
      
      .setFooter({
        text: "Atlyss Economy System",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    // Send the card design message
    message.channel.send({ embeds: [embed] });
  },
};
