require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database('discovery.db');

const MASTER_API_KEY = process.env.DISCOVERY_API_KEY;

const apiKeyAuth = (req, res, next) => {
    const userKey = req.headers['x-api-key'];
    
    if (userKey && userKey === MASTER_API_KEY) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized. Valid API key required." });
    }
};

db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT UNIQUE, 
        server_name TEXT NOT NULL,
        icon_url TEXT,
        banner_url TEXT,
        invite_link TEXT UNIQUE,
        members INTEGER DEFAULT 0,
        description TEXT,
        is_verified INTEGER DEFAULT 0,
        owner TEXT,
        added_on DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'now')),
        last_bumped DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'now'))
    )
`);

app.get('/api/servers', (req, res) => {
    const { sort, q } = req.query;
    let queryStr = "SELECT * FROM servers";
    const params = [];

    if (q) {
        queryStr += " WHERE server_name LIKE ? OR description LIKE ?";
        params.push(`%${q}%`, `%${q}%`);
    }

    switch (sort) {
        case 'members': queryStr += " ORDER BY members DESC"; break;
        case 'activity': queryStr += " ORDER BY is_verified DESC, members DESC, last_bumped DESC"; break;
        case 'newest': queryStr += " ORDER BY added_on DESC"; break;
        case 'bumps':
        default: queryStr += " ORDER BY last_bumped DESC"; break;
    }

    try {
        const servers = db.prepare(queryStr).all(...params);
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/servers/:sid', (req, res) => {
    try {
        const server = db.prepare("SELECT * FROM servers WHERE server_id = ?").get(req.params.sid);
        if (!server) return res.status(404).json({ error: "Not found" });
        res.json(server);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/servers', apiKeyAuth, (req, res) => {
    const { 
        server_id, server_name, icon_url, banner_url, 
        invite_link, members, description, owner 
    } = req.body;

    try {
        const upsert = db.prepare(`
            INSERT INTO servers (server_id, server_name, icon_url, banner_url, invite_link, members, description, owner)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(server_id) DO UPDATE SET
                server_name=excluded.server_name,
                icon_url=excluded.icon_url,
                banner_url=excluded.banner_url,
                description=excluded.description,
                members=excluded.members,
                invite_link=excluded.invite_link
        `);
        
        upsert.run(server_id, server_name, icon_url, banner_url, invite_link, members || 0, description, owner);
        res.status(200).json({ message: "Server listing synced successfully." });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/servers/:sid/bump', apiKeyAuth, (req, res) => {
    const { sid } = req.params;

    try {
        const server = db.prepare("SELECT last_bumped FROM servers WHERE server_id = ?").get(sid);

        if (!server) {
            return res.status(404).json({ error: "Server not found in discovery." });
        }

        const now = Date.now();
        const lastBump = new Date(server.last_bumped).getTime(); 
        const twoHoursInMs = 2 * 60 * 60 * 1000;

        if (now - lastBump < twoHoursInMs) {
            const remainingMinutes = Math.ceil((twoHoursInMs - (now - lastBump)) / (1000 * 60));
            return res.status(429).json({ 
                error: `Slow down! You can bump again in ${remainingMinutes} minutes.`
            });
        }

        const timestamp = new Date().toISOString();
        db.prepare("UPDATE servers SET last_bumped = ? WHERE server_id = ?").run(timestamp, sid);

        res.json({ message: "Server bumped to the top!" });
    } catch (err) {
        console.error("Bump Error:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});

app.patch('/api/servers/:sid', apiKeyAuth, (req, res) => {
    const { is_verified, description } = req.body;
    try {
        const update = db.prepare(`
            UPDATE servers 
            SET is_verified = COALESCE(?, is_verified),
                description = COALESCE(?, description)
            WHERE server_id = ?
        `);
        update.run(is_verified, description, req.params.sid);
        res.json({ message: "Updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function refreshServerData() {
    console.log(`[${new Date().toISOString()}] Refreshing all server data...`);
    const servers = db.prepare("SELECT server_id, invite_link FROM servers").all();

    for (const s of servers) {
        try {
            const inviteCode = s.invite_link.split('/').pop();
            const response = await axios.get(`https://stoat.chat/api/invites/${inviteCode}`);
            const data = response.data;

            db.prepare(`
                UPDATE servers SET 
                    members = ?, 
                    server_name = ?,
                    icon_url = ?,
                    banner_url = ?
                WHERE server_id = ?
            `).run(
                data.member_count || 0,
                data.server_name,
                data.server_icon?._id ? `https://cdn.stoatusercontent.com/icons/${data.server_icon._id}?max_side=256` : null,
                data.server_banner?._id ? `https://cdn.stoatusercontent.com/banners/${data.server_banner._id}` : null,
                s.server_id
            );
        } catch (e) {
            console.error(`Could not refresh ${s.server_id}: ${e.message}`);
        }
    }
    console.log("Refresh complete.");
}

setInterval(refreshServerData, 1000 * 60 * 60 * 4);

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shitty Backend Running On: http://localhost:${PORT}`);
});
