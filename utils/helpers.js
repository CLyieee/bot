const ms = require("ms");

/**
 * Get formatted display name for a user
 * @param {Object} member - Discord guild member
 * @returns {String} - Display name in uppercase
 */
function getDisplayName(member) {
  return (member.displayName || member.user.username).toUpperCase();
}

/**
 * Get highest role of a member if not @everyone
 * @param {Object} member - Discord guild member
 * @returns {String} - Role name with comma or empty string
 */
function getHighestRole(member) {
  return member.roles.highest.name === "@everyone"
    ? ""
    : `${member.roles.highest.name}, `;
}

/**
 * Format a number with commas
 * @param {Number} number - Number to format
 * @returns {String} - Formatted number string
 */
function formatNumber(number) {
  return number.toLocaleString();
}

/**
 * Check if a cooldown has passed
 * @param {Number} lastUsed - Timestamp of last use
 * @param {Number} cooldownTime - Cooldown time in milliseconds
 * @returns {Object} - { onCooldown, timeLeft }
 */
function checkCooldown(lastUsed, cooldownTime) {
  if (lastUsed === null) return { onCooldown: false };

  const now = Date.now();
  const timePassed = now - lastUsed;
  const timeLeft = cooldownTime - timePassed;

  if (timeLeft > 0) {
    return {
      onCooldown: true,
      timeLeft: ms(timeLeft),
    };
  }

  return { onCooldown: false };
}

module.exports = {
  getDisplayName,
  getHighestRole,
  formatNumber,
  checkCooldown,
};
