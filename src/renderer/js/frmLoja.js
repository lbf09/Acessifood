document.querySelector("#formLoja").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(e.target));
  try {
    await window.api.criarLoja(dados);
    alert("Loja cadastrada com sucesso!");
    e.target.reset();
  } catch (erro) {
    console.error("Erro ao cadastrar loja:", erro);
    alert("Não foi possível cadastrar a loja.");
  }
});