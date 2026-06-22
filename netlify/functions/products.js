const { getSql, ok, okCached, err, optionsResponse, ApiError, handleError } = require('./_db');

const MAX_IMAGE_LENGTH = 2_000_000; // ~1.5MB de imagem decodificada

function validateImage(imagem) {
    if (imagem === undefined || imagem === null || imagem === '') return null;
    if (typeof imagem !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(imagem)) {
        throw new ApiError('Formato de imagem inválido.');
    }
    if (imagem.length > MAX_IMAGE_LENGTH) {
        throw new ApiError('Imagem muito grande (máx. ~1.5MB). Escolha uma foto menor.');
    }
    return imagem;
}

function validateProduct({ nome_produto, preco }) {
    if (!nome_produto || typeof nome_produto !== 'string' || !nome_produto.trim()) {
        throw new ApiError('Nome do produto é obrigatório.');
    }
    const precoNum = Number(preco);
    if (!Number.isFinite(precoNum) || precoNum <= 0) {
        throw new ApiError('Preço inválido.');
    }
    return precoNum;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();

    const sql = getSql();
    const id = event.queryStringParameters?.id;
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // GET /api/products (?all=1 retorna inativos também, usado pelo admin)
        if (event.httpMethod === 'GET' && !id) {
            const includeInactive = event.queryStringParameters?.all === '1';
            if (includeInactive) {
                const rows = await sql`SELECT * FROM produtos ORDER BY criado_em`;
                return ok(rows);
            }
            const rows = await sql`SELECT * FROM produtos WHERE ativo = true ORDER BY criado_em`;
            return okCached(rows);
        }

        // POST /api/products
        if (event.httpMethod === 'POST') {
            const { nome_produto, descricao, preco, imagem } = body;
            const precoNum = validateProduct({ nome_produto, preco });
            const imagemValida = validateImage(imagem);
            const [row] = await sql`
                INSERT INTO produtos (nome_produto, descricao, preco, imagem)
                VALUES (${nome_produto.trim()}, ${descricao || null}, ${precoNum}, ${imagemValida})
                RETURNING *
            `;
            return ok(row);
        }

        // PUT /api/products/:id
        if (event.httpMethod === 'PUT' && id) {
            const { nome_produto, descricao, preco, imagem } = body;
            const precoNum = validateProduct({ nome_produto, preco });
            const imagemValida = validateImage(imagem);
            const [row] = await sql`
                UPDATE produtos
                SET nome_produto=${nome_produto.trim()}, descricao=${descricao || null},
                    preco=${precoNum}, imagem=${imagemValida}
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
        return handleError(e);
    }
};
