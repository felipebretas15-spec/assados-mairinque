const { getSql, ok, err, optionsResponse } = require('./_db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();

    const sql = getSql();
    try {
        if (event.httpMethod === 'GET') {
            const rows = await sql`SELECT chave, valor FROM configuracoes`;
            const obj = {};
            rows.forEach(r => { obj[r.chave] = r.valor; });
            return ok(obj);
        }

        if (event.httpMethod === 'PUT') {
            const updates = JSON.parse(event.body || '{}');
            for (const [chave, valor] of Object.entries(updates)) {
                if (valor !== undefined && valor !== null && valor !== '') {
                    await sql`
                        INSERT INTO configuracoes (chave, valor) VALUES (${chave}, ${valor})
                        ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
                    `;
                }
            }
            return ok({ ok: true });
        }

        return err('Method not allowed', 405);
    } catch (e) {
        return err(e.message);
    }
};
