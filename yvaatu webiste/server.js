require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Globaler Request-Logger: Zeigt JEDEN Aufruf in den Render-Logs an
app.use((req, res, next) => {
    console.log(`[REQUEST EINGETROFFEN] Methode: ${req.method} | URL: ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname)));

app.get('/auth/discord', (req, res) => {
    console.log("--> Login-Route aufgerufen");
    const redirectUri = encodeURIComponent('https://yvaatuwebsite.onrender.com/auth/discord/callback');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;
    res.redirect(url);
});

app.get('/auth/discord/callback', async (req, res) => {
    console.log("--> CALLBACK ROUTE WURDE ERFOLGREICH ERREICHT!");
    
    const code = req.query.code;
    if (!code) return res.send('Kein Code erhalten.');

    try {
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
            res.redirect('https://yvaatuwebsite.onrender.com/index.html?verified=true');
        } else {
            res.redirect('https://yvaatuwebsite.onrender.com/index.html?error=not_on_server');
        }

    } catch (error) {
        console.error("Fehler beim Discord Login:", error.message);
        res.send('Es gab ein Problem bei der Verifizierung mit Discord.');
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft fehlerfrei auf Port ${PORT}`);
});
