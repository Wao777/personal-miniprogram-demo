const activityApi = require('../../api/activity')
const enrollmentApi = require('../../api/enrollment')
const auth = require('../../utils/auth')
const media = require('../../utils/media')
const format = require('../../utils/format')

Page({
  data: {
    loading: true,
    failed: false,
    activity: {},
    schedule: [],
    tracks: [],
    notices: [],
    badgeText: '',
    // 默认用包内山门图兜底；云库 cover_path 有值时由 loadCover 覆盖为签名地址
    coverUrl: '/assets/heroes/gate.jpg',
    enrolledCount: 0,
    deadlineText: '',
    enrolled: false
  },

  onLoad() {
    this.load()
  },

  onShow() {
    if (!this.data.loading) this.syncEnrolledState()
    if (!this.data.loading && this.data.activity && this.data.activity.id) {
      this.refreshCount()
    }
  },

  async onPullDownRefresh() {
    await this.load()
    wx.stopPullDownRefresh()
  },

  async load() {
    this.setData({ loading: true, failed: false })
    try {
      const activity = await activityApi.fetchActivity()
      if (!activity) {
        this.setData({ loading: false, failed: true })
        return
      }
      this.setData({
        loading: false,
        activity: activity,
        schedule: activity.schedule || [],
        tracks: activity.tracks || [],
        notices: activity.notices || [],
        badgeText: activity.badge || '',
        deadlineText: format.formatDeadline(activity.deadline_at)
      })
      this.loadCover(activity.cover_path)
      this.refreshCount()
      this.syncEnrolledState()
    } catch (error) {
      console.info('[detail] load failed', error && error.message ? error.message : '')
      this.setData({ loading: false, failed: true })
    }
  },

  async refreshCount() {
    const activity = this.data.activity
    if (!activity || !activity.id) return
    const count = await activityApi.fetchEnrolledCount(activity.id)
    this.setData({ enrolledCount: count })
  },

  async loadCover(objectPath) {
    if (!objectPath) return
    const url = await media.signedUrl(objectPath, 900)
    if (url) this.setData({ coverUrl: url })
  },

  async syncEnrolledState() {
    const activity = this.data.activity
    if (!activity || !activity.id) return
    if (!auth.getSession()) {
      this.setData({ enrolled: false })
      return
    }
    try {
      const rows = await enrollmentApi.listMine()
      const hit = rows.filter((row) => Number(row.activity_id) === Number(activity.id))[0]
      this.setData({ enrolled: !!hit && hit.status !== 'canceled' })
    } catch (error) {
      this.setData({ enrolled: false })
    }
  },

  goEnroll() {
    wx.switchTab({ url: '/pages/enroll/enroll' })
  },

  goRecords() {
    wx.switchTab({ url: '/pages/records/records' })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
