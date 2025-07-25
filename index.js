const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const app = express();
app.use(express.json());

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

discordClient.once('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}`);
});

// Map Pod names to Discord Role IDs
const roleMap = {
    "Pod 1": "1379498582209724498",
    "Pod 2": "1379498797222199407",
    "Pod 3": "1379498838322053251",
    "Pod 4": "1379498870240968714",
    "Pod 5": "1379498903308865626",
    "Pod 6": "1385286282552279040"
};

// New live endpoint (main ping)
app.post('/new-live', async (req, res) => {
    try {
        const { clientName, pod, liveDateTime } = req.body;
        if (!clientName || !pod || !liveDateTime) {
            return res.status(400).send('Missing fields');
        }

        const roleId = roleMap[pod];
        if (!roleId) {
            console.error(`Invalid pod name: ${pod}`);
            return res.status(400).send('Invalid Pod name');
        }

        const liveDateObj = new Date(liveDateTime);
        const liveDateFormatted = liveDateObj.toLocaleDateString("en-US", { 
            month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles"
        });
        const liveTimeFormatted = liveDateObj.toLocaleTimeString("en-US", { 
            hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles"
        });

        const formattedMessage = `<@&${roleId}>\n${clientName} – ${liveDateFormatted} at **${liveTimeFormatted} PST**`;

        const channel = await discordClient.channels.fetch(CHANNEL_ID);
        await channel.send(formattedMessage);
        console.log(`Posted new live for ${clientName} (${pod})`);

        res.status(200).send('Success');
    } catch (err) {
        console.error('Error posting to Discord:', err);
        res.status(500).send('Error posting to Discord');
    }
});

// Reminder endpoint (called by Apps Script cron)
app.post('/send-reminder', async (req, res) => {
    try {
        const { clientName, pod } = req.body;
        const roleId = roleMap[pod];
        if (!clientName || !roleId) return res.status(400).send('Missing fields');

        const channel = await discordClient.channels.fetch(CHANNEL_ID);
        await channel.send(`<@&${roleId}>\nReminder: ${clientName} goes live in 15 minutes!`);
        console.log(`Sent reminder for ${clientName}`);
        res.status(200).send('Reminder sent');
    } catch (err) {
        console.error('Error posting reminder:', err);
        res.status(500).send('Error posting reminder');
    }
});

discordClient.login(DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server running on port ${PORT}`));
