// middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ message: 'Acesso não autorizado: Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Acesso proibido: Token inválido.' });
        }
        
        // Adiciona os dados do usuário (do token) ao objeto da requisição
        req.user = user;
        next();
    });
}

module.exports = authMiddleware;