const { getCloud } = require('../utils/cloud')

/** 提交报名：owner_id 由数据库默认值写入，前端绝不传 */
async function create(payload) {
  const { data, error } = await getCloud()
    .database
    .from('enrollments')
    .insert(payload)
    .select()
  if (error) {
    const failure = new Error(error.message || '报名提交失败')
    failure.code = error.code
    throw failure
  }
  const rows = Array.isArray(data) ? data : []
  if (!rows.length) throw new Error('报名未提交成功，请稍后重试')
  return rows[0]
}

/** 我的报名记录（RLS 只返回本人数据） */
async function listMine() {
  const { data, error } = await getCloud()
    .database
    .from('enrollments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message || '报名记录加载失败')
  return Array.isArray(data) ? data : []
}

/** 取消报名：置为 canceled，不影响已用名额统计之外的展示 */
async function cancel(id) {
  const { data, error } = await getCloud()
    .database
    .from('enrollments')
    .update({ status: 'canceled' })
    .eq('id', id)
    .select()
  if (error) throw new Error(error.message || '取消失败')
  const rows = Array.isArray(data) ? data : []
  if (!rows.length) throw new Error('未找到这条报名记录')
  return rows[0]
}

module.exports = { create, listMine, cancel }
