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

// Webhook endpoint for Google Apps Script
app.post('/new-live', async (req, res) => {
    try {
        const { clientName, pod, liveDate, liveTime } = req.body;
        if (!clientName || !pod || !liveDate || !liveTime) {
            return res.status(400).send('Missing fields');
        }

        const channel = await discordClient.channels.fetch(CHANNEL_ID);

        // Format the message
        const formattedMessage = `@${pod}\n${clientName} – ${liveDate} at ${liveTime} PST`;
        await channel.send(formattedMessage);

        console.log(`Posted new live for ${clientName} (${pod})`);
        res.status(200).send('Success');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error posting to Discord');
    }
});

discordClient.login(DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server running on port ${PORT}`));
