const supabase = require('../db/supabase')
const { format } = require('../utils/validacao')

const TABLE = 'leads'
const NONE = '__none__'
const STALE_DAYS = 7

function httpError(status, message) {
    const err = new Error(message)
    err.status = status
    return err
}

function check(error) {
    if (!error) return
    if (error.code === '23505') throw httpError(409, 'Já existe um lead com esse telefone')
    if (error.code === 'PGRST116') throw httpError(404, 'Lead não encontrado')
    throw httpError(500, error.message)
}

async function list({ status = '', search = '', stale = false } = {}) {
    let table = supabase.from(TABLE).select('*').order('created_at', { ascending: false })

    if (status === NONE) table = table.is('status', null)
    else if (status) table = table.eq('status', status)

    const term = String(search).trim().replace(/[,()*%]/g, ' ').trim()
    if (term) {
        const parts = [
            `name.ilike.%${term}%`,
            `property_of_Interest.ilike.%${term}%`,
            `origin.ilike.%${term}%`
        ]
        if (/^\d+$/.test(term)) parts.push(`phone.eq.${term}`)
        table = table.or(parts.join(','))
    }

    if (stale) {
        const limit = new Date(Date.now() - STALE_DAYS * 864e5).toISOString()
        table = table.or(`last_contact.is.null,last_contact.lt.${limit}`)
    }

    const { data, error } = await table
    check(error)
    return data
}

async function quantityStatus() {
    const { data, error } = await supabase.from(TABLE).select('status')
    check(error)
    const counts = {}
    data.forEach(dados => {
        const i = dados.status || NONE
        counts[i] = (counts[i] || 0) + 1
    })
    return { counts, total: data.length }
}

async function quantityOrigin() {
    const { data, error } = await supabase.from(TABLE).select('origin')
    check(error)
    const counts = {}
    data.forEach(dados => {
        const i = dados.origin || NONE
        counts[i] = (counts[i] || 0) + 1
    })
    return { counts, total: data.length }
}

async function getById(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    check(error)
    return data
}

async function getByPhone(phone) {
    const digits = String(phone).replace(/\D/g, '')
    if (!digits) throw httpError(400, 'Telefone inválido')
    const { data, error } = await supabase.from(TABLE).select('*').eq('phone', Number(digits))
    check(error)
    if (!data) throw httpError(404, 'Lead não encontrado')
    return data
}

async function findByPhone(phone) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('phone', Number(phone)).maybeSingle()
    check(error)
    return data
}

async function create(body) {
    const lead = format(body)
    const { data, error } = await supabase.from(TABLE).insert(lead).select().single()
    check(error)
    return data
}

async function update(id, body) {
    const changes = format(body, { partial: true })
    const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single()
    check(error)
    return data
}

async function registerContact(id) {
    return update(id, { last_contact: new Date().toISOString() })
}

module.exports = { list, quantityStatus, quantityOrigin, getById, getByPhone, findByPhone, create, update, registerContact }
