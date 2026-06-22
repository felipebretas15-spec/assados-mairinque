const { getSql, ok, err, optionsResponse, ApiError, handleError } = require('./_db');

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
                endereco_cliente, nome_regiao,
                itens_pedido, pagamento, troco, observacao
            } = body;

            if (!Array.isArray(itens_pedido) || !itens_pedido.length) {
                throw new ApiError('Pedido sem itens.');
            }
            if (!nome_cliente || !telefone_cliente || !pagamento) {
                throw new ApiError('Preencha nome, telefone e forma de pagamento.');
            }

            // Recalcula preços e total a partir do banco — nunca confia no valor enviado pelo cliente.
            let subtotal = 0;
            const itensValidados = [];
            for (const item of itens_pedido) {
                const [produto] = await sql`SELECT nome_produto, preco FROM produtos WHERE id_produto = ${item.id} AND ativo = true`;
                if (!produto) throw new ApiError('Um dos produtos do pedido não está mais disponível.');
                const qty = Math.max(1, Math.min(50, parseInt(item.qty, 10) || 1));
                const preco = Number(produto.preco);
                subtotal += preco * qty;
                itensValidados.push({ id: item.id, nome: produto.nome_produto, qty, preco });
            }

            let taxa_regiao = 0;
            if (tipo_pedido === 'entrega' && nome_regiao) {
                const [regiao] = await sql`SELECT taxa_entrega FROM regioes WHERE nome_regiao = ${nome_regiao} AND ativo = true`;
                taxa_regiao = regiao ? Number(regiao.taxa_entrega) : 0;
            }
            const total = subtotal + taxa_regiao;

            const [row] = await sql`
                INSERT INTO pedidos
                    (tipo_pedido, nome_cliente, telefone_cliente, endereco_cliente,
                     nome_regiao, taxa_regiao, itens_pedido, subtotal, frete,
                     total, pagamento, troco, observacao)
                VALUES
                    (${tipo_pedido}, ${nome_cliente}, ${telefone_cliente},
                     ${endereco_cliente || null}, ${nome_regiao || null}, ${taxa_regiao},
                     ${JSON.stringify(itensValidados)}, ${subtotal}, ${taxa_regiao},
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
        return handleError(e);
    }
};
