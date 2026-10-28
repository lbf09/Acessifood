require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true });
const { createClient } = require('@supabase/supabase-js');

const url = String(process.env.SUPABASE_URL || '').trim();
const key = String(process.env.SUPABASE_ANON_KEY || '').trim();
const configValida = /^https:\/\/.+\.supabase\.co$/i.test(url) && key && !/sua-chave|your-|placeholder/i.test(key);

const supabase = configValida ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
}) : null;

module.exports = {
  supabase,
  erroConfiguracao: configValida ? null : 'Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo desktop/.env.'
};
