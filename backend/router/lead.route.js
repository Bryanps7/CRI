const express = require('express')
const router = express.Router()
const {
    list, quantityStatus, quantityOrigin, getByPhone, getById, create, update, registerContact
} = require('../controller/lead.controller')

router.get('/', list)                         // GET   /leads?status=&search=&stale=true
router.get('/quantityStatus', quantityStatus)               // GET   /leads/quantityStatus
router.get('/quantityOrigin', quantityOrigin)               // GET   /leads/quantityOrigin
router.get('/phone/:phone', getByPhone)       // GET   /leads/phone/48999998888
router.get('/:id', getById)                   // GET   /leads/1
router.post('/', create)                      // POST  /leads
router.put('/:id', update)                    // PUT   /leads/1
router.patch('/:id/contact', registerContact) // PATCH /leads/1/contact

module.exports = router
