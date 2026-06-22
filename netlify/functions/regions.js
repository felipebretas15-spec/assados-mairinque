const { getSql, ok, okCached, err, optionsResponse, handleError } = require('./_db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();

    const sql = getSql();
    const id = event.queryStringParameters?.id;
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        if (event.httpMethod === 'GET' && !id) {
            const rows = await sql`
                SELECT * FROM regioes WHERE ativo = true ORDER BY nome_regiao
            `;
            return okCached(rows);
        }

        if (event.httpMethod === 'POST') {
            const { nome_regiao, taxa_entrega } = body;
            const [row] = await sql`
                INSERT INTO regioes (nome_regiao, taxa_entrega)
                VALUES (${nome_regiao}, ${taxa_entrega}) RETURNING *
            `;
            return ok(row);
        }

        if (event.httpMethod === 'PUT' && id) {
            const { nome_regiao, taxa_entrega } = body;
            const [row] = await sql`
                UPDATE regioes SET nome_regiao=${nome_regiao}, taxa_entrega=${taxa_entrega}
                WHERE id_regiao=${id} RETURNING *
            `;
            return ok(row);
        }

        if (event.httpMethod === 'DELETE' && id) {
            await sql`UPDATE regioes SET ativo=false WHERE id_regiao=${id}`;
            return ok({ ok: true });
        }

        return err('Method not allowed', 405);
    } catch (e) {
        return handleError(e);
    }
};
