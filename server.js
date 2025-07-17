// backend/server.js (VERSÃO FINAL E CORRETA)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initializeDatabase = require('./db/database');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

async function startServer() {
    const db = await initializeDatabase();

    // ---- ROTAS ----
    app.use('/auth', authRoutes(db)); // Rotas de autenticação
    app.use('/api', apiRoutes(db));   // Rotas da API de dados

    app.get('/', (req, res) => {
        res.send('Servidor do MegaFlix com SQLite e Autenticação está no ar!');
    });

    app.listen(port, () => {
        console.log(`Servidor backend final rodando em http://localhost:${port}`);
    });
}

startServer();