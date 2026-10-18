const { getCloud } = require('../utils/cloud')

const ACTIVITY_SLUG = 'qingcheng-2026-autumn'

/** 课业 key → 本地符号图（由 ComfyUI 出图、BiRefNet 去背，108×108 透明 PNG） */
const TRACK_ICONS = {
  sword: 'sword',
  alchemy: 'alchemy',
  talisman: 'talisman',
  array: 'array',
  meditation: 'meditate',
  meditate: 'meditate'
}

/** 给课业补上 icon 路径；未登记的 key 留空，页面回落成原来的菱形点，不会破图 */
function decorateTracks(tracks) {
  if (!Array.isArray(tracks)) return []
  return tracks.map((item) => {
    const track = item || {}
    const icon = TRACK_ICONS[track.key]
    return Object.assign({}, track, {
      icon: icon ? '/assets/tracks/' + icon + '.png' : ''
    })
  })
}

/** 山中四事底纹：按序号对应淡墨图（均已预处理为 1.25:1，与卡片同比） */
const HIGHLIGHT_IMAGES = {
  '01': '/assets/highlights/lecture.jpg',
  '02': '/assets/highlights/dawn.jpg',
  '03': '/assets/highlights/retreat.jpg',
  '04': '/assets/highlights/scroll.jpg'
}

/** 给四事卡片补底纹；未登记的序号留空，卡片回落成纯白底，不会破图 */
function decorateHighlights(list) {
  if (!Array.isArray(list)) return []
  return list.map((item) => {
    const row = item || {}
    return Object.assign({}, row, {
      image: HIGHLIGHT_IMAGES[String(row.no || '')] || ''
    })
  })
}

/** 读取活动主数据（公开只读，未登录也可加载） */
async function fetchActivity() {
  const { data, error } = await getCloud()
    .database
    .from('activities')
    .select('*')
    .eq('slug', ACTIVITY_SLUG)
    .limit(1)
  if (error) throw new Error(error.message || '活动信息加载失败')
  const row = (data && data[0]) || null
  if (row) {
    row.tracks = decorateTracks(row.tracks)
    row.highlights = decorateHighlights(row.highlights)
  }
  return row
}

/** 已报名人数（服务端聚合，不暴露任何报名人信息） */
async function fetchEnrolledCount(activityId) {
  if (!activityId) return 0
  try {
    const { data, error } = await getCloud()
      .database
      .rpc('activity_enrollment_count', { p_activity_id: activityId })
    if (error) return 0
    if (typeof data === 'number') return data
    if (Array.isArray(data) && data.length) {
      const first = data[0]
      if (typeof first === 'number') return first
      if (first && typeof first.activity_enrollment_count === 'number') {
        return first.activity_enrollment_count
      }
    }
    return 0
  } catch (error) {
    return 0
  }
}

module.exports = {
  ACTIVITY_SLUG,
  fetchActivity,
  fetchEnrolledCount,
  decorateTracks,
  decorateHighlights
}
