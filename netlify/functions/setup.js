const { getSql, ok, err, optionsResponse } = require('./_db');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();
    if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

    const sql = getSql();
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario    SERIAL PRIMARY KEY,
                nome_usuario  VARCHAR(100) NOT NULL,
                senha_usuario VARCHAR(255) NOT NULL,
                criado_em     TIMESTAMPTZ DEFAULT now()
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS produtos (
                id_produto   SERIAL PRIMARY KEY,
                nome_produto VARCHAR(100) NOT NULL,
                descricao    TEXT,
                preco        DECIMAL(10,2) NOT NULL,
                imagem       TEXT,
                ativo        BOOLEAN DEFAULT true,
                criado_em    TIMESTAMPTZ DEFAULT now()
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS regioes (
                id_regiao    SERIAL PRIMARY KEY,
                nome_regiao  VARCHAR(100) NOT NULL,
                taxa_entrega DECIMAL(10,2) NOT NULL,
                ativo        BOOLEAN DEFAULT true
            )
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS configuracoes (
                chave VARCHAR(50) PRIMARY KEY,
                valor TEXT
            )
        `;
        await sql`
            INSERT INTO configuracoes (chave, valor) VALUES ('senha_admin', 'admin123')
            ON CONFLICT (chave) DO NOTHING
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS pedidos (
                id_pedido        SERIAL PRIMARY KEY,
                status_pedido    INTEGER DEFAULT 1,
                tipo_pedido      VARCHAR(20) NOT NULL,
                nome_cliente     VARCHAR(100) NOT NULL,
                telefone_cliente VARCHAR(20) NOT NULL,
                endereco_cliente TEXT,
                nome_regiao      VARCHAR(100),
                taxa_regiao      DECIMAL(10,2) DEFAULT 0,
                itens_pedido     JSONB NOT NULL,
                subtotal         DECIMAL(10,2) NOT NULL,
                frete            DECIMAL(10,2) DEFAULT 0,
                total            DECIMAL(10,2) NOT NULL,
                pagamento        VARCHAR(50) NOT NULL,
                troco            DECIMAL(10,2),
                observacao       TEXT,
                criado_em        TIMESTAMPTZ DEFAULT now()
            )
        `;
        return ok({ message: 'Banco iniciado com sucesso!' });
    } catch (e) {
        return err(e.message);
    }
};
