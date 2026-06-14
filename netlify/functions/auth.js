const { getSql, ok, err, optionsResponse } = require('./_db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();
    if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

    const sql = getSql();
    try {
        const { senha } = JSON.parse(event.body || '{}');
        const rows = await sql`SELECT valor FROM configuracoes WHERE chave = 'senha_admin'`;
        const senhaAdmin = rows[0]?.valor || 'admin123';
        if (senha === senhaAdmin) return ok({ ok: true });
        return err('Senha incorreta', 401);
    } catch (e) {
        return err(e.message);
    }
};
