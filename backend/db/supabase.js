require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// teste de conexão
supabase.from('leads').select('*')
.then(({error})=>{
    if (error) {
            console.error('> ERRO: falha ao conectar ao banco de dados:', error);
            return;
        }

        console.log('> conexão com o banco de dados estabelecida com sucesso.');
})

module.exports = supabase, { auth: { persistSession: false } };