const CN_OFFSET_MINUTES = 480

function pad(value) {
  return value < 10 ? '0' + value : '' + value
}

/** 解析后端返回的时间（UTC），返回本地 Date；解析失败返回 null */
function parseDate(value) {
  if (!value) return null
  const matched = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
  if (!matched) return null
  const utc = Date.UTC(
    Number(matched[1]),
    Number(matched[2]) - 1,
    Number(matched[3]),
    Number(matched[4]),
    Number(matched[5]),
    Number(matched[6])
  )
  return new Date(utc)
}

/** 统一按东八区展示，避免真机时区差异导致日期跳动 */
function toChina(date) {
  return new Date(date.getTime() + CN_OFFSET_MINUTES * 60 * 1000)
}

function formatDate(value) {
  const date = parseDate(value)
  if (!date) return ''
  const local = toChina(date)
  return local.getUTCFullYear() + '-' + pad(local.getUTCMonth() + 1) + '-' + pad(local.getUTCDate())
}

function formatDateTime(value) {
  const date = parseDate(value)
  if (!date) return ''
  const local = toChina(date)
  return formatDate(value) + ' ' + pad(local.getUTCHours()) + ':' + pad(local.getUTCMinutes())
}

function formatPeriod(value) {
  const date = parseDate(value)
  if (!date) return ''
  const local = toChina(date)
  return local.getUTCFullYear() + '.' + pad(local.getUTCMonth() + 1) + '.' + pad(local.getUTCDate())
}

/** 距截止还有几天；已过期返回 0 */
function daysUntil(value) {
  const date = parseDate(value)
  if (!date) return 0
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

/** 截止时间：「10月31日 23:59」；无值返回「额满即止」 */
function formatDeadline(value) {
  const date = parseDate(value)
  if (!date) return '额满即止'
  const local = toChina(date)
  return (local.getUTCMonth() + 1) + '月' + local.getUTCDate() + '日 ' +
    pad(local.getUTCHours()) + ':' + pad(local.getUTCMinutes())
}

function maskPhone(phone) {
  const text = String(phone || '')
  if (text.length < 7) return text
  return text.slice(0, 3) + '****' + text.slice(-4)
}

function initialOf(name) {
  const text = String(name || '').trim()
  if (!text) return '道'
  return text.slice(0, 1)
}

module.exports = {
  parseDate,
  formatDate,
  formatDateTime,
  formatPeriod,
  formatDeadline,
  daysUntil,
  maskPhone,
  initialOf
}
