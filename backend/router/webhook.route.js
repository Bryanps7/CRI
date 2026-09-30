const express = require('express')
const router = express.Router()
const { receiveWhapi } = require('../controller/webhook.controller')

router.post('/whapi', receiveWhapi) // POST /webhook/whapi

module.exports = router
