const crypto = require('crypto')
const { handleWhapi } = require('../service/webhook.service')

async function receiveWhapi(req, res) {
    res.sendStatus(200)

    handleWhapi(req.body).catch(err => console.error('[webhook] erro inesperado:', err))
}

module.exports = { receiveWhapi }
