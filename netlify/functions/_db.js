const { neon } = require('@neondatabase/serverless');

function getSql() {
    return neon(process.env.DATABASE_URL);
}

// Restringe o CORS ao domínio do próprio site quando disponível (Netlify define
// process.env.URL em runtime). Sem isso definido (ex: dev local), cai para '*'.
const headers = {
    'Access-Control-Allow-Origin': process.env.URL || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Erro "esperado" (validação, etc) — seguro para mostrar ao cliente.
class ApiError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Use no catch dos handlers: erros de validação (ApiError) voltam com a
// mensagem original; qualquer outro erro (DB, driver, etc) é logado no
// servidor e responde com uma mensagem genérica, sem vazar detalhes internos.
function handleError(e) {
    if (e instanceof ApiError) return err(e.message, e.status);
    console.error(e);
    return err('Erro interno do servidor.', 500);
}

function ok(body, status = 200) {
    return { statusCode: status, headers, body: JSON.stringify(body) };
}

function okCached(body) {
    return {
        statusCode: 200,
        headers: { ...headers, 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' },
        body: JSON.stringify(body),
    };
}

function err(message, status = 500) {
    return { statusCode: status, headers, body: JSON.stringify({ error: message }) };
}

function optionsResponse() {
    return { statusCode: 200, headers, body: '' };
}

module.exports = { getSql, ok, okCached, err, optionsResponse, ApiError, handleError };
