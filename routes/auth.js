// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = (db) => {
    // Rota de Cadastro: POST /auth/register
    router.post('/register', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
        }

        try {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            
            const result = await db.run(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                [username, password_hash]
            );

            res.status(201).json({ message: 'Usuário criado com sucesso.', userId: result.lastID });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ message: 'Nome de usuário já existe.' });
            }
            res.status(500).json({ message: 'Erro ao registrar usuário.', error: error.message });
        }
    });

    // Rota de Login: POST /auth/login
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
        }

        try {
            const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
            if (!user) {
                return res.status(401).json({ message: 'Credenciais inválidas.' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Credenciais inválidas.' });
            }

            // Gerar o Token JWT
            const payload = { id: user.id, username: user.username };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

            res.json({ message: 'Login bem-sucedido!', token, user: payload });

        } catch (error) {
            res.status(500).json({ message: 'Erro no servidor durante o login.', error: error.message });
        }
    });

    return router;
};