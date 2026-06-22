const bcrypt = require('bcryptjs');
const { getSql, ok, err, optionsResponse, handleError, signAdminToken } = require('./_db');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();
    if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

    const sql = getSql();
    try {
        const { senha } = JSON.parse(event.body || '{}');

        const rows = await sql`
            SELECT chave, valor FROM configuracoes
            WHERE chave IN ('senha_admin', 'auth_fail_count', 'auth_lock_until')
        `;
        const cfg = {};
        rows.forEach(r => { cfg[r.chave] = r.valor; });

        if (cfg.auth_lock_until && new Date(cfg.auth_lock_until) > new Date()) {
            const minutes = Math.max(1, Math.ceil((new Date(cfg.auth_lock_until) - new Date()) / 60000));
            return err(`Muitas tentativas. Tente novamente em ${minutes} min.`, 429);
        }

        const stored = cfg.senha_admin || 'admin123';
        const isHashed = /^\$2[aby]\$/.test(stored);
        const valid = isHashed ? await bcrypt.compare(senha || '', stored) : senha === stored;

        if (!valid) {
            const attempts = (parseInt(cfg.auth_fail_count, 10) || 0) + 1;
            if (attempts >= MAX_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
                await sql`
                    INSERT INTO configuracoes (chave, valor) VALUES ('auth_lock_until', ${lockUntil})
                    ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
                `;
                await sql`
                    INSERT INTO configuracoes (chave, valor) VALUES ('auth_fail_count', '0')
                    ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
                `;
                return err(`Muitas tentativas. Tente novamente em ${LOCK_MINUTES} min.`, 429);
            }
            await sql`
                INSERT INTO configuracoes (chave, valor) VALUES ('auth_fail_count', ${String(attempts)})
                ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
            `;
            return err('Senha incorreta', 401);
        }

        await sql`DELETE FROM configuracoes WHERE chave IN ('auth_fail_count', 'auth_lock_until')`;

        // Migra senha legada em texto puro para hash no primeiro login bem-sucedido.
        if (!isHashed) {
            const hash = await bcrypt.hash(senha, 10);
            await sql`
                INSERT INTO configuracoes (chave, valor) VALUES ('senha_admin', ${hash})
                ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
            `;
        }

        return ok({ ok: true, token: signAdminToken() });
    } catch (e) {
        return handleError(e);
    }
};
