let produtosCarregados = [];

const formatarMoeda = (val) => `R$ ${Number(val).toFixed(2)}`;

const carregarLojas = async () => {
  const lojas = await window.api.listarLojas();
  const tbody = document.querySelector("#tbodyLojas");
  if (lojas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma loja cadastrada.</td></tr>';
    return;
  }
  tbody.innerHTML = lojas.map(l => `
    <tr>
      <td>${l.id}</td>
      <td>${l.nome}</td>
      <td>${l.dono_nome}</td>
      <td>${l.cnpj || '-'}</td>
      <td>${l.endereco}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="excluirLoja(${l.id})">Excluir</button>
      </td>
    </tr>
  `).join('');
};

const carregarProdutos = async () => {
  produtosCarregados = await window.api.listarProdutos();
  const tbody = document.querySelector("#tbodyProdutos");
  if (produtosCarregados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = produtosCarregados.map(p => `
    <tr>
      <td>${p.loja_nome}</td>
      <td>${p.nome}</td>
      <td>${formatarMoeda(p.preco)}</td>
      <td>${p.clima}</td>
      <td>${p.gluten ? 'Sim' : 'Não'}</td>
      <td>${p.lactose ? 'Sim' : 'Não'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="excluirProduto(${p.id})">Excluir</button>
      </td>
    </tr>
  `).join('');
};

window.excluirLoja = async (id) => {
  if (confirm("Deseja realmente excluir esta loja? Todos os seus produtos também serão removidos.")) {
    await window.api.excluirLoja(id);
    carregarLojas();
    carregarProdutos();
  }
};

window.excluirProduto = async (id) => {
  if (confirm("Deseja excluir este produto?")) {
    await window.api.excluirProduto(id);
    carregarProdutos();
  }
};

document.querySelector("#btnExportarRelatorio").addEventListener("click", () => {
  const linhas = produtosCarregados.map(p => `${p.loja_nome} | ${p.nome} - ${formatarMoeda(p.preco)} (Clima: ${p.clima})`);
  window.api.salvarRelatorioProdutos(linhas.join('\n'));
});

document.querySelector("#btnExportarBackup").addEventListener("click", () => {
  window.api.exportarBackupProdutos(produtosCarregados);
});

document.querySelector("#btnImportarBackup").addEventListener("click", async () => {
  const produtos = await window.api.importarBackupProdutos();
  if (!produtos) return;
  for (const prod of produtos) {
    await window.api.criarProduto(prod);
  }
  carregarProdutos();
});

carregarLojas();
carregarProdutos();