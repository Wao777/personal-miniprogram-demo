const activityApi = require('../../api/activity')
const auth = require('../../utils/auth')
const media = require('../../utils/media')
const format = require('../../utils/format')

Page({
  data: {
    loading: true,
    failed: false,
    activity: {},
    highlights: [],
    tracks: [],
    // 默认用包内山门图兜底；云库 cover_path 有值时由 loadCover 覆盖为签名地址
    coverUrl: '/assets/heroes/gate.jpg',
    badgeText: '',
    steps: ['微信授权登录', '填写报名资料', '提交资料待审核', '收到入山通知'],
    stats: { enrolled: 0, left: 0, daysLeft: 0 },
    loggedIn: false
  },

  onLoad() {
    this.unsubscribe = auth.subscribe((session) => {
      const loggedIn = !!session
      if (loggedIn !== this.data.loggedIn) {
        this.setData({ loggedIn: loggedIn })
      }
    })
    this.load()
  },

  onShow() {
    const session = auth.getSession()
    const loggedIn = !!session
    if (loggedIn !== this.data.loggedIn) {
      this.setData({ loggedIn: loggedIn })
    }
    if (!this.data.loading && this.data.activity && this.data.activity.id) {
      this.refreshCount()
    }
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe()
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
      const quota = Number(activity.quota) || 0
      this.setData({
        loading: false,
        activity: activity,
        highlights: activity.highlights || [],
        tracks: activity.tracks || [],
        badgeText: activity.badge || '',
        stats: {
          enrolled: 0,
          left: quota,
          daysLeft: format.daysUntil(activity.deadline_at)
        }
      })
      this.loadCover(activity.cover_path)
      this.refreshCount()
    } catch (error) {
      console.info('[index] load failed', error && error.message ? error.message : '')
      this.setData({ loading: false, failed: true })
    }
  },

  async refreshCount() {
    const activity = this.data.activity
    if (!activity || !activity.id) return
    const enrolled = await activityApi.fetchEnrolledCount(activity.id)
    const quota = Number(activity.quota) || 0
    this.setData({
      'stats.enrolled': enrolled,
      'stats.left': Math.max(quota - enrolled, 0),
      'stats.daysLeft': format.daysUntil(activity.deadline_at)
    })
  },

  async loadCover(objectPath) {
    if (!objectPath) return
    const url = await media.signedUrl(objectPath, 900)
    if (url) this.setData({ coverUrl: url })
  },

  goDetail() {
    wx.navigateTo({ url: '/pages/detail/detail' })
  },

  goEnroll() {
    wx.switchTab({ url: '/pages/enroll/enroll' })
  }
})
