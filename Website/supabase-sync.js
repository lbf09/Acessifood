(() => {
  let client = null;
  let revision = 0;
  let saveTimer = null;
  let saving = false;
  let pendingState = null;
  let polling = null;
  let lastUpdatedAt = null;
  let connected = false;
  const pendingKey = 'acessifood.shared-state.pending.v2';

  const readPending = () => {
    try { return JSON.parse(localStorage.getItem(pendingKey) || 'null'); }
    catch { return null; }
  };

  const statusNode = () => document.getElementById('dbConnectionStatus');

  function setStatus(mode, message) {
    connected = mode === 'connected';
    const node = statusNode();
    if (node) {
      node.dataset.status = mode;
      node.textContent = message;
      node.title = message;
    }
    window.dispatchEvent(new CustomEvent('acessifood:connection', { detail: { mode, message } }));
  }

  function getClient() {
    if (client) return client;
    const url = String(window.ACCESSIFOOD_SUPABASE_URL || '').trim();
    const key = String(window.ACCESSIFOOD_SUPABASE_ANON_KEY || '').trim();
    if (!url || !key || /SEU-PROJETO|SUA_CHAVE|your-project|your-key/i.test(`${url} ${key}`)) {
      throw new Error('Configure a URL e a chave pública no arquivo supabase-config.js.');
    }
    if (!window.supabase?.createClient) throw new Error('Não foi possível carregar a biblioteca do Supabase. Confira a conexão com a internet.');
    client = window.supabase.createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }

  async function fetchState() {
    const { data, error } = await getClient()
      .from('acessifood_state')
      .select('state_json, revision, updated_at')
      .eq('id', 'global')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function loadState() {
    try {
      const data = await fetchState();
      revision = Number(data?.revision) || 0;
      lastUpdatedAt = data?.updated_at || null;
      const pending = readPending();
      setStatus('connected', 'Supabase conectado · dados compartilhados');
      startPolling();
      if (pending?.state) {
        queueSave(pending.state);
        return pending.state;
      }
      return data?.state_json || null;
    } catch (error) {
      setStatus('offline', error.message.includes('Configure a URL') ? 'Configure o Supabase em supabase-config.js' : readPending() ? 'Supabase indisponível — há alterações locais pendentes' : 'Supabase indisponível — usando dados locais');
      return null;
    }
  }

  async function sendState(state) {
    saving = true;
    try {
      const { data, error } = await getClient().rpc('acessifood_state_save', { p_state: state });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      revision = Number(row?.revision) || revision + 1;
      lastUpdatedAt = row?.updated_at || new Date().toISOString();
      const pending = readPending();
      if (pending?.state && JSON.stringify(pending.state) === JSON.stringify(state)) localStorage.removeItem(pendingKey);
      setStatus('connected', 'Dados sincronizados com o Supabase');
    } catch (error) {
      setStatus('offline', `Falha ao sincronizar com Supabase: ${error.message}`);
    } finally {
      saving = false;
      if (pendingState) scheduleSave(pendingState);
    }
  }

  function scheduleSave(state) {
    pendingState = null;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const snapshot = JSON.parse(JSON.stringify(state));
      if (saving) { pendingState = snapshot; return; }
      sendState(snapshot);
    }, 500);
  }

  function queueSave(state) {
    pendingState = JSON.parse(JSON.stringify(state));
    try { localStorage.setItem(pendingKey, JSON.stringify({ state: pendingState, savedAt: new Date().toISOString() })); } catch (error) {}
    if (saving) return;
    scheduleSave(pendingState);
  }

  async function poll() {
    if (saving || pendingState || document.hidden) return;
    try {
      const data = await fetchState();
      setStatus('connected', 'Supabase conectado · dados compartilhados');
      const nextRevision = Number(data?.revision) || 0;
      if (nextRevision > revision && data?.state_json) {
        revision = nextRevision;
        lastUpdatedAt = data.updated_at || lastUpdatedAt;
        window.dispatchEvent(new CustomEvent('acessifood:remote-state', { detail: { state: data.state_json, revision, updatedAt: lastUpdatedAt } }));
      }
    } catch (error) {
      setStatus('offline', 'Supabase indisponível — alterações locais são mantidas');
    }
  }

  function startPolling() {
    if (polling) clearInterval(polling);
    polling = setInterval(poll, 8000);
  }

  window.AccessiFoodSync = { loadState, queueSave, getRevision: () => revision, isConnected: () => connected };
})();
