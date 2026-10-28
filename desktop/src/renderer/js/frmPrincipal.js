let sharedState = null;
let revisionAtual = 0;
let lojasSql = [];
let produtosSql = [];
let toastTimer = null;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateKey = value => {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatDate = value => {
  const key = dateKey(value);
  if (!key) return '—';
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
};
const formatDateTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? formatDate(value) : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function defaultState() {
  return { products: [], orders: [], store: { name: 'Minha loja', storeId: 'store-tempero', category: 'Outros' }, profile: {}, preferences: {}, currentView: 'home' };
}
function showToast(message, error = false) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.toggle('error', error);
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.hidden = true, 3400);
}
function setDbStatus(mode, text) {
  const node = $('#dbStatus');
  node.className = `connection-status ${mode}`;
  node.innerHTML = `<i></i>${escapeHtml(text)}`;
}
function ownItems(order) {
  const sid = sharedState?.store?.storeId || 'store-tempero';
  const storeName = sharedState?.store?.name || '';
  return (order.items || []).filter(item => item.storeId ? item.storeId === sid : (item.storeName && item.storeName === storeName) || (item.productId && sharedState.products.some(p => p.id === item.productId && (p.storeId === sid || p.ownedByCurrentStore))));
}
function orderTotal(order) {
  const items = ownItems(order);
  const itemTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  return Math.round(itemTotal * 100) / 100;
}
function sellerOrders() {
  return (sharedState?.orders || []).filter(order => ownItems(order).length > 0);
}
function filterByPeriod(orders, period) {
  if (period === 'all' || period === undefined || period === null) return orders;
  const days = Number(period);
  if (!days) return orders;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  const min = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return orders.filter(order => dateKey(order.createdAt) >= min && dateKey(order.createdAt) <= todayKey());
}
function renderChart(target, rows) {
  const width = 720, height = target.classList.contains('large-chart') ? 300 : 252;
  const gradientId = `chartFill-${target.id || 'revenue'}`;
  const left = 58, right = 20, top = 18, bottom = 44;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const values = rows.map(row => Math.max(0, Number(row.value) || 0));
  const maxVal = Math.max(...values, 1);
  const scaleMax = Math.ceil(maxVal / 4) * 4 || 4;
  const x = i => left + (rows.length <= 1 ? plotWidth / 2 : i * plotWidth / (rows.length - 1));
  const y = v => top + plotHeight - (v / scaleMax) * plotHeight;
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const value = scaleMax * i / 4;
    const py = y(value);
    grid += `<line x1="${left}" y1="${py}" x2="${width - right}" y2="${py}" stroke="#e9e3dc" stroke-width="1"/><text x="${left - 9}" y="${py + 4}" text-anchor="end" fill="#718096" font-size="11">${escapeHtml(value >= 1000 ? `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : Math.round(value))}</text>`;
  }
  const points = rows.map((row, i) => `${x(i)},${y(Number(row.value) || 0)}`);
  const linePath = points.length ? `M ${points.join(' L ')}` : '';
  const areaPath = points.length ? `${linePath} L ${x(rows.length - 1)},${top + plotHeight} L ${x(0)},${top + plotHeight} Z` : '';
  const circles = rows.map((row, i) => `<circle cx="${x(i)}" cy="${y(Number(row.value) || 0)}" r="4.5" fill="#1351b4" stroke="#fff" stroke-width="2"><title>${escapeHtml(row.label)}: ${escapeHtml(money(row.value))}</title></circle>`).join('');
  const labels = rows.map((row, i) => `<text x="${x(i)}" y="${height - 13}" text-anchor="middle" fill="#718096" font-size="${rows.length > 10 ? 9 : 11}">${escapeHtml(row.shortLabel || row.label)}</text>`).join('');
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Receita diária em reais"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1351b4" stop-opacity=".20"/><stop offset="100%" stop-color="#1351b4" stop-opacity=".015"/></linearGradient></defs>${grid}${areaPath ? `<path d="${areaPath}" fill="url(#${gradientId})"/>` : ''}${linePath ? `<path d="${linePath}" fill="none" stroke="#1351b4" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ''}${circles}${labels}</svg>`;
}
function buildChartRows(orders, period) {
  const grouped = new Map();
  orders.filter(order => order.status !== 'Cancelado').forEach(order => {
    const date = dateKey(order.createdAt);
    if (!date) return;
    grouped.set(date, (grouped.get(date) || 0) + orderTotal(order));
  });
  let keys;
  if (period === 'all') {
    keys = [...grouped.keys()].sort().slice(-14);
    if (!keys.length) keys = [todayKey()];
  } else {
    const n = Math.min(90, Math.max(7, Number(period) || 7));
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    keys = [];
    for (let offset = n - 1; offset >= 0; offset--) {
      const d = new Date(base);
      d.setDate(d.getDate() - offset);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  return keys.map(key => ({ key, label: formatDate(key), shortLabel: keys.length > 14 ? key.slice(8, 10) : `${key.slice(8, 10)}/${key.slice(5, 7)}`, value: grouped.get(key) || 0 }));
}
function statusCounts(orders) {
  const names = ['Recebido', 'Em preparo', 'Saiu para entrega', 'Concluído', 'Cancelado'];
  return names.map(name => ({ name, count: orders.filter(order => (order.status || 'Recebido') === name).length }));
}
function summarizeProducts(orders) {
  const result = new Map();
  orders.forEach(order => {
    if (order.status === 'Cancelado') return;
    ownItems(order).forEach(item => {
      const key = String(item.productId || item.name);
      const row = result.get(key) || { id: item.productId, name: item.name || 'Produto', quantity: 0, revenue: 0 };
      row.quantity += Number(item.qty) || 0;
      row.revenue += (Number(item.price) || 0) * (Number(item.qty) || 0);
      result.set(key, row);
    });
  });
  return [...result.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
}
function renderStatusBreakdown(orders) {
  const rows = statusCounts(orders);
  const max = Math.max(1, ...rows.map(row => row.count));
  $('#statusBreakdown').innerHTML = rows.map((row, index) => `<div class="status-row"><div class="status-row-label"><span class="status-dot status-${index}"></span><span>${escapeHtml(row.name)}</span><strong>${row.count}</strong></div><div class="status-track"><span class="status-fill status-${index}" style="width:${Math.max(row.count ? 5 : 0, row.count / max * 100)}%"></span></div></div>`).join('');
  $('#statusOrderTotal').textContent = orders.length;
}
function renderTopProducts(orders) {
  const rows = summarizeProducts(orders).slice(0, 5);
  $('#topProducts').innerHTML = rows.length ? rows.map((row, index) => `<div class="top-product-row"><span class="rank">${index + 1}</span><div class="top-product-info"><strong>${escapeHtml(row.name)}</strong><small>${row.quantity} ${row.quantity === 1 ? 'unidade vendida' : 'unidades vendidas'}</small></div><strong class="top-product-value">${money(row.revenue)}</strong></div>`).join('') : `<div class="empty-inline"><span>☷</span><div><strong>Os produtos mais vendidos aparecerão aqui</strong><small>Quando houver pedidos registrados, mostraremos quantidade e receita por item.</small></div></div>`;
}
function renderSuggestions(orders) {
  const products = sharedState.products || [];
  const lowStock = products.filter(product => product.active && Number(product.stock) <= 5).sort((a, b) => Number(a.stock) - Number(b.stock)).slice(0, 2);
  const best = summarizeProducts(orders)[0];
  const inactive = products.filter(product => !product.active).length;
  const suggestions = [];
  if (lowStock.length) suggestions.push({ icon: '!', tone: 'warning', title: 'Confira o estoque', description: `${lowStock.map(product => `${product.name} (${product.stock})`).join(' e ')} ${lowStock.length === 1 ? 'está com poucas unidades' : 'estão com poucas unidades'}.`, action: 'Ver produtos', screen: 'products' });
  if (best) suggestions.push({ icon: '↗', tone: 'positive', title: 'Dê destaque ao mais vendido', description: `${best.name} lidera com ${best.quantity} unidade(s) vendida(s). Considere mantê-lo em evidência.`, action: 'Ver vendas', screen: 'sales' });
  if (!best) suggestions.push({ icon: '☆', tone: 'info', title: 'Registre as primeiras vendas', description: 'Quando o site receber pedidos, o painel mostrará os produtos com maior saída e a receita por período.', action: 'Ver relatórios', screen: 'reports' });
  if (inactive) suggestions.push({ icon: 'Ⅱ', tone: 'info', title: 'Produtos pausados', description: `${inactive} ${inactive === 1 ? 'produto está' : 'produtos estão'} fora do catálogo. Reative os itens que já podem ser vendidos.`, action: 'Revisar catálogo', screen: 'products' });
  if (!lowStock.length && products.length && !inactive) suggestions.push({ icon: '✓', tone: 'positive', title: 'Estoque sem alertas', description: 'Nenhum produto ativo está com cinco unidades ou menos no cadastro atual.', action: 'Ver produtos', screen: 'products' });
  $('#smartSuggestions').innerHTML = suggestions.map(item => `<article class="suggestion-item"><span class="suggestion-icon ${item.tone}">${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p><button class="text-button" data-go="${item.screen}">${escapeHtml(item.action)} →</button></div></article>`).join('');
}
function statusTag(status) {
  const key = ({ 'Recebido': 'received', 'Em preparo': 'preparing', 'Saiu para entrega': 'delivery', 'Concluído': 'completed', 'Cancelado': 'cancelled' })[status] || 'received';
  return `<span class="status-tag ${key}">${escapeHtml(status || 'Recebido')}</span>`;
}
function renderRecentSales(orders) {
  const recent = [...orders].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 6);
  $('#recentSalesTable').innerHTML = recent.length ? recent.map(order => `<tr><td><strong>#${escapeHtml(order.id)}</strong></td><td>${escapeHtml(order.customer || 'Cliente')}<small>${escapeHtml(ownItems(order).map(item => `${item.qty}× ${item.name}`).join(', '))}</small></td><td>${formatDateTime(order.createdAt)}</td><td>${ownItems(order).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)}</td><td><strong>${money(orderTotal(order))}</strong></td><td>${statusTag(order.status)}</td></tr>`).join('') : `<tr><td colspan="6" class="table-empty">Os pedidos do site aparecerão aqui depois que forem registrados.</td></tr>`;
}
function renderDashboard() {
  const period = $('#dashboardPeriod').value || '7';
  const all = sellerOrders();
  const selected = filterByPeriod(all, period);
  const paid = selected.filter(order => order.status !== 'Cancelado');
  const revenue = paid.reduce((sum, order) => sum + orderTotal(order), 0);
  $('#statRevenue').textContent = money(revenue);
  $('#statOrders').textContent = selected.length;
  $('#statTicket').textContent = money(paid.length ? revenue / paid.length : 0);
  $('#statProducts').textContent = (sharedState.products || []).filter(product => product.active).length;
  $('#statProductsNote').textContent = `${(sharedState.products || []).filter(product => product.active).length} ativos de ${(sharedState.products || []).length} cadastrados`;
  $('#chartPeriodLabel').textContent = period === 'all' ? 'Todo o período disponível' : `Últimos ${period} dias`;
  $('#chartPeriodRevenue').textContent = money(revenue);
  renderChart($('#revenueChart'), buildChartRows(selected, period));
  renderStatusBreakdown(selected);
  renderTopProducts(selected);
  renderSuggestions(all);
  renderRecentSales(all);
}
function renderSales() {
  const term = ($('#salesSearch').value || '').trim().toLocaleLowerCase('pt-BR');
  const period = $('#salesPeriod').value || 'all';
  const status = $('#salesStatus').value || 'all';
  const rows = filterByPeriod(sellerOrders(), period).filter(order => {
    const text = [order.id, order.customer, ...ownItems(order).map(item => item.name)].join(' ').toLocaleLowerCase('pt-BR');
    return text.includes(term) && (status === 'all' || (order.status || 'Recebido') === status);
  }).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  $('#salesTable').innerHTML = rows.map(order => `<tr><td><strong>#${escapeHtml(order.id)}</strong></td><td><strong>${escapeHtml(order.customer || 'Cliente')}</strong><small>${escapeHtml(ownItems(order).map(item => `${item.qty}× ${item.name}`).join(', '))}</small></td><td>${formatDateTime(order.createdAt)}</td><td>${escapeHtml(order.payment || '—')}</td><td><strong>${money(orderTotal(order))}</strong></td><td><select class="status-select" data-order-status="${escapeHtml(order.id)}" aria-label="Atualizar status do pedido ${escapeHtml(order.id)}">${['Recebido', 'Em preparo', 'Saiu para entrega', 'Concluído', 'Cancelado'].map(statusName => `<option${(order.status || 'Recebido') === statusName ? ' selected' : ''}>${statusName}</option>`).join('')}</select></td></tr>`).join('');
  $('#salesEmpty').hidden = rows.length > 0;
}
function renderProducts() {
  const term = ($('#productSearch').value || '').trim().toLocaleLowerCase('pt-BR');
  const status = $('#productStatus').value || 'all';
  const rows = (sharedState.products || []).filter(product => [product.name, product.category, product.storeName, product.description].join(' ').toLocaleLowerCase('pt-BR').includes(term) && (status === 'all' || (status === 'active' ? product.active : !product.active)));
  $('#productsTable').innerHTML = rows.map(product => `<tr><td><div class="table-product"><img src="../../../assets/${escapeHtml(product.image || 'food-table.jpg')}" alt="" onerror="this.style.display='none'"><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.description || '')}</small></span></div></td><td>${escapeHtml(product.storeName || sharedState.store?.name || 'Minha loja')}</td><td>${escapeHtml(product.category || 'Outros')}</td><td><strong>${money(Number(product.price) * (1 - (Number(product.offer) || 0) / 100))}</strong>${Number(product.offer) > 0 ? `<small class="discount-note">${Number(product.offer)}% de desconto</small>` : ''}</td><td>${Number(product.stock) || 0}</td><td>${product.active ? '<span class="status-tag completed">Ativo</span>' : '<span class="status-tag cancelled">Pausado</span>'}</td><td><div class="row-actions"><button class="table-action" data-toggle-product="${escapeHtml(product.id)}">${product.active ? 'Pausar' : 'Ativar'}</button><button class="table-action danger" data-delete-product="${escapeHtml(product.id)}">Excluir</button></div></td></tr>`).join('');
  $('#productsEmpty').hidden = rows.length > 0;
}
function renderStores() {
  $('#tbodyLojas').innerHTML = lojasSql.map(store => `<tr><td>${store.id}</td><td><strong>${escapeHtml(store.nome)}</strong></td><td>${escapeHtml(store.dono_nome)}</td><td>${escapeHtml(store.cnpj || '—')}</td><td>${escapeHtml(store.endereco)}</td><td><button class="table-action danger" data-delete-store="${store.id}">Excluir</button></td></tr>`).join('');
  $('#storesEmpty').hidden = lojasSql.length > 0;
  const store = sharedState?.store || {};
  $('#sharedStoreName').textContent = store.name || 'Loja ainda não configurada no site';
  $('#sharedStoreMeta').textContent = [store.category, store.address, store.owner].filter(Boolean).join(' · ') || 'Os dados serão sincronizados quando a loja for configurada no site.';
  $('#sharedStoreBadge').textContent = store.name ? 'Loja compartilhada' : 'Aguardando cadastro';
  $('#profileName').textContent = store.name || sharedState?.profile?.name || 'Minha loja';
  $('#profileStore').textContent = store.category || 'Resumo do negócio';
  $('#profileAvatar').textContent = String(store.logoText || store.name || 'AF').slice(0, 2).toUpperCase();
}
function selectedReportOrders() {
  let orders = sellerOrders();
  const mode = $('#reportPeriodSelect').value;
  if (mode === 'custom') {
    const from = $('#reportFrom').value;
    const to = $('#reportTo').value;
    orders = orders.filter(order => (!from || dateKey(order.createdAt) >= from) && (!to || dateKey(order.createdAt) <= to));
  } else orders = filterByPeriod(orders, mode);
  return orders.filter(order => order.status !== 'Cancelado').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
function renderReport() {
  const orders = selectedReportOrders();
  const revenue = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const countItems = orders.reduce((sum, order) => sum + ownItems(order).reduce((n, item) => n + (Number(item.qty) || 0), 0), 0);
  $('#reportRevenue').textContent = money(revenue);
  $('#reportOrders').textContent = orders.length;
  $('#reportAverage').textContent = money(orders.length ? revenue / orders.length : 0);
  $('#reportItems').textContent = countItems;
  renderChart($('#reportChart'), buildChartRows(orders, $('#reportPeriodSelect').value === 'custom' ? 'all' : $('#reportPeriodSelect').value));
  $('#reportTable').innerHTML = orders.map(order => `<tr><td>${formatDate(order.createdAt)}</td><td><strong>#${escapeHtml(order.id)}</strong></td><td>${escapeHtml(order.customer || 'Cliente')}</td><td>${escapeHtml(ownItems(order).map(item => `${item.qty}× ${item.name}`).join(', '))}</td><td>${statusTag(order.status)}</td><td><strong>${money(orderTotal(order))}</strong></td></tr>`).join('');
  $('#reportEmpty').hidden = orders.length > 0;
}
function renderCurrentScreen() {
  const screen = $('.screen:not([hidden])')?.id;
  if (screen === 'screen-dashboard') renderDashboard();
  if (screen === 'screen-sales') renderSales();
  if (screen === 'screen-products') renderProducts();
  if (screen === 'screen-stores') renderStores();
  if (screen === 'screen-reports') renderReport();
}
async function saveSharedState(message) {
  try {
    const result = await window.api.salvarEstadoApp(sharedState);
    revisionAtual = Number(result.revision) || revisionAtual;
    setDbStatus('connected', `Supabase conectado · revisão ${revisionAtual}`);
    if (message) showToast(message);
  } catch (error) {
    setDbStatus('error', 'Falha ao salvar no Supabase');
    showToast(`Não foi possível salvar no banco: ${error.message}`, true);
  }
}
async function refreshState(silent = false) {
  try {
    const data = await window.api.obterEstadoApp();
    if (data?.state && Number(data.revision) > revisionAtual) {
      sharedState = data.state;
      revisionAtual = Number(data.revision) || 0;
      renderDashboard(); renderSales(); renderProducts(); renderStores(); renderReport();
    }
    setDbStatus('connected', data?.state ? `Supabase conectado · revisão ${revisionAtual}` : 'Supabase conectado · aguardando dados do site');
    if (!silent) showToast('Dados atualizados a partir do Supabase.');
  } catch (error) {
    setDbStatus('error', 'Supabase indisponível');
    if (!silent) showToast('Não foi possível consultar o banco Supabase. Confira a conexão.', true);
  }
}
async function reloadSqlLists() {
  try { lojasSql = await window.api.listarLojas(); } catch (error) { lojasSql = []; }
  try { produtosSql = await window.api.listarProdutos(); } catch (error) { produtosSql = []; }
  renderStores();
}
function goToScreen(name) {
  const names = { dashboard: 'Visão geral', sales: 'Vendas e pedidos', products: 'Produtos e cardápio', stores: 'Lojas cadastradas', reports: 'Relatórios' };
  $$('.screen').forEach(screen => screen.hidden = screen.id !== `screen-${name}`);
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.screen === name));
  $('#pageBreadcrumb').textContent = names[name] || 'Visão geral';
  $('#pageTitle').textContent = name === 'dashboard' ? 'Painel de vendas' : names[name] || 'Painel de vendas';
  renderCurrentScreen();
}
function downloadCsv(filename, rows) {
  const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function exportSales() {
  const orders = sellerOrders().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const rows = [['Pedido', 'Cliente', 'Data', 'Pagamento', 'Itens', 'Status', 'Valor da loja']];
  orders.forEach(order => rows.push([order.id, order.customer, formatDateTime(order.createdAt), order.payment, ownItems(order).map(item => `${item.qty}x ${item.name}`).join(', '), order.status, orderTotal(order).toFixed(2)]));
  downloadCsv('acessifood-vendas.csv', rows);
  showToast('Relatório de vendas exportado.');
}
function exportReport() {
  const orders = selectedReportOrders();
  const rows = [['Data', 'Pedido', 'Cliente', 'Pagamento', 'Itens', 'Status', 'Valor']];
  orders.forEach(order => rows.push([formatDate(order.createdAt), order.id, order.customer, order.payment, ownItems(order).map(item => `${item.qty}x ${item.name}`).join(', '), order.status, orderTotal(order).toFixed(2)]));
  downloadCsv('acessifood-relatorio.csv', rows);
  showToast('Relatório exportado.');
}
async function openModal(type) {
  try {
    if (type === 'product') await window.api.abrirModalProduto();
    else await window.api.abrirModalLoja();
  } catch (error) { showToast('Não foi possível abrir o cadastro. Use o menu Cadastros do aplicativo.', true); }
}
async function deleteProduct(id) {
  const product = sharedState.products.find(item => String(item.id) === String(id));
  if (!product || !confirm(`Excluir "${product.name}" do catálogo compartilhado?`)) return;
  if (String(id).startsWith('supabase-product-')) {
    await window.api.excluirProduto(Number(String(id).replace('supabase-product-', ''))).catch(() => {});
  }
  sharedState.products = sharedState.products.filter(item => String(item.id) !== String(id));
  sharedState.orders.forEach(order => { (order.items || []).forEach(item => { if (String(item.productId) === String(id)) item.deletedProduct = true; }); });
  await saveSharedState('Produto removido do estado compartilhado.');
  renderDashboard(); renderProducts();
}
async function toggleProduct(id) {
  const product = sharedState.products.find(item => String(item.id) === String(id));
  if (!product) return;
  product.active = !product.active;
  await saveSharedState(product.active ? 'Produto ativado.' : 'Produto pausado.');
  renderDashboard(); renderProducts();
}
async function deleteStore(id) {
  const store = lojasSql.find(item => Number(item.id) === Number(id));
  if (!store || !confirm(`Excluir a loja "${store.nome}" e os produtos vinculados no cadastro SQL?`)) return;
  try {
    await window.api.excluirLoja(Number(id));
    await reloadSqlLists();
    await refreshState(true);
    showToast('Loja excluída.');
  } catch (error) { showToast('Não foi possível excluir a loja.', true); }
}
async function updateOrderStatus(orderId, status) {
  const order = sharedState.orders.find(item => String(item.id) === String(orderId));
  if (!order) return;
  if (order.status === 'Cancelado' && status !== 'Cancelado') {
    showToast('Um pedido cancelado não pode ser reaberto.', true);
    renderSales();
    return;
  }
  if (status === 'Cancelado' && order.status !== 'Cancelado' && !confirm(`Marcar o pedido ${orderId} como cancelado?`)) { renderSales(); return; }
  order.status = status;
  await saveSharedState(`Status do pedido ${orderId} atualizado.`);
  renderDashboard(); renderSales(); renderReport();
}
function bindEvents() {
  $$('.nav-item').forEach(button => button.addEventListener('click', () => goToScreen(button.dataset.screen)));
  document.addEventListener('click', event => {
    const go = event.target.closest('[data-go]');
    if (go) { goToScreen(go.dataset.go); return; }
    const toggle = event.target.closest('[data-toggle-product]');
    if (toggle) { toggleProduct(toggle.dataset.toggleProduct); return; }
    const remove = event.target.closest('[data-delete-product]');
    if (remove) { deleteProduct(remove.dataset.deleteProduct); return; }
    const delStore = event.target.closest('[data-delete-store]');
    if (delStore) { deleteStore(delStore.dataset.deleteStore); return; }
  });
  $('#btnNewProduct').addEventListener('click', () => openModal('product'));
  $('#btnNewProductInline').addEventListener('click', () => openModal('product'));
  $('#btnNewStore').addEventListener('click', () => openModal('store'));
  $('#btnNewStoreInline').addEventListener('click', () => openModal('store'));
  $('#btnRefresh').addEventListener('click', async () => { await refreshState(); await reloadSqlLists(); });
  $('#dashboardPeriod').addEventListener('change', renderDashboard);
  $('#salesSearch').addEventListener('input', renderSales);
  $('#salesPeriod').addEventListener('change', renderSales);
  $('#salesStatus').addEventListener('change', renderSales);
  $('#productSearch').addEventListener('input', renderProducts);
  $('#productStatus').addEventListener('change', renderProducts);
  $('#salesTable').addEventListener('change', event => {
    const select = event.target.closest('[data-order-status]');
    if (select) updateOrderStatus(select.dataset.orderStatus, select.value);
  });
  $('#reportPeriodSelect').addEventListener('change', () => {
    const custom = $('#reportPeriodSelect').value === 'custom';
    $('#reportFrom').disabled = !custom;
    $('#reportTo').disabled = !custom;
    renderReport();
  });
  $('#btnApplyReport').addEventListener('click', renderReport);
  $('#reportFrom').addEventListener('change', () => { if ($('#reportPeriodSelect').value === 'custom') renderReport(); });
  $('#reportTo').addEventListener('change', () => { if ($('#reportPeriodSelect').value === 'custom') renderReport(); });
  $('#btnExportSales').addEventListener('click', exportSales);
  $('#btnExportReport').addEventListener('click', exportReport);
  $('#reportFrom').disabled = true; $('#reportTo').disabled = true;
}
async function init() {
  bindEvents();
  await refreshState(true);
  sharedState = sharedState || defaultState();
  await reloadSqlLists();
  renderDashboard(); renderSales(); renderProducts(); renderStores(); renderReport();
  goToScreen('dashboard');
  setInterval(async () => {
    try {
      const data = await window.api.obterEstadoApp();
      const newRevision = Number(data?.revision) || 0;
      if (data?.state && newRevision > revisionAtual) {
        sharedState = data.state;
        revisionAtual = newRevision;
        renderDashboard(); renderSales(); renderProducts(); renderStores(); renderReport();
        setDbStatus('connected', `Supabase conectado · revisão ${revisionAtual}`);
      }
    } catch (error) { setDbStatus('error', 'Supabase indisponível'); }
  }, 8000);
}
document.addEventListener('DOMContentLoaded', init);
