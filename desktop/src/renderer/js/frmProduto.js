document.addEventListener("DOMContentLoaded", async () => {
  const lojas = await window.api.listarLojas();
  const select = document.querySelector("#selectLoja");
  if (lojas.length === 0) {
    select.innerHTML = '<option value="">Cadastre uma loja primeiro!</option>';
    return;
  }
  select.innerHTML = lojas.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
});

document.querySelector("#formProduto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const dados = {
    loja_id: Number(formData.get("loja_id")),
    nome: formData.get("nome"),
    preco: Number(formData.get("preco")),
    descricao: formData.get("descricao"),
    clima: formData.get("clima"),
    apimentado: Boolean(formData.get("apimentado")),
    gluten: Boolean(formData.get("gluten")),
    lactose: Boolean(formData.get("lactose")),
  };

  try {
    await window.api.criarProduto(dados);
    alert("Produto cadastrado com sucesso!");
    e.target.reset();
    if (window.api.fecharJanelaAtual) await window.api.fecharJanelaAtual();
  } catch (erro) {
    console.error("Erro ao cadastrar produto:", erro);
    alert("Não foi possível cadastrar o produto.");
  }
});