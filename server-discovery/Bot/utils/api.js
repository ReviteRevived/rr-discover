const BASE_URL = 'https://api.asraye.com/api';

const DiscoveryAPI = {
    getServers: async (sort = 'bumps', query = '') => {
        try {
            const res = await fetch(`${BASE_URL}/servers?sort=${sort}&q=${query}`);
            return await res.json();
        } catch (err) {
            console.error("Discovery API Error (getServers):", err);
            return { error: "Failed to fetch servers." };
        }
    },

    getServer: async (serverId) => {
        try {
            const res = await fetch(`${BASE_URL}/servers/${serverId}`);
            return await res.json();
        } catch (err) {
            console.error("Discovery API Error (getServer):", err);
            return { error: "Server listing not found." };
        }
    },

    addServer: async (serverData) => {
        try {
            const res = await fetch(`${BASE_URL}/servers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serverData)
            });
            return await res.json();
        } catch (err) {
            console.error("Discovery API Error (addServer):", err);
            return { error: "Failed to post to discovery server." };
        }
    },

    bumpServer: async (serverId) => {
        try {
            const res = await fetch(`${BASE_URL}/servers/${serverId}/bump`, {
                method: 'POST'
            });
            return await res.json();
        } catch (err) {
            console.error("Discovery API Error (bumpServer):", err);
            return { error: "Failed to bump server." };
        }
    }
};

module.exports = DiscoveryAPI;