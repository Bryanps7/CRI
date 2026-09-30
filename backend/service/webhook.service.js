const leadService = require('./lead.service')
const { analyzeMessage } = require('./llm.service')
const { sendText } = require('./whapi.service')
const { normalizePhone } = require('../utils/phone')

const LEAD_STATUS = 'novo'

function fallbackGreeting(name) {
    const first = name.split(' ')[0]
    return `Olá, ${first}! Recebi sua mensagem e um de nossos consultores de investimentos imobiliários falará com você em breve.`
}

async function handleMessage(msg) {
    if (msg.from_me !== false) return
    if (msg.type !== 'text' || !msg.text?.body?.trim()) return
    if (!String(msg.chat_id ?? '').endsWith('@s.whatsapp.net')) return

    const phone = normalizePhone(msg.chat_id)
    if (!phone) {
        console.warn(`[webhook] telefone inválido ignorado: ${msg.chat_id}`)
        return
    }

    if (await leadService.findByPhone(phone)) return

    const text = msg.text.body.trim()

    // 1) LLM: filtra os dados e prepara a saudação (se falhar, cadastra mesmo assim)
    let analysis = { name: null, property_of_interest: null, greeting: null }
    try {
        analysis = await analyzeMessage({ text, fromName: msg.from_name })
    } catch (err) {
        console.error('[webhook] falha na LLM, seguindo com dados básicos:', err.message)
    }

    const name = analysis.name || msg.from_name?.trim() || `Lead ${phone}`

    // 2) cadastro
    try {
        await leadService.create({
            name,
            phone,
            property_of_Interest: analysis.property_of_interest,
            origin: '',
            status: LEAD_STATUS,
            observation: null,
            last_contact: new Date().toISOString()
        })
    } catch (err) {
        if (err.status === 409) return // outra mensagem cadastrou o mesmo número ao mesmo tempo
        throw err
    }
    console.log(`[webhook] novo lead cadastrado: ${name} (${phone})`)

    // 3) saudação inicial
    try {
        await sendText(msg.chat_id, analysis.greeting || fallbackGreeting(name))
    } catch (err) {
        console.error('[webhook] lead cadastrado, mas a saudação falhou:', err.message)
    }
}

async function handleWhapi(payload) {
    if (payload?.event?.type !== 'messages' || payload?.event?.event !== 'post') return
    if (!Array.isArray(payload.messages)) return

    for (const msg of payload.messages) {
        try {
            await handleMessage(msg)
        } catch (err) {
            console.error(`[webhook] erro ao processar mensagem ${msg?.id}:`, err.message)
        }
    }
}

module.exports = { handleWhapi }
