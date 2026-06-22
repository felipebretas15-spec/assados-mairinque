const Jimp = require('jimp');
const { getSql, ok, err, optionsResponse } = require('./_db');

const MAX_WIDTH = 900;
const JPEG_QUALITY = 80;

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return optionsResponse();
    if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

    const sql = getSql();
    try {
        const { senha } = JSON.parse(event.body || '{}');
        const rows = await sql`SELECT valor FROM configuracoes WHERE chave = 'senha_admin'`;
        const senhaAdmin = rows[0]?.valor || 'admin123';
        if (senha !== senhaAdmin) return err('Senha incorreta', 401);

        const produtos = await sql`SELECT id_produto, imagem FROM produtos WHERE imagem IS NOT NULL`;

        let processed = 0;
        let updated = 0;
        let savedBytes = 0;

        for (const p of produtos) {
            const match = /^data:image\/\w+;base64,(.+)$/.exec(p.imagem || '');
            if (!match) continue;
            processed++;

            const original = Buffer.from(match[1], 'base64');
            const image = await Jimp.read(original);
            if (image.bitmap.width > MAX_WIDTH) image.resize(MAX_WIDTH, Jimp.AUTO);
            const optimized = await image.quality(JPEG_QUALITY).getBufferAsync(Jimp.MIME_JPEG);

            if (optimized.length < original.length) {
                const dataUrl = `data:image/jpeg;base64,${optimized.toString('base64')}`;
                await sql`UPDATE produtos SET imagem = ${dataUrl} WHERE id_produto = ${p.id_produto}`;
                updated++;
                savedBytes += original.length - optimized.length;
            }
        }

        return ok({ processed, updated, savedKB: Math.round(savedBytes / 1024) });
    } catch (e) {
        return err(e.message);
    }
};
