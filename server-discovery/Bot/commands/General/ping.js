module.exports = {
    execute: async (message, prefix, ...args) => {
        const start = Date.now();
        const msg = await message.reply("Pinging...");
        const latency = Date.now() - start;
        msg.edit(`🏓 **Pong!**\nLatency: \`${latency}ms\``);
    }
};