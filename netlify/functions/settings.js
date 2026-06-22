const bcrypt = require('bcryptjs');
const { getSql, ok, err, optionsResponse, handleError } = require('./_db');

// Chaves internas que nunca devem ser expostas via GET (senha e contadores de bloqueio de login).
const PRIVATE_KEYS = new Set(['senha_admin', 'auth_fail_count', 'auth_lock_until']);

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();

    const sql = getSql();
    try {
        if (event.httpMethod === 'GET') {
            const rows = await sql`SELECT chave, valor FROM configuracoes`;
            const obj = {};
            rows.forEach(r => { if (!PRIVATE_KEYS.has(r.chave)) obj[r.chave] = r.valor; });
            return ok(obj);
        }

        if (event.httpMethod === 'PUT') {
            const updates = JSON.parse(event.body || '{}');
            for (const [chave, valor] of Object.entries(updates)) {
                if (valor !== undefined && valor !== null && valor !== '') {
                    const valorFinal = chave === 'senha_admin' ? await bcrypt.hash(valor, 10) : valor;
                    await sql`
                        INSERT INTO configuracoes (chave, valor) VALUES (${chave}, ${valorFinal})
                        ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
                    `;
                }
            }
            return ok({ ok: true });
        }

        return err('Method not allowed', 405);
    } catch (e) {
        return handleError(e);
    }
};
