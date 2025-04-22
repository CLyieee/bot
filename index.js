require("dotenv").config(); // Load environment variables
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Create a collection for commands
client.commands = new Collection();

// Load all command files
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".js"));

// Register each command
for (const file of commandFiles) {
  const command = require(path.join(__dirname, "commands", file));
  client.commands.set(command.name, command);
  console.log(`Loaded command: ${command.name}`);
}

const TOKEN = process.env.DISCORD_TOKEN; 

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Command handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Check if message starts with a command prefix
  const prefix = "!";
  if (!message.content.startsWith(prefix)) return;

  // Parse command and arguments
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Check if command exists
  if (!client.commands.has(commandName)) return;

  // Execute command
  try {
    const command = client.commands.get(commandName);
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply("There was an error executing that command.");
  }
});

client.login(TOKEN); // Login using the bot token
