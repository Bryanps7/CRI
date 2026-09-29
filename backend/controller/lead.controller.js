const service = require('../service/lead.service')

function parseId(value) {
    const id = Number(value)
    if(!Number.isInteger(id) || id <= 0) {
        const err = new Error('ID inválido')
        err.status = 400
        throw err
    }
    return id
}

async function list(req, res) {
    const { status, search, stale } = req.query
    const leads = await service.list({ status, search, stale })
    res.json(leads)
}

async function quantityStatus(req, res) {
    const quantityStatus = await service.quantityStatus()
    res.json(quantityStatus)
}

async function quantityOrigin(req, res) {
    const quantityOrigin = await service.quantityOrigin()
    res.json(quantityOrigin)
}

async function getById(req, res) {
    const id = parseId(req.params.id)
    const lead = await service.getById(id)  
}

async function getByPhone(req, res) {
    const { phone } = req.params
    const lead = await service.getByPhone(phone)
}

async function create(req, res) {
    const lead = req.body
    const createdLead = await service.create(lead)
    res.status(201).json(createdLead)
}

async function update(req, res) {
    const id = parseId(req.params.id)
    const lead = req.body
    const updatedLead = await service.update(id, lead)
    res.json(updatedLead)
}

async function registerContact(req, res) {
    const id = parseId(req.params.id)
    const { contactDate } = req.body
    const updatedLead = await service.registerContact(id, contactDate)
    res.json(updatedLead)
}

module.exports = {
    list,
    quantityStatus,
    quantityOrigin,
    getById,
    getByPhone,
    create,
    update,
    registerContact
}