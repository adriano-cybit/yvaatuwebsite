require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Erlaube dem Server, deine HTML-Dateien anzuzeigen
app.use(express.static(path.join(__dirname)));

// 1. Der Login-Link (Fest auf deine Render-URL eingestellt)
app.get('/auth/discord', (req, res) => {
    const redirectUri = encodeURIComponent('https://yvaatuwebsite.onrender.com/auth/discord/callback');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;
    res.redirect(url);
});

// 2. Der Callback
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('Kein Code erhalten.');

    try {
        // Auch hier fest codiert, damit es zu 100% mit Discord übereinstimmt
        const currentRedirectUri = 'https://yvaatuwebsite.onrender.com/auth/discord/callback';

        const params = new URLSearchParams();
        params.append('client_id', process.env.CLIENT_ID);
        params.append('client_secret', process.env.CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', currentRedirectUri);

        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userGuilds = guildsResponse.data;
        const yvaatuServerId = process.env.DISCORD_SERVER_ID;

        const isMember = userGuilds.some(guild => guild.id === yvaatuServerId);

        if (isMember) {
            res.redirect('/index.html?verified=true');
        } else {
            res.redirect('/index.html?error=not_on_server');
        }

    } catch (error) {
        console.error("Fehler beim Discord Login:", error.message);
        res.send('Es gab ein Problem bei der Verifizierung mit Discord.');
    }
});
    try {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const currentRedirectUri = `${protocol}://${host}/auth/discord/callback`;

        // Tausche den Code gegen einen Zugriffs-Token ein
        const params = new URLSearchParams();
        params.append('client_id', process.env.CLIENT_ID);
        params.append('client_secret', process.env.CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', currentRedirectUri);

        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // Rufe alle Discord-Server ab, auf denen der User ist
        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userGuilds = guildsResponse.data;
        const yvaatuServerId = process.env.DISCORD_SERVER_ID;

        // Prüfe, ob deine Yvaatu Server-ID in seiner Liste ist
        const isMember = userGuilds.some(guild => guild.id === yvaatuServerId);

        if (isMember) {
            // ERFOLG! Leite zurück zur Startseite mit einem Erfolgs-Code
            res.redirect('/index.html?verified=true');
        } else {
            // FEHLSCHLAG! User ist nicht auf dem Server
            res.redirect('/index.html?error=not_on_server');
        }

    } catch (error) {
        console.error("Fehler beim Discord Login:", error.message);
        res.send('Es gab ein Problem bei der Verifizierung mit Discord.');
    }
});

// Starte den Server
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});