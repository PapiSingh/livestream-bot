const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SHEET_WEBHOOK = process.env.SHEET_WEBHOOK; // <-- New: webhook back to Google Apps Script

const app = express();
app.use(express.json());

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

discordClient.once('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}`);
});

// Helper: Schedule reminder
function scheduleReminder(liveDate, liveTime, pod, clientName) {
    const liveDateTime = new Date(`${liveDate} ${liveTime} PST`);
    const reminderTime = new Date(liveDateTime.getTime() - 15 * 60 * 1000); // 15 mins before
    const delay = reminderTime.getTime() - Date.now();

    if (delay > 0) {
        setTimeout(async () => {
            const channel = await discordClient.channels.fetch(CHANNEL_ID);
            await channel.send(`@${pod}\nReminder: ${clientName} goes live in 15 minutes!`);
            console.log(`Sent reminder for ${clientName}`);
        }, delay);
    }
}

// Webhook endpoint for Google Apps Script
app.post('/new-live', async (req, res) => {
    try {
        const { clientName, pod, liveDate, liveTime, row } = req.body;
        if (!clientName || !pod || !liveDate || !liveTime || !row) {
            return res.status(400).send('Missing fields');
        }

        const channel = await discordClient.channels.fetch(CHANNEL_ID);

        // Format main message
        const formattedMessage = `@${pod}\n${clientName} – ${liveDate} at ${liveTime} PST`;
        await channel.send(formattedMessage);
        console.log(`Posted new live for ${clientName} (${pod})`);

        // Schedule 15-min reminder
        scheduleReminder(liveDate, liveTime, pod, clientName);

        // Mark as Posted in Google Sheet
        if (SHEET_WEBHOOK) {
            await fetch(SHEET_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ row: row })
            });
            console.log(`Marked row ${row} as Posted`);
        }

        res.status(200).send('Success');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error posting to Discord');
    }
});

discordClient.login(DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server running on port ${PORT}`));
