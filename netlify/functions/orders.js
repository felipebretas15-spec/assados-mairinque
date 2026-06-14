const { getSql, ok, err, optionsResponse } = require('./_db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();

    const sql = getSql();
    const id = event.queryStringParameters?.id;
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // GET /api/orders
        if (event.httpMethod === 'GET' && !id) {
            const rows = await sql`SELECT * FROM pedidos ORDER BY criado_em DESC`;
            return ok(rows);
        }

        // POST /api/orders
        if (event.httpMethod === 'POST') {
            const {
                tipo_pedido, nome_cliente, telefone_cliente,
                endereco_cliente, nome_regiao, taxa_regiao,
                itens_pedido, subtotal, frete, total,
                pagamento, troco, observacao
            } = body;

            const [row] = await sql`
                INSERT INTO pedidos
                    (tipo_pedido, nome_cliente, telefone_cliente, endereco_cliente,
                     nome_regiao, taxa_regiao, itens_pedido, subtotal, frete,
                     total, pagamento, troco, observacao)
                VALUES
                    (${tipo_pedido}, ${nome_cliente}, ${telefone_cliente},
                     ${endereco_cliente || null}, ${nome_regiao || null}, ${taxa_regiao || 0},
                     ${JSON.stringify(itens_pedido)}, ${subtotal}, ${frete || 0},
                     ${total}, ${pagamento}, ${troco || null}, ${observacao || null})
                RETURNING *
            `;
            return ok(row);
        }

        // PUT /api/orders/:id  (atualizar status)
        if (event.httpMethod === 'PUT' && id) {
            const { status_pedido } = body;
            const [row] = await sql`
                UPDATE pedidos SET status_pedido=${status_pedido}
                WHERE id_pedido=${id} RETURNING *
            `;
            return ok(row);
        }

        return err('Method not allowed', 405);
    } catch (e) {
        return err(e.message);
    }
};
