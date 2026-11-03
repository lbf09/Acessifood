document.addEventListener("DOMContentLoaded", async () => {
  const lojas = await window.api.listarLojas();
  const select = document.querySelector("#selectLoja");
  const params = new URLSearchParams(window.location.search);
  const editId = Number(params.get("produtoId")) || null;
  const sharedId = params.get("produtoCompartilhadoId") ? decodeURIComponent(params.get("produtoCompartilhadoId")) : null;
  const form = document.querySelector("#formProduto");
  const title = document.querySelector("#formTitle");
  const submit = form.querySelector('[type="submit"]');
  let sharedProduct = null;
  let sharedState = null;
  select.innerHTML = lojas.length ? lojas.map(l => `<option value="${l.id}">${String(l.nome).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</option>`).join('') : '<option value="">Cadastre uma loja primeiro!</option>';
  if (sharedId) {
    try {
      const result = await window.api.obterEstadoApp();
      sharedState = result?.state;
      sharedProduct = sharedState?.products?.find(p => String(p.id) === sharedId);
      if (!sharedProduct) throw new Error('Produto não encontrado no estado compartilhado.');
      title.textContent = 'Editar Produto';
      submit.textContent = 'Salvar Alterações';
      form.elements.namedItem('loja_id').closest('.mb-3').hidden = true;
      form.elements.namedItem('nome').value = sharedProduct.name || '';
      form.elements.namedItem('preco').value = Number(sharedProduct.price || 0).toFixed(2);
      form.elements.namedItem('clima').value = sharedProduct.hotMeal ? 'Frio' : 'Todos';
      form.elements.namedItem('descricao').value = sharedProduct.description || '';
      form.elements.namedItem('apimentado').checked = Boolean(sharedProduct.spicy);
      form.elements.namedItem('gluten').checked = !Boolean(sharedProduct.glutenFree);
      form.elements.namedItem('lactose').checked = !Boolean(sharedProduct.lactoseFree);
    } catch (error) {
      alert('Não foi possível carregar o produto compartilhado para edição.');
      submit.disabled = true;
    }
  } else if (editId) {
    try {
      const products = await window.api.listarProdutos();
      const product = products.find(p => Number(p.id) === editId);
      if (!product) throw new Error('Produto não encontrado.');
      title.textContent = 'Editar Produto';
      submit.textContent = 'Salvar Alterações';
      form.elements.namedItem('loja_id').value = String(product.loja_id);
      form.elements.namedItem('nome').value = product.nome || '';
      form.elements.namedItem('preco').value = Number(product.preco || 0).toFixed(2);
      form.elements.namedItem('clima').value = product.clima || 'Todos';
      form.elements.namedItem('descricao').value = product.descricao || '';
      form.elements.namedItem('apimentado').checked = Boolean(product.apimentado);
      form.elements.namedItem('gluten').checked = Boolean(product.gluten);
      form.elements.namedItem('lactose').checked = Boolean(product.lactose);
    } catch (error) {
      alert('Não foi possível carregar o produto para edição.');
      submit.disabled = true;
    }
  } else if (!lojas.length) {
    submit.disabled = true;
  }
  form.dataset.editId = editId || '';
  form.dataset.sharedId = sharedId || '';
});

document.querySelector("#formProduto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const dados = {
    loja_id: Number(formData.get("loja_id")),
    nome: String(formData.get("nome") || '').trim(),
    preco: Number(formData.get("preco")),
    descricao: formData.get("descricao"),
    clima: formData.get("clima"),
    apimentado: formData.has("apimentado"),
    gluten: formData.has("gluten"),
    lactose: formData.has("lactose"),
  };
  if (!dados.nome || !Number.isFinite(dados.preco) || dados.preco < 0) {
    alert('Informe um nome e um preço válido.');
    return;
  }
  try {
    const sharedId = e.target.dataset.sharedId;
    const editId = Number(e.target.dataset.editId) || null;
    if (sharedId) {
      const result = await window.api.obterEstadoApp();
      const state = result?.state;
      const product = state?.products?.find(p => String(p.id) === sharedId);
      if (!product) throw new Error('O produto não foi encontrado no estado compartilhado.');
      product.name = dados.nome;
      product.price = dados.preco;
      product.description = String(dados.descricao || '');
      product.hotMeal = dados.clima !== 'Calor';
      product.spicy = dados.apimentado;
      product.glutenFree = !dados.gluten;
      product.lactoseFree = !dados.lactose;
      const saved = await window.api.salvarEstadoApp(state);
      if (saved === false) throw new Error('O estado compartilhado não foi salvo.');
    } else if (editId) await window.api.editarProduto(editId, dados);
    else await window.api.criarProduto(dados);
    alert(editId || sharedId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
    if (window.api.fecharJanelaAtual) await window.api.fecharJanelaAtual();
  } catch (erro) {
    console.error('Erro ao salvar produto:', erro);
    alert(`Não foi possível salvar o produto. ${erro.message || 'Confira a conexão e os dados.'}`);
  }
});
