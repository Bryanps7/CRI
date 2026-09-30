const WHAPI_URL = 'https://gate.whapi.cloud/messages/text'

// Envia uma mensagem de texto pelo WhatsApp (Whapi).
// `to` pode ser o chat_id recebido no webhook (ex.: 554891335733@s.whatsapp.net)
async function sendText(to, body) {
    const token = process.env.WHAPI_TOKEN
    if (!token) throw new Error('WHAPI_TOKEN não configurado no .env')

    const res = await fetch(WHAPI_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({ to, body }),
        signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
        const detail = (await res.text()).slice(0, 300)
        throw new Error(`Whapi respondeu ${res.status}: ${detail}`)
    }
    return res.json()
}

module.exports = { sendText }
