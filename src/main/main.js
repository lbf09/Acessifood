const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const conexao = require('./conexao');

const testarConexao = () => {
  conexao.connect((erro) => {
    if (erro) {
      console.error('Erro ao conectar ao banco:', erro.message);
      dialog.showErrorBox('Erro de Conexão', `Não foi possível conectar ao banco MySQL:\n${erro.message}`);
      return;
    }
    console.log('Conectado ao banco AcessiFood!');
  });
};

const abrirModalLoja = (janelaPrincipal) => {
  const modal = new BrowserWindow({
    width: 480, height: 580, parent: janelaPrincipal, modal: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  modal.removeMenu();
  modal.loadFile(path.join(__dirname, '../renderer/frmLoja.html'));
};

const abrirModalProduto = (janelaPrincipal) => {
  const modal = new BrowserWindow({
    width: 520, height: 680, parent: janelaPrincipal, modal: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  modal.removeMenu();
  modal.loadFile(path.join(__dirname, '../renderer/frmProduto.html'));
};

app.whenReady().then(() => {
  testarConexao();

  const janelaPrincipal = new BrowserWindow({
    width: 1050, height: 750,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });

  janelaPrincipal.loadFile(path.join(__dirname, '../renderer/frmPrincipal.html'));

  const menuTemplate = [
    {
      label: 'Cadastros',
      submenu: [
        { label: 'Nova Loja', click: () => abrirModalLoja(janelaPrincipal) },
        { label: 'Novo Produto', click: () => abrirModalProduto(janelaPrincipal) }
      ]
    },
    {
      label: 'Sistema',
      submenu: [{ label: 'Sair', role: 'quit' }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // --- HANDLERS IPC DE LOJA ---
  ipcMain.handle('loja:criar', (e, loja) => {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO loja (nome, dono_nome, cnpj, endereco, paleta_cores) VALUES (?, ?, ?, ?, ?)';
      conexao.query(sql, [loja.nome, loja.dono_nome, loja.cnpj, loja.endereco, loja.paleta_cores], (err, res) => {
        if (err) return reject(err);
        resolve({ id: res.insertId, ...loja });
      });
    });
  });

  ipcMain.handle('loja:listar', () => {
    return new Promise((resolve, reject) => {
      conexao.query('SELECT * FROM loja ORDER BY nome ASC', (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  });

  ipcMain.handle('loja:excluir', (e, id) => {
    return new Promise((resolve, reject) => {
      conexao.query('DELETE FROM loja WHERE id = ?', [id], (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  });

  // --- HANDLERS IPC DE PRODUTO ---
  ipcMain.handle('produto:criar', (e, prod) => {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO produto (loja_id, nome, preco, descricao, clima, apimentado, gluten, lactose) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      conexao.query(sql, [prod.loja_id, prod.nome, prod.preco, prod.descricao, prod.clima, prod.apimentado, prod.gluten, prod.lactose], (err, res) => {
        if (err) return reject(err);
        resolve({ id: res.insertId, ...prod });
      });
    });
  });

  ipcMain.handle('produto:listar', () => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*, l.nome AS loja_nome 
        FROM produto p 
        JOIN loja l ON p.loja_id = l.id 
        ORDER BY p.nome ASC`;
      conexao.query(sql, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  });

  ipcMain.handle('produto:excluir', (e, id) => {
    return new Promise((resolve, reject) => {
      conexao.query('DELETE FROM produto WHERE id = ?', [id], (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  });

  // --- RELATÓRIOS E BACKUP ---
  ipcMain.handle('arquivo:salvarRelatorio', async (e, conteudo) => {
    const { canceled, filePath } = await dialog.showSaveDialog(janelaPrincipal, {
      title: 'Exportar Relatório de Produtos',
      defaultPath: 'relatorio-produtos.txt',
      filters: [{ name: 'Texto', extensions: ['txt'] }]
    });
    if (!canceled && filePath) await fs.writeFile(filePath, conteudo);
  });

  ipcMain.handle('arquivo:exportarJson', async (e, dados) => {
    const { canceled, filePath } = await dialog.showSaveDialog(janelaPrincipal, {
      title: 'Exportar Backup JSON',
      defaultPath: 'backup-produtos.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (!canceled && filePath) await fs.writeFile(filePath, JSON.stringify(dados, null, 2));
  });

  ipcMain.handle('arquivo:importarJson', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(janelaPrincipal, {
      title: 'Importar Backup JSON',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || filePaths.length === 0) return null;
    const conteudo = await fs.readFile(filePaths[0], 'utf-8');
    return JSON.parse(conteudo);
  });
});