const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

function getSql() {
    return neon(process.env.DATABASE_URL);
}

// Restringe o CORS ao domínio do próprio site quando disponível (Netlify define
// process.env.URL em runtime). Sem isso definido (ex: dev local), cai para '*'.
const headers = {
    'Access-Control-Allow-Origin': process.env.URL || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

// Erro "esperado" (validação, autorização, etc) — seguro para mostrar ao cliente.
class ApiError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Use no catch dos handlers: erros de validação/autorização (ApiError) voltam
// com a mensagem original; qualquer outro erro (DB, driver, etc) é logado no
// servidor e responde com uma mensagem genérica, sem vazar detalhes internos.
function handleError(e) {
    if (e instanceof ApiError) return err(e.message, e.status);
    console.error(e);
    return err('Erro interno do servidor.', 500);
}

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas

// Sem ADMIN_TOKEN_SECRET configurado, usa DATABASE_URL como chave (já é um
// segredo do servidor, nunca exposto ao cliente). Recomendado configurar
// ADMIN_TOKEN_SECRET nas variáveis de ambiente do Netlify.
function getTokenSecret() {
    return process.env.ADMIN_TOKEN_SECRET || process.env.DATABASE_URL || '';
}

// Gera um token de sessão assinado (HMAC) com expiração, emitido pelo /api/auth
// após validar a senha. Não precisa de tabela de sessões: a validade é
// verificada recalculando a assinatura a cada requisição.
function signAdminToken() {
    const expires = Date.now() + TOKEN_TTL_MS;
    const sig = crypto.createHmac('sha256', getTokenSecret()).update(String(expires)).digest('hex');
    return `${expires}.${sig}`;
}

// Verifica o token enviado no header X-Admin-Token. Lança ApiError(401) se
// estiver ausente, expirado ou com assinatura inválida.
function requireAdmin(event) {
    const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
    if (!token) throw new ApiError('Não autorizado. Faça login novamente.', 401);

    const [expiresStr, sig] = token.split('.');
    const expires = Number(expiresStr);
    if (!expires || !sig || Date.now() > expires) {
        throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }

    const expectedSig = crypto.createHmac('sha256', getTokenSecret()).update(expiresStr).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new ApiError('Sessão inválida. Faça login novamente.', 401);
    }
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

module.exports = {
    getSql, ok, okCached, err, optionsResponse,
    ApiError, handleError, signAdminToken, requireAdmin,
};
