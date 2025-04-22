const db = require("../utils/database");
const { getDisplayName, formatNumber } = require("../utils/helpers");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "recharge",
  description: "Privately top up a user's atlyss coins balance (Admin only)",
  usage: "!recharge [amount] @user",
  aliases: ["recharge", "add-coins", "admin-add"],
  cooldown: 5000, // 5 seconds
  async execute(message, args) {
    const userId = message.author.id;
    const displayName = getDisplayName(message.member);

    // Delete the original command message to keep it private
    try {
      await message.delete();
    } catch (error) {
      console.log("Couldn't delete command message. Continuing anyway.");
    }

    // Only administrators can use this command
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      // Send a private error message
      return message.author.send(
        "You don't have permission to use this command."
      );
    }

    // Check if user has provided an amount
    if (args.length < 1) {
      return message.author.send(
        "Please specify an amount to top up. Usage: `!recharge [amount] @user`"
      );
    }

    // Parse amount
    let amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      return message.author.send(
        "Please provide a valid positive number for the amount."
      );
    }

    // Cap the amount at a reasonable value
    const MAX_AMOUNT = 1000000;
    if (amount > MAX_AMOUNT) {
      amount = MAX_AMOUNT;
      await message.author.send(
        `The maximum top up amount is ${formatNumber(
          MAX_AMOUNT
        )} coins at once.`
      );
    }

    // Determine target user
    let targetUser = message.author; // Default to sender
    let targetUserId = userId;
    let targetDisplayName = displayName;

    // If a user is mentioned, use that user instead
    if (message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first();
      targetUserId = targetUser.id;

      // Get the GuildMember object for the mentioned user
      const targetMember = message.guild.members.cache.get(targetUserId);
      targetDisplayName = targetMember
        ? getDisplayName(targetMember)
        : targetUser.username;
    }

    try {
      // Create loading embed
      const loadingEmbed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("💰 Processing Top Up")
        .setDescription(
          `Processing request to add ${formatNumber(
            amount
          )} atlyss coins to ${targetDisplayName}...`
        )
        .setFooter({
          text: "Please wait, this may take a moment.",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Send loading embed as a DM
      const loadingMsg = await message.author.send({ embeds: [loadingEmbed] });

      // Get current balance of target user
      const currentBalance = (await db.get(`cash_${targetUserId}`)) || 0;

      // Add recharge amount to target user's balance
      await db.add(`cash_${targetUserId}`, amount);

      // Get new balance
      const newBalance = (await db.get(`cash_${targetUserId}`)) || 0;

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("💰 Top Up Successful")
        .setDescription(
          `**${targetDisplayName}**'s account has been topped up with **${formatNumber(
            amount
          )}** atlyss coins!`
        )
        .addFields(
          {
            name: "Previous Balance",
            value: `${formatNumber(currentBalance)} coins`,
            inline: true,
          },
          {
            name: "Top Up Amount",
            value: `${formatNumber(amount)} coins`,
            inline: true,
          },
          {
            name: "New Balance",
            value: `${formatNumber(newBalance)} coins`,
            inline: true,
          }
        )
        .setThumbnail("https://i.imgur.com/7BFD5j1.png") // Coin/money icon
        .setFooter({
          text: "Atlyss Economy System - ADMIN ACTION",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Update the message with the success embed via DM
      await loadingMsg.edit({ embeds: [successEmbed] });

      // Optionally notify the target user about the balance change (in DM to keep it private)
      if (targetUserId !== userId) {
        try {
          const userNotificationEmbed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("💰 Balance Updated")
            .setDescription(
              `An administrator has added **${formatNumber(
                amount
              )} coins** to your account!`
            )
            .addFields({
              name: "New Balance",
              value: `${formatNumber(newBalance)} coins`,
            })
            .setFooter({
              text: "Atlyss Economy System",
              iconURL: message.client.user.displayAvatarURL(),
            })
            .setTimestamp();

          await targetUser.send({ embeds: [userNotificationEmbed] });
        } catch (error) {
          // If we can't DM the user, just add a note in the admin's DM
          await message.author.send(
            "Note: Could not send notification to the user. They might have DMs disabled."
          );
        }
      }
    } catch (error) {
      console.error("Error in topup command:", error);
      message.author.send(
        "There was an error processing your top up. Please try again later."
      );
    }
  },
};
