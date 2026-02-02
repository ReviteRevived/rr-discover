require("dotenv").config();
const { client, Status } = require("stoatbot.js");
const { handleCommand } = require("./utils/commandHandler");
const api = require("./utils/api"); 

const token = process.env.TOKEN;
const prefix = process.env.PREFIX || ";";

const bot = new client({
  ignoreBots: true,
});

async function updateDiscoveryPresence() {
  try {
    const servers = await api.getServers(); 
    if (Array.isArray(servers)) {
      const totalMembers = servers.reduce((acc, s) => acc + (s.members || 0), 0);
      const serverCount = servers.length;
      
      bot.user?.setStatus(
        `Watching ${serverCount} servers with ${totalMembers.toLocaleString()} members! 🛰️`, 
        Status.Online
      );
    }
  } catch (err) {
    console.error("Presence Sync Failed:", err.message);
    bot.user?.setStatus("Discovery Offline 📡", Status.DND);
  }
}

bot.on("ready", async () => {
  console.log("🚀 Bot is ready!");
  
  updateDiscoveryPresence();
  setInterval(updateDiscoveryPresence, 10 * 60 * 1000);
});

bot.on("message", async (message) => {
  if (!message || message.author?.bot || !message.content) return;
  handleCommand(message, prefix);
});

bot.login(token);

process.on("unhandledRejection", (reason, p) => {
  console.log(" [Error_Handling] :: Unhandled Rejection/Catch", reason);
});
process.on("uncaughtException", (err, origin) => {
  console.log(" [Error_Handling] :: Uncaught Exception/Catch", err);
});