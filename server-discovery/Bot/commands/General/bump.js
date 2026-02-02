const api = require('../../utils/api');

module.exports = {
    name: 'bump',
    execute: async (message) => {
        const server = message.server;

        if (!server) return message.reply("❌ This command must be used within a server.");

        try {
            const response = await api.bumpServer(server.id);
            if (response.error) {
                return message.reply(`⏳ ${response.error}`);
            }
            message.reply(`🚀 **Bumped!** Your server has been pushed to the top of the discovery list.`);

        } catch (err) {
            console.error("Bump Command Error:", err);
            message.reply("❌ **Error:** Could not connect to the discovery backend.");
        }
    }
};