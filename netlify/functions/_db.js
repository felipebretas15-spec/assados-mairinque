const { neon } = require('@neondatabase/serverless');

function getSql() {
    return neon(process.env.DATABASE_URL);
}

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

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

module.exports = { getSql, ok, okCached, err, optionsResponse };
