// Converte o número da Whapi (ex.: 554891375142) para o formato usado no banco (ex.: 47992564689)
// - remove o DDI 55
// - se vier com 10 dígitos e for celular (começa com 6-9 depois do DDD), adiciona o 9
//   (o WhatsApp ainda entrega alguns números antigos sem o nono dígito)
function normalizePhone(raw) {
    let digits = String(raw ?? '').replace(/\D/g, '')

    if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2)

    if (digits.length === 10 && /^[6-9]/.test(digits[2])) {
        digits = digits.slice(0, 2) + '9' + digits.slice(2)
    }

    if (digits.length < 10 || digits.length > 11) return null
    return digits
}

module.exports = { normalizePhone }
