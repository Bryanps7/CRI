const CAMPOS_TEXTO = ['status', 'property_of_Interest', 'origin', 'observation']

function erro(message) {
    const err = new Error(message)
    err.status = 400
    return err
}

function textoOuNull(v) { 
    if(v == null || String(v).trim() === '') {
        return null
    } else {
        return String(v).trim()
    }
}

// Aceita só os campos da tabela e normaliza os valores.
// partial = true (update): só valida/inclui o que veio no body.
function format(body = {}, { partial = false } = {}) {
    const output = {}

    if (!partial || 'name' in body) {
        const name = textoOuNull(body.name)
        if (!name) throw erro('O nome é obrigatório')
        output.name = name
    }

    if ('phone' in body) {
        const digits = String(body.phone ?? '').replace(/\D/g, '')
        if (digits && (digits.length < 10 || digits.length > 11)) {
            throw erro('Telefone inválido: use DDD + número (10 a 11 dígitos)')
        }

        if(digits) output.phone = Number(digits)
        else output.phone = null
    }

    for (const campo of CAMPOS_TEXTO) {
        if (campo in body) output[campo] = textoOuNull(body[campo])
    }

    if ('last_contact' in body) {
        const d = new Date(body.last_contact)
        if (isNaN(d)) throw erro('Data de último contato inválida')
        output.last_contact = d.toISOString()
    } else {
        output.last_contact = null
    }

    if (partial && Object.keys(output).length === 0) throw erro('Nenhum campo para atualizar')
    return output
}

module.exports = { format }
