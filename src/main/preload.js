const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Operações de Lojas
  criarLoja: (loja) => ipcRenderer.invoke('loja:criar', loja),
  listarLojas: () => ipcRenderer.invoke('loja:listar'),
  excluirLoja: (id) => ipcRenderer.invoke('loja:excluir', id),

  // Operações de Produtos
  criarProduto: (produto) => ipcRenderer.invoke('produto:criar', produto),
  listarProdutos: () => ipcRenderer.invoke('produto:listar'),
  excluirProduto: (id) => ipcRenderer.invoke('produto:excluir', id),

  // Relatórios e Backup
  salvarRelatorioProdutos: (conteudo) => ipcRenderer.invoke('arquivo:salvarRelatorio', conteudo),
  exportarBackupProdutos: (dados) => ipcRenderer.invoke('arquivo:exportarJson', dados),
  importarBackupProdutos: () => ipcRenderer.invoke('arquivo:importarJson')
});