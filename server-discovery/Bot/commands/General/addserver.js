const api = require('../../utils/api');

module.exports = {
    execute: async (message, prefix, ...args) => {
        const server = message.server;
        const inviteInput = args[0];
        
        if (!server) return message.reply("❌ This command must be used within a server.");
        if (!inviteInput) return message.reply(`❌ Usage: \`${prefix}addserver <invite_link>\``);
        
        if (message.author.id !== server.ownerId) {
            return message.reply("⛔ Only the server owner can register this server.");
        }

        const msg = await message.reply("🛰️ Fetching server data...");

        try {
            const inviteCode = inviteInput.split('/').pop();
            const stoatResponse = await fetch(`https://stoat.chat/api/invites/${inviteCode}`);
            
            if (!stoatResponse.ok) {
                return msg.edit("❌ **Error:** That invite code was not found.");
            }

            const inviteData = await stoatResponse.json();

            if (inviteData.server_id !== server.id) {
                return msg.edit("❌ **Failed:** This invite belongs to a different server.");
            }

            const iconId = inviteData.server_icon?._id;
            const bannerId = inviteData.server_banner?._id;

            const finalData = {
                server_name: server.name,
                server_id: server.id,
                icon_url: iconId ? `https://cdn.stoatusercontent.com/icons/${iconId}?max_side=256` : null,
                banner_url: bannerId ? `https://cdn.stoatusercontent.com/banners/${bannerId}` : null,
                invite_link: `https://stoat.chat/invite/${inviteCode}`,
                members: inviteData.member_count || 0,
                description: server.description || "No description provided.",
                owner: message.author.username || "Unknown",
                is_verified: 0
            };

            const response = await api.addServer(finalData);

            if (response.error) {
                return msg.edit(`❌ **Backend Error:** ${response.error}`);
            }

            msg.edit(`✨ **${server.name}** is now live`)

        } catch (err) {
            console.error("Fetch Error:", err);
            msg.edit("❌ **Error:** Failed to reach the backend.");
        }
    }
};