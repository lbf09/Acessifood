const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { supabase, erroConfiguracao } = require('./conexao');

const estadoPadrao = () => ({ initialized: false, products: [], orders: [], cart: [], favorites: [], profile: {}, preferences: {}, store: {}, nextOrderNumber: 1, currentView: 'home', sellerTab: 'overview', orderFilter: 'all', reportType: 'sale' });

async function testarConexao() {
  if (!supabase) {
    dialog.showErrorBox('Configuração do Supabase', erroConfiguracao);
    return false;
  }
  const { error } = await supabase.from('acessifood_state').select('id').eq('id', 'global').maybeSingle();
  if (error) {
    console.error('Erro de conexão com o Supabase:', error.message);
    dialog.showErrorBox('Erro de conexão', `Não foi possível consultar o Supabase. Confira as configurações e execute desktop/schema.sql no SQL Editor do Supabase.\n\n${error.message}`);
    return false;
  }
  console.log('Conectado ao Supabase compartilhado do AcessiFood.');
  return true;
}

async function lerEstadoCompartilhado() {
  if (!supabase) throw new Error(erroConfiguracao);
  const { data, error } = await supabase.from('acessifood_state').select('state_json, revision, updated_at').eq('id', 'global').maybeSingle();
  if (error) throw error;
  if (!data) return { state: null, revision: 0, updatedAt: null };
  return { state: data.state_json, revision: Number(data.revision) || 1, updatedAt: data.updated_at };
}

async function salvarEstadoCompartilhado(state) {
  if (!supabase) throw new Error(erroConfiguracao);
  if (!state || !Array.isArray(state.products) || !Array.isArray(state.orders) || !state.profile || !state.preferences || !state.store) {
    throw new Error('Estado inválido: confira produtos, pedidos, perfil, preferências e loja.');
  }
  const { data, error } = await supabase.rpc('acessifood_state_save', { p_state: state });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { revision: Number(row?.revision) || 1, updatedAt: row?.updated_at || new Date().toISOString() };
}

async function sincronizarLojaComEstado(loja, id) {
  const dado = await lerEstadoCompartilhado();
  const state = dado.state || estadoPadrao();
  const idAnterior = state.store?.storeId;
  const nomeAnterior = state.store?.name;
  const cores = { 'Azul Padrão': '#1351b4', 'Vermelho Padrão': '#1351b4', 'Alto Contraste': '#111111', 'Suave': '#eaf2fb', 'Padrão': '#1351b4' };
  const idNovo = `store-db-${id}`;
  state.store = {
    ...(state.store || {}), storeId: idNovo, name: loja.nome,
    category: state.store?.category || 'Brasileira', address: loja.endereco,
    owner: loja.dono_nome, cnpj: loja.cnpj || '', color: cores[loja.paleta_cores] || '#1351b4',
    logoText: (loja.nome || 'AF').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()
  };
  state.products = (state.products || []).map(p => (p.ownedByCurrentStore || (idAnterior && p.storeId === idAnterior)) ? { ...p, storeName: loja.nome, storeId: idNovo, ownedByCurrentStore: true } : p);
  (state.orders || []).forEach(order => (order.items || []).forEach(item => {
    if ((idAnterior && item.storeId === idAnterior) || (nomeAnterior && item.storeName === nomeAnterior)) {
      item.storeId = idNovo;
      item.storeName = loja.nome;
    }
  }));
  await salvarEstadoCompartilhado(state);
}

async function sincronizarProdutoComEstado(produto, id, loja) {
  const dado = await lerEstadoCompartilhado();
  const state = dado.state || estadoPadrao();
  state.products = Array.isArray(state.products) ? state.products : [];
  const idCompartilhado = `supabase-product-${id}`;
  const registro = {
    id: idCompartilhado, name: produto.nome, price: Number(produto.preco), offer: 0,
    category: state.store?.category || 'Outros', image: 'food-table.jpg', description: produto.descricao || '',
    stock: 10, active: true, vegetarian: false, vegan: false,
    glutenFree: !Boolean(produto.gluten), lactoseFree: !Boolean(produto.lactose),
    sweet: false, hotMeal: produto.clima !== 'Calor', storeName: loja.nome,
    storeId: state.store?.storeId || `store-db-${produto.loja_id}`, ownedByCurrentStore: true, rating: 4.8
  };
  const index = state.products.findIndex(p => p.id === idCompartilhado || p.id === `mysql-product-${id}`);
  if (index >= 0) state.products[index] = registro;
  else state.products.unshift(registro);
  if (!state.store || !state.store.name || state.store.storeId === registro.storeId) {
    state.store = { ...(state.store || {}), storeId: registro.storeId, name: loja.nome, address: loja.endereco || '', owner: loja.dono_nome || '', category: state.store?.category || 'Outros', color: state.store?.color || '#1351b4', logoText: (loja.nome || 'AF').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() };
  }
  await salvarEstadoCompartilhado(state);
}

async function removerProdutoDoEstado(id) {
  const dado = await lerEstadoCompartilhado();
  if (!dado.state) return;
  dado.state.products = (dado.state.products || []).filter(p => p.id !== `supabase-product-${id}` && p.id !== `mysql-product-${id}`);
  await salvarEstadoCompartilhado(dado.state);
}

function abrirModalLoja(janelaPrincipal) {
  const modal = new BrowserWindow({ width: 480, height: 580, parent: janelaPrincipal, modal: true, webPreferences: { preload: path.join(__dirname, 'preload.js') } });
  modal.removeMenu();
  modal.loadFile(path.join(__dirname, '../renderer/frmLoja.html'));
}

function abrirModalProduto(janelaPrincipal) {
  const modal = new BrowserWindow({ width: 520, height: 680, parent: janelaPrincipal, modal: true, webPreferences: { preload: path.join(__dirname, 'preload.js') } });
  modal.removeMenu();
  modal.loadFile(path.join(__dirname, '../renderer/frmProduto.html'));
}

app.whenReady().then(async () => {
  await testarConexao();

  const janelaPrincipal = new BrowserWindow({ width: 1050, height: 750, icon: path.join(__dirname, '../../../assets/icon-512.png'), webPreferences: { preload: path.join(__dirname, 'preload.js') } });
  janelaPrincipal.loadFile(path.join(__dirname, '../renderer/frmPrincipal.html'));
  ipcMain.handle('janela:abrirLoja', () => abrirModalLoja(janelaPrincipal));
  ipcMain.handle('janela:abrirProduto', () => abrirModalProduto(janelaPrincipal));
  ipcMain.handle('janela:fecharAtual', event => { const atual = BrowserWindow.fromWebContents(event.sender); if (atual && atual.getParentWindow()) atual.close(); return true; });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Cadastros', submenu: [ { label: 'Nova Loja', click: () => abrirModalLoja(janelaPrincipal) }, { label: 'Novo Produto', click: () => abrirModalProduto(janelaPrincipal) } ] },
    { label: 'Sistema', submenu: [{ label: 'Sair', role: 'quit' }] }
  ]));

  ipcMain.handle('loja:criar', async (event, loja) => {
    if (!supabase) throw new Error(erroConfiguracao);
    const { data, error } = await supabase.from('loja').insert({ nome: loja.nome, dono_nome: loja.dono_nome, cnpj: loja.cnpj || null, endereco: loja.endereco, paleta_cores: loja.paleta_cores || 'Azul Padrão' }).select().single();
    if (error) throw error;
    try { await sincronizarLojaComEstado(data, data.id); } catch (e) { console.error('Falha ao sincronizar loja no estado compartilhado:', e); }
    return data;
  });

  ipcMain.handle('loja:listar', async () => {
    if (!supabase) throw new Error(erroConfiguracao);
    const { data, error } = await supabase.from('loja').select('*').order('nome', { ascending: true });
    if (error) throw error;
    return data || [];
  });

  ipcMain.handle('loja:excluir', async (event, id) => {
    if (!supabase) throw new Error(erroConfiguracao);
    const { data, error } = await supabase.from('loja').delete().eq('id', id).select();
    if (error) throw error;
    try {
      const dado = await lerEstadoCompartilhado();
      if (dado.state) {
        dado.state.products = (dado.state.products || []).filter(p => p.storeId !== `store-db-${id}`);
        if (dado.state.store?.storeId === `store-db-${id}`) dado.state.store = { ...dado.state.store, name: '', address: '', owner: '' };
        await salvarEstadoCompartilhado(dado.state);
      }
    } catch (e) { console.error('Falha ao sincronizar exclusão da loja:', e); }
    return data;
  });

  ipcMain.handle('produto:criar', async (event, prod) => {
    if (!supabase) throw new Error(erroConfiguracao);
    const { data, error } = await supabase.from('produto').insert({
      loja_id: Number(prod.loja_id), nome: prod.nome, preco: Number(prod.preco), descricao: prod.descricao || '',
      clima: prod.clima || 'Todos', apimentado: Boolean(prod.apimentado), gluten: Boolean(prod.gluten), lactose: Boolean(prod.lactose)
    }).select().single();
    if (error) throw error;
    const { data: loja, error: erroLoja } = await supabase.from('loja').select('id, nome, dono_nome, endereco').eq('id', prod.loja_id).single();
    if (erroLoja) throw erroLoja;
    try { await sincronizarProdutoComEstado(data, data.id, loja); } catch (e) { console.error('Falha ao sincronizar produto no estado compartilhado:', e); }
    return data;
  });

  ipcMain.handle('produto:listar', async () => {
    if (!supabase) throw new Error(erroConfiguracao);
    const { data, error } = await supabase.from('produto').select('*, loja(nome)').order('nome', { ascending: true });
    if (error) throw error;
    return (data || []).map(row => ({ ...row, loja_nome: row.loja?.nome || '' }));
  });

  ipcMain.handle('produto:excluir', async (event, id) => {
    if (!supabase) throw new Error(erroConfiguracao);
    const { data, error } = await supabase.from('produto').delete().eq('id', id).select();
    if (error) throw error;
    try { await removerProdutoDoEstado(id); } catch (e) { console.error('Falha ao sincronizar exclusão do produto:', e); }
    return data;
  });

  ipcMain.handle('estado:ler', async () => lerEstadoCompartilhado());
  ipcMain.handle('estado:salvar', async (event, state) => salvarEstadoCompartilhado(state));

  ipcMain.handle('arquivo:salvarRelatorio', async (event, conteudo) => {
    const { canceled, filePath } = await dialog.showSaveDialog(janelaPrincipal, { title: 'Exportar Relatório de Produtos', defaultPath: 'relatorio-produtos.txt', filters: [{ name: 'Texto', extensions: ['txt'] }] });
    if (!canceled && filePath) await fs.writeFile(filePath, conteudo);
  });

  ipcMain.handle('arquivo:exportarJson', async (event, dados) => {
    const { canceled, filePath } = await dialog.showSaveDialog(janelaPrincipal, { title: 'Exportar Backup JSON', defaultPath: 'backup-produtos.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!canceled && filePath) await fs.writeFile(filePath, JSON.stringify(dados, null, 2));
  });

  ipcMain.handle('arquivo:importarJson', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(janelaPrincipal, { title: 'Importar Backup JSON', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (canceled || filePaths.length === 0) return null;
    return JSON.parse(await fs.readFile(filePaths[0], 'utf-8'));
  });
});
