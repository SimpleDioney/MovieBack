// backend/config/tmdb.js

const axios = require('axios');
// A LINHA ABAIXO FOI CORRIGIDA
const { default: axiosRetry } = require('axios-retry');

// Criamos uma instância do Axios específica para o TMDB
const tmdbApi = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: {
    api_key: process.env.TMDB_API_KEY,
    language: 'pt-BR'
  }
});

// Configuramos o axios-retry
// Ele vai tentar novamente até 3 vezes se a requisição falhar com um erro de servidor (5xx)
axiosRetry(tmdbApi, { 
    retries: 3,
    retryDelay: (retryCount) => {
        console.log(`Tentativa de requisição #${retryCount} falhou. Tentando novamente em ${retryCount}s...`);
        return retryCount * 1000; // 1s, 2s, 3s de espera entre as tentativas
    },
    retryCondition: (error) => {
        // Tenta novamente apenas para erros de rede ou de servidor (5xx)
        if (!error.response) {
            return true; // Erros de rede (ex: DNS)
        }
        return error.response.status >= 500;
    }
});

module.exports = tmdbApi;