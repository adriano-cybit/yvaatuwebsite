// Lädt die Umgebungsvariablen aus der .env-Datei (z. B. CLIENT_ID, CLIENT_SECRET, DISCORD_SERVER_ID)
require('dotenv').config();

// Importiert wichtige Module: Express für den Server, Axios für HTTP-Anfragen, Path für Dateipfade
const express = require('express');
const axios = require('axios');
const path = require('path');

// Initialisiert die Express-Anwendung
const app = express();
// Definiert den Port (nutzt den von Render vorgegebenen Port oder standardmäßig 3000)
const PORT = process.env.PORT || 3000;

// --- GLOBALER REQUEST-LOGGER ---
// Diese Funktion läuft bei JEDER Anfrage im Hintergrund mit und schreibt in die Konsole, 
// welche URL oder Methode gerade aufgerufen wurde (ideal zur Fehlersuche).
app.use((req, res, next) => {
    console.log(`[REQUEST EINGETROFFEN] Methode: ${req.method} | URL: ${req.url}`);
    next(); // Gibt den Weg frei für die nächste Funktion
});

// Sagt dem Server, dass er alle statischen Dateien (wie deine index.html, CSS etc.) im aktuellen Ordner anzeigen darf
app.use(express.static(path.join(__dirname)));


// --- ROUTE 1: Der Login-Startpunkt ---
// Wenn ein Nutzer auf deiner Website auf den Discord-Login klickt, wird diese Route aufgerufen.
app.get('/auth/discord', (req, res) => {
    console.log("--> Login-Route aufgerufen");

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = encodeURIComponent(`${protocol}://${host}/auth/discord/callback`);

    // Erstellt die offizielle Discord-Login-URL mit deinen Berechtigungen (Identify & Guilds)
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`;

    // Leitet den Nutzer direkt zur Discord-Anmeldeseite weiter
    res.redirect(url);
});


// --- ROUTE 2: Der Callback (Die Rückkehr von Discord) ---
// Hier landet der Nutzer wieder, nachdem er sich bei Discord eingeloggt hat.
app.get('/auth/discord/callback', async (req, res) => {
    console.log("--> CALLBACK ROUTE WURDE ERFOLGREICH ERREICHT!");

    // Holt den temporären "Code" aus der URL, den Discord geschickt hat
    const code = req.query.code;
    if (!code) return res.send('Kein Code erhalten.');

    try {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const currentRedirectUri = `${protocol}://${host}/auth/discord/callback`;

        // Bereitet die Daten vor, um den temporären Code bei Discord gegen einen offiziellen Access Token einzutauschen
        const params = new URLSearchParams();
        params.append('client_id', process.env.CLIENT_ID);
        params.append('client_secret', process.env.CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', currentRedirectUri);

        // Sendet die Anfrage an Discord und holt den Access Token ab
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // Fragt bei Discord an: "Auf welchen Servern ist dieser Nutzer Mitglied?"
        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userGuilds = guildsResponse.data;
        const yvaatuServerId = process.env.DISCORD_SERVER_ID;

        // Prüft, ob die ID deines Discord-Servers in der Liste der Server des Nutzers vorkommt
        const isMember = userGuilds.some(guild => guild.id === yvaatuServerId);

        // Wenn der Nutzer Mitglied ist: Leite ihn zur index.html mit Erfolgshinweis weiter
        // Wenn nicht: Leite ihn mit einer Fehlermeldung weiter
        if (isMember) {
            res.redirect('/index.html?verified=true');
        } else {
            res.redirect('/index.html?error=not_on_server');
        }

    } catch (error) {
        // Falls bei der Kommunikation mit Discord etwas schiefgeht, wird der Fehler abgefangen
        console.error("Fehler beim Discord Login:", error.response?.data || error.message);
        res.send('Es gab ein Problem bei der Verifizierung mit Discord.');
    }
});

// Fallback für alle anderen GET-Anfragen, damit deine Seite nicht einfach "Not Found" zeigt
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER STARTEN ---
// Startet den Webserver und wartet auf eingehende Aufrufe auf dem festgelegten Port
app.listen(PORT, () => {
    console.log(`Server läuft fehlerfrei auf Port ${PORT}`);
});