require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Stellt deine HTML-Dateien im Ordner bereit
app.use(express.static(path.join(__dirname)));

// 1. Discord Login Weiterleitung
app.get('/auth/discord', (req, res) => {
    const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(discordUrl);
});

// 2. OAuth2 Callback & Server-Prüfung
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/yvaatupage2.html');

    try {
        // Token von Discord anfordern
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.REDIRECT_URI,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // Abrufen, auf welchen Servern der Nutzer ist
        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Prüfen, ob der Nutzer auf DEINEM Server ist
        const isInServer = guildsResponse.data.some(guild => guild.id === process.env.DISCORD_SERVER_ID);

        // Status in der Session speichern
        req.session.user = {
            authenticated: true,
            inServer: isInServer
        };

        res.redirect('/yvaatupage2.html');

    } catch (error) {
        console.error('Fehler beim Discord Login:', error);
        res.redirect('/yvaatupage2.html');
    }
});

// 3. API-Endpunkt für das Frontend (yvaatupage2.html)
app.get('/api/user-status', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.json({ authenticated: false, inServer: false });
    }
});

app.listen(3000, () => {
    console.log('Server läuft auf http://localhost:3000');
});
