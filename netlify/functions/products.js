const { getSql, ok, err, optionsResponse } = require('./_db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();

    const sql = getSql();
    const id = event.queryStringParameters?.id;
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // GET /api/products (?all=1 retorna inativos também, usado pelo admin)
        if (event.httpMethod === 'GET' && !id) {
            const includeInactive = event.queryStringParameters?.all === '1';
            const rows = includeInactive
                ? await sql`SELECT * FROM produtos ORDER BY criado_em`
                : await sql`SELECT * FROM produtos WHERE ativo = true ORDER BY criado_em`;
            return ok(rows);
        }

        // POST /api/products
        if (event.httpMethod === 'POST') {
            const { nome_produto, descricao, preco, imagem } = body;
            const [row] = await sql`
                INSERT INTO produtos (nome_produto, descricao, preco, imagem)
                VALUES (${nome_produto}, ${descricao || null}, ${preco}, ${imagem || null})
                RETURNING *
            `;
            return ok(row);
        }

        // PUT /api/products/:id
        if (event.httpMethod === 'PUT' && id) {
            const { nome_produto, descricao, preco, imagem } = body;
            const [row] = await sql`
                UPDATE produtos
                SET nome_produto=${nome_produto}, descricao=${descricao || null},
                    preco=${preco}, imagem=${imagem || null}
                WHERE id_produto=${id} RETURNING *
            `;
            return ok(row);
        }

        // PATCH /api/products/:id - ativar/desativar produto
        if (event.httpMethod === 'PATCH' && id) {
            const { ativo } = body;
            const [row] = await sql`
                UPDATE produtos SET ativo=${ativo} WHERE id_produto=${id} RETURNING *
            `;
            return ok(row);
        }

        // DELETE /api/products/:id
        if (event.httpMethod === 'DELETE' && id) {
            await sql`UPDATE produtos SET ativo=false WHERE id_produto=${id}`;
            return ok({ ok: true });
        }

        return err('Method not allowed', 405);
    } catch (e) {
        return err(e.message);
    }
};
