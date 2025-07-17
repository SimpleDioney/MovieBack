// backend/routes/stream.js

const express = require('express');
const router = express.Router();
const axios = require('axios');

// ✅ ROTA CORRIGIDA PARA FILMES
router.get('/movie/:tmdbId', async (req, res) => {
    const { tmdbId } = req.params;
    const megaEmbedUrl = `https://megaembed.com/embed/movie?tmdb=${tmdbId}`;
    
    streamContent(megaEmbedUrl, res);
});

// ✅ ROTA CORRIGIDA PARA SÉRIES
router.get('/series/:tmdbId', async (req, res) => {
    const { tmdbId } = req.params;
    const { sea, epi } = req.query; // Pega temporada e episódio da query string
    
    if (!sea || !epi) {
        return res.status(400).send('Para séries, os parâmetros "sea" (temporada) e "epi" (episódio) são obrigatórios.');
    }

    const megaEmbedUrl = `https://megaembed.com/embed/series?tmdb=${tmdbId}&sea=${sea}&epi=${epi}`;
    
    streamContent(megaEmbedUrl, res);
});


// Função auxiliar para evitar repetição de código
async function streamContent(url, res) {
    console.log(`Iniciando proxy de stream para: ${url}`);
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        });

        // Repassa os cabeçalhos importantes da fonte original para o seu frontend
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Content-Length', response.headers['content-length']);
        res.setHeader('Accept-Ranges', 'bytes');
        
        // Conecta a stream da MegaEmbed diretamente na resposta para o usuário
        response.data.pipe(res);

    } catch (error) {
        console.error("Erro ao fazer o proxy do stream:", error.message);
        if (error.response) {
            res.status(error.response.status).send('Conteúdo não encontrado na fonte original.');
        } else {
            res.status(502).send('Erro de comunicação com o servidor de vídeo.'); // 502 Bad Gateway
        }
    }
}

module.exports = router;