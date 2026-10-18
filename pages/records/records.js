const activityApi = require('../../api/activity')
const enrollmentApi = require('../../api/enrollment')
const auth = require('../../utils/auth')
const media = require('../../utils/media')
const format = require('../../utils/format')

const STATUS_TEXT = {
  pending: '待审核',
  approved: '已通过',
  rejected: '未通过',
  canceled: '已取消'
}

Page({
  data: {
    loggedIn: false,
    loading: true,
    displayName: '山门客',
    avatarUrl: '',
    initial: '道',
    activityTitle: '青城山修仙大学',
    records: []
  },

  onLoad() {
    this.unsubscribe = auth.subscribe(() => {
      this.syncProfile()
      this.loadRecords()
    })
    this.loadActivityTitle()
  },

  onShow() {
    this.syncProfile()
    this.loadRecords()
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe()
  },

  async onPullDownRefresh() {
    this.syncProfile()
    await this.loadRecords()
    wx.stopPullDownRefresh()
  },

  syncProfile() {
    const session = auth.getSession()
    const user = (session && session.user) || null
    this.setData({
      loggedIn: !!user,
      displayName: (user && user.name) || (user ? '微信用户' : '山门客'),
      avatarUrl: (user && user.avatarUrl) || '',
      initial: format.initialOf((user && user.name) || '道')
    })
  },

  async loadActivityTitle() {
    try {
      const activity = await activityApi.fetchActivity()
      if (activity && activity.title) {
        this.setData({ activityTitle: activity.title })
      }
    } catch (error) {
      // 标题取不到时保留默认文案
    }
  },

  async loadRecords() {
    if (!auth.getSession()) {
      this.setData({ loading: false, records: [] })
      return
    }
    this.setData({ loading: true })
    try {
      const rows = await enrollmentApi.listMine()
      const records = rows.map((row) => ({
        id: row.id,
        applicant_name: row.applicant_name,
        status: row.status || 'pending',
        statusText: STATUS_TEXT[row.status] || '待审核',
        track: row.track || '未选择课业',
        region: row.region || '未填写所在地',
        gender: row.gender || '',
        ageText: row.age ? row.age + ' 岁' : '',
        phoneText: format.maskPhone(row.phone),
        self_intro: row.self_intro || '',
        createdText: format.formatDateTime(row.created_at),
        canCancel: row.status !== 'canceled',
        photo_path: row.photo_path || '',
        photoUrl: ''
      }))
      this.setData({ loading: false, records: records })
      this.attachPhotos(records)
    } catch (error) {
      this.setData({ loading: false, records: [] })
      wx.showToast({ title: error.message || '记录加载失败', icon: 'none' })
    }
  },

  /** 形象照存在云存储，展示前换成短期签名地址 */
  async attachPhotos(records) {
    const targets = records.filter((item) => item.photo_path)
    if (!targets.length) return
    const urls = await Promise.all(targets.map((item) => media.signedUrl(item.photo_path, 1800)))
    const patch = {}
    targets.forEach((item, index) => {
      if (urls[index]) patch['records[' + records.indexOf(item) + '].photoUrl'] = urls[index]
    })
    if (Object.keys(patch).length) this.setData(patch)
  },

  async onLogin() {
    try {
      await auth.login()
      this.syncProfile()
      this.loadRecords()
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' })
    }
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需重新授权才能查看报名记录。',
      confirmColor: '#1F4B43',
      success: async (result) => {
        if (!result.confirm) return
        await auth.logout()
        this.syncProfile()
        this.setData({ records: [] })
      }
    })
  },

  onCancel(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '取消报名',
      content: '取消后名额将释放，如需再次参加需重新提交资料。',
      confirmText: '取消报名',
      confirmColor: '#A5503F',
      success: async (result) => {
        if (!result.confirm) return
        try {
          await enrollmentApi.cancel(id)
          wx.showToast({ title: '已取消报名', icon: 'none' })
          this.loadRecords()
        } catch (error) {
          wx.showToast({ title: error.message || '取消失败', icon: 'none' })
        }
      }
    })
  },

  onEmptyAction() {
    if (this.data.loggedIn) {
      wx.switchTab({ url: '/pages/enroll/enroll' })
      return
    }
    this.onLogin()
  },

  goEnroll() {
    wx.switchTab({ url: '/pages/enroll/enroll' })
  }
})
