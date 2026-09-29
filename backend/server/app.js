const express = require('express');
const cors = require('cors');

const app = express();

// Middleware globais
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
}));

// Rotas
app.use('/leads', require('../router/lead.route'))

app.get('/', (req, res) => res.json({
    message: 'API funcionando!'
}));

app.use((req, res) => res.status(404).json({ 
    erro: 'Rota não encontrada' 
}))

module.exports = app;