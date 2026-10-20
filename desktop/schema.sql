-- Tabela referente ao RF5 (Criação/Gerenciamento de Lojas)
CREATE TABLE IF NOT EXISTS loja (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  dono_nome VARCHAR(100) NOT NULL,
  cnpj VARCHAR(20),
  endereco VARCHAR(200) NOT NULL,
  paleta_cores VARCHAR(50) DEFAULT 'Padrão'
);

-- Tabela referente ao RF6 (Inserção e Gerenciamento de Produtos)
CREATE TABLE IF NOT EXISTS produto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loja_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  descricao VARCHAR(255),
  clima VARCHAR(20) DEFAULT 'Todos', -- Frio, Calor ou Todos
  apimentado TINYINT(1) DEFAULT 0,
  gluten TINYINT(1) DEFAULT 1,
  lactose TINYINT(1) DEFAULT 1,
  FOREIGN KEY (loja_id) REFERENCES loja(id) ON DELETE CASCADE
);