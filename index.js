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

// Combine raw Google Sheets date + time into Pacific time
function buildPacificDate(liveDateRaw, liveTimeRaw) {
    const datePart = new Date(liveDateRaw);
    const timePart = new Date(liveTimeRaw);

    const combined = new Date(
        datePart.getFullYear(),
        datePart.getMonth(),
        datePart.getDate(),
        timePart.getHours(),
        timePart.getMinutes()
    );

    return new Date(combined.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

// Schedule 15-minute reminder
function scheduleReminder(liveDateObj, roleId, clientName) {
    const reminderTime = new Date(liveDateObj.getTime() - 15 * 60 * 1000);
    const delay = reminderTime.getTime() - Date.now();

    if (delay > 0) {
        console.log(`Scheduling reminder for ${clientName} at ${reminderTime.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`);
        setTimeout(async () => {
            try {
                const channel = await discordClient.channels.fetch(CHANNEL_ID);
                await channel.send(`<@&${roleId}>\nReminder: ${clientName} goes live in 15 minutes!`);
                console.log(`Sent reminder for ${clientName}`);
            } catch (err) {
                console.error('Error sending reminder:', err);
            }
        }, delay);
    } else {
        console.log(`Skipped reminder for ${clientName} (time already passed or too close)`);
    }
}

// Webhook endpoint for Google Apps Script
app.post('/new-live', async (req, res) => {
    try {
        const { clientName, pod, liveDate, liveTime } = req.body;
        if (!clientName || !pod || !liveDate || !liveTime) {
            return res.status(400).send('Missing fields');
        }

        const roleId = roleMap[pod];
        if (!roleId) {
            console.error(`Invalid pod name: ${pod}`);
            return res.status(400).send('Invalid Pod name');
        }

        const liveDateObj = buildPacificDate(liveDate, liveTime);

        const liveDateFormatted = liveDateObj.toLocaleDateString("en-US", { 
            month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles"
        });
        const liveTimeFormatted = liveDateObj.toLocaleTimeString("en-US", { 
            hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles"
        });

        const formattedMessage = `<@&${roleId}>\n${clientName} – ${liveDateFormatted} at ${liveTimeFormatted} PST`;

        const channel = await discordClient.channels.fetch(CHANNEL_ID);
        await channel.send(formattedMessage);
        console.log(`Posted new live for ${clientName} (${pod})`);

        // Schedule 15-min reminder
        scheduleReminder(liveDateObj, roleId, clientName);

        res.status(200).send('Success');
    } catch (err) {
        console.error('Error posting to Discord:', err);
        res.status(500).send('Error posting to Discord');
    }
});

discordClient.login(DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server running on port ${PORT}`));
