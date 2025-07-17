// backend/routes/api.js

const express = require('express');
const router = express.Router();
const tmdbApi = require('../config/tmdb');
const authMiddleware = require('../middleware/auth');
const cache = require('../services/cache');

module.exports = (db) => {

    //=====================================================//
    // ---- ROTAS PÚBLICAS (PROXY PARA A API DO TMDB) ---- //
    //=====================================================//

    router.get('/discover', cache(3600), async (req, res) => {
        try {
            const [moviesResponse, tvResponse] = await Promise.all([
                tmdbApi.get('/trending/movie/week'),
                tmdbApi.get('/trending/tv/week')
            ]);
            res.json({
                movies: moviesResponse.data.results,
                series: tvResponse.data.results
            });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar destaques do TMDB.', details: error.message });
        }
    });

    router.get('/search', async (req, res) => {
        const { query, type, page = 1 } = req.query;
        if (!query || !type) {
            return res.status(400).json({ message: 'Parâmetros query e type são obrigatórios.' });
        }
        try {
            const response = await tmdbApi.get(`/search/${type}`, { params: { query, page } });
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao realizar a busca no TMDB.', details: error.message });
        }
    });

    router.get('/genres', cache(86400), async (req, res) => {
        try {
            const response = await tmdbApi.get('/genre/movie/list');
            res.json(response.data.genres);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar gêneros do TMDB.' });
        }
    });

    router.get('/discover/genre', cache(3600), async (req, res) => {
        const { genreId, page = 1 } = req.query;
        if (!genreId) {
            return res.status(400).json({ message: 'Parâmetro genreId é obrigatório.' });
        }
        try {
            const response = await tmdbApi.get('/discover/movie', { params: { with_genres: genreId, page }});
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar por gênero no TMDB.' });
        }
    });

    router.get('/tv/:id/season/:seasonNumber', cache(86400), async (req, res) => {
        const { id, seasonNumber } = req.params;
        if (!id || !seasonNumber) {
            return res.status(400).json({ message: 'ID da série e número da temporada são obrigatórios.' });
        }
        try {
            const response = await tmdbApi.get(`/tv/${id}/season/${seasonNumber}`);
            res.json(response.data);
        } catch (error) {
            console.error('Erro ao buscar detalhes da temporada:', error.message);
            res.status(500).json({ message: 'Erro ao buscar detalhes da temporada no TMDB.' });
        }
    });

    // ✅ CORREÇÃO APLICADA AQUI
    // Substituímos a rota complexa por duas rotas simples e claras.
    
    // Rota para detalhes de Filmes
    router.get('/movie/:id', cache(86400), async (req, res) => {
        const { id } = req.params;
        try {
            const response = await tmdbApi.get(`/movie/${id}`, { 
                params: { append_to_response: 'videos,credits,recommendations' }
            });
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar detalhes do filme no TMDB.' });
        }
    });

    // Rota para detalhes de Séries de TV
    router.get('/tv/:id', cache(86400), async (req, res) => {
        const { id } = req.params;
        try {
            const response = await tmdbApi.get(`/tv/${id}`, { 
                params: { append_to_response: 'videos,credits,recommendations' }
            });
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar detalhes da série no TMDB.' });
        }
    });
    
    // Rota para detalhes de Pessoas (Atores/Atrizes)
    router.get('/person/:id', cache(86400), async (req, res) => {
        const { id } = req.params;
        try {
            const response = await tmdbApi.get(`/person/${id}`, {
                params: { append_to_response: 'movie_credits,tv_credits' }
            });
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar detalhes da pessoa no TMDB.' });
        }
    });


    //============================================================//
    // ---- ROTAS PROTEGIDAS (DADOS DO USUÁRIO NO BANCO SQLITE) ---- //
    //============================================================//

    router.get('/my-list', authMiddleware, async (req, res) => {
        try {
            const items = await db.all('SELECT tmdb_id as id, item_type, poster_path, title FROM watchlist WHERE user_id = ? ORDER BY added_at DESC', [req.user.id]);
            res.json(items);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar "Minha Lista" no banco de dados.' });
        }
    });

    router.post('/my-list', authMiddleware, async (req, res) => {
        const { tmdb_id, item_type, poster_path, title } = req.body;
        const user_id = req.user.id;

        if (!tmdb_id || !item_type || !title) {
            return res.status(400).json({ message: 'Dados do item incompletos.' });
        }

        try {
            const existing = await db.get('SELECT id FROM watchlist WHERE user_id = ? AND tmdb_id = ?', [user_id, tmdb_id]);
            
            if (existing) {
                await db.run('DELETE FROM watchlist WHERE id = ?', [existing.id]);
                res.json({ message: 'Item removido da lista.', action: 'removed' });
            } else {
                await db.run(
                    'INSERT INTO watchlist (user_id, tmdb_id, item_type, poster_path, title) VALUES (?, ?, ?, ?, ?)',
                    [user_id, tmdb_id, item_type, poster_path, title]
                );
                res.status(201).json({ message: 'Item adicionado à lista.', action: 'added' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Erro ao atualizar "Minha Lista" no banco de dados.' });
        }
    });

    router.get('/history', authMiddleware, async (req, res) => {
        try {
            const items = await db.all('SELECT tmdb_id as id, item_type, poster_path, title, progress FROM history WHERE user_id = ? ORDER BY last_watched DESC', [req.user.id]);
            res.json(items);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar histórico no banco de dados.' });
        }
    });

    router.post('/history', authMiddleware, async (req, res) => {
        const { tmdb_id, item_type, poster_path, title, progress } = req.body;
        const user_id = req.user.id;

        if (!tmdb_id || !item_type || !title || progress === undefined) {
            return res.status(400).json({ message: 'Dados de histórico incompletos.' });
        }

        try {
            await db.run(`
                INSERT INTO history (user_id, tmdb_id, item_type, poster_path, title, progress, last_watched)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, tmdb_id) DO UPDATE SET
                progress = excluded.progress,
                last_watched = CURRENT_TIMESTAMP;
            `, [user_id, tmdb_id, item_type, poster_path, title, progress]);
            
            res.status(200).json({ message: 'Progresso salvo com sucesso.' });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao salvar progresso no banco de dados.', details: error.message });
        }
    });

    return router;
};