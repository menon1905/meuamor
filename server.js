/**
 * Servidor do Quanto Eu Devo?
 * Feito com Node.js puro (Zero dependências externas, executa instantaneamente)
 * Banco de dados persistente em database.json
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// --- Obter IP local da rede Wi-Fi ---
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIp();

// --- Inicialização do Banco de Dados ---
const DEFAULT_DATA = {
  settings: {
    personName: "Minha Mãe",
    payday: 1
  },
  expenses: [
    {
      id: "exp_1",
      title: "Farmácia - Remédios e Vitamina C",
      amount: 48.90,
      date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      category: "saude",
      payer: "Minha Mãe",
      notes: "Passou na farmácia voltando do trabalho",
      isPaid: false,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: "exp_2",
      title: "Uber - Ida para compromisso",
      amount: 32.50,
      date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      category: "transporte",
      payer: "Minha Mãe",
      notes: "Cartão dela estava cadastrado",
      isPaid: false,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: "exp_3",
      title: "Almoço / Lanche da tarde",
      amount: 24.00,
      date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      category: "alimentacao",
      payer: "Minha Mãe",
      notes: "Pix adiantado na hora do almoço",
      isPaid: false,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: "exp_4",
      title: "Itens de higiene no Supermercado",
      amount: 39.80,
      date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      category: "mercado",
      payer: "Minha Mãe",
      notes: "Shampoo e desodorante inclusos nas compras dela",
      isPaid: true,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    }
  ]
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
      return DEFAULT_DATA;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler banco de dados:', err);
    return DEFAULT_DATA;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar banco de dados:', err);
    return false;
  }
}

// Ensure DB exists
readDb();

// --- MIME Types ---
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Helper para responder JSON
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify(data));
  };

  // Helper para ler body da requisição
  const parseBody = (cb) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        cb(null, json);
      } catch (e) {
        cb(e, null);
      }
    });
  };

  // --- API ROUTES ---

  // GET /api/info
  if (req.method === 'GET' && pathname === '/api/info') {
    return sendJson(200, {
      status: 'online',
      localIp: LOCAL_IP,
      port: PORT,
      localUrl: `http://${LOCAL_IP}:${PORT}`,
      databasePath: DB_FILE
    });
  }

  // GET /api/data
  if (req.method === 'GET' && pathname === '/api/data') {
    const db = readDb();
    return sendJson(200, db);
  }

  // POST /api/expenses
  if (req.method === 'POST' && pathname === '/api/expenses') {
    return parseBody((err, expense) => {
      if (err || !expense || !expense.title) {
        return sendJson(400, { error: 'Dados inválidos do gasto' });
      }
      const db = readDb();
      if (!expense.id) {
        expense.id = 'exp_' + Date.now();
      }
      if (!expense.createdAt) {
        expense.createdAt = new Date().toISOString();
      }
      db.expenses.unshift(expense);
      writeDb(db);
      return sendJson(201, { success: true, expense, allExpenses: db.expenses });
    });
  }

  // PUT /api/expenses/:id
  if (req.method === 'PUT' && pathname.startsWith('/api/expenses/')) {
    const id = pathname.replace('/api/expenses/', '');
    return parseBody((err, updatedFields) => {
      if (err) return sendJson(400, { error: 'JSON inválido' });
      const db = readDb();
      const index = db.expenses.findIndex(x => x.id === id);
      if (index === -1) {
        return sendJson(404, { error: 'Gasto não encontrado' });
      }
      db.expenses[index] = { ...db.expenses[index], ...updatedFields };
      writeDb(db);
      return sendJson(200, { success: true, expense: db.expenses[index] });
    });
  }

  // DELETE /api/expenses/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/expenses/')) {
    const id = pathname.replace('/api/expenses/', '');
    const db = readDb();
    const initialLen = db.expenses.length;
    db.expenses = db.expenses.filter(x => x.id !== id);
    if (db.expenses.length === initialLen) {
      return sendJson(404, { error: 'Gasto não encontrado' });
    }
    writeDb(db);
    return sendJson(200, { success: true, deletedId: id });
  }

  // POST /api/settle-all
  if (req.method === 'POST' && pathname === '/api/settle-all') {
    const db = readDb();
    db.expenses.forEach(x => { x.isPaid = true; });
    writeDb(db);
    return sendJson(200, { success: true, count: db.expenses.length });
  }

  // PUT /api/settings
  if (req.method === 'PUT' && pathname === '/api/settings') {
    return parseBody((err, newSettings) => {
      if (err) return sendJson(400, { error: 'JSON inválido' });
      const db = readDb();
      db.settings = { ...db.settings, ...newSettings };
      writeDb(db);
      return sendJson(200, { success: true, settings: db.settings });
    });
  }

  // POST /api/reset-demo
  if (req.method === 'POST' && pathname === '/api/reset-demo') {
    writeDb(DEFAULT_DATA);
    return sendJson(200, { success: true, data: DEFAULT_DATA });
  }

  // --- STATIC FILES ---
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Arquivo não encontrado');
      } else {
        res.writeHead(500);
        res.end(`Erro no servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('======================================================');
    console.log('  💳 QUANTO EU DEVO? — SERVIDOR & BANCO DE DADOS ATIVO');
    console.log('======================================================');
    console.log(`\n💻 No seu Computador:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`\n📱 No Celular da sua Mãe (Mesmo Wi-Fi):`);
    console.log(`   http://${LOCAL_IP}:${PORT}`);
    console.log(`\n💾 Banco de Dados Salvo em:`);
    console.log(`   ${DB_FILE}`);
    console.log('======================================================\n');
  });
}

module.exports = server;
