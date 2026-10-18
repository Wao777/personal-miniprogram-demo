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

const EMPTY_FORM = {
  applicant_name: '',
  phone: '',
  gender: '',
  age: '',
  region: '',
  track: '',
  self_intro: ''
}

Page({
  data: {
    loggedIn: false,
    loggingIn: false,
    submitting: false,
    activity: {},
    tracks: [],
    genders: ['男', '女'],
    form: Object.assign({}, EMPTY_FORM),
    errors: {},
    photo: {
      path: '',
      preview: '',
      tip: '可选，一张清晰正面照，5MB 以内',
      uploading: false
    },
    existing: null,
    leftCount: 0,
    deadlineText: ''
  },

  onLoad() {
    this.load()
  },

  onShow() {
    const loggedIn = !!auth.getSession()
    if (loggedIn !== this.data.loggedIn) {
      this.setData({ loggedIn: loggedIn })
    }
    if (this.data.activity && this.data.activity.id) {
      this.refreshStats()
      if (loggedIn) {
        this.refreshExisting()
      } else {
        this.setData({ existing: null })
      }
    }
  },

  async load() {
    try {
      const activity = await activityApi.fetchActivity()
      if (!activity) return
      this.setData({
        activity: activity,
        tracks: activity.tracks || [],
        deadlineText: format.formatDeadline(activity.deadline_at)
      })
      this.refreshStats()
      if (auth.getSession()) this.refreshExisting()
    } catch (error) {
      wx.showToast({ title: '活动信息加载失败', icon: 'none' })
    }
  },

  async refreshStats() {
    const activity = this.data.activity
    if (!activity || !activity.id) return
    const enrolled = await activityApi.fetchEnrolledCount(activity.id)
    const quota = Number(activity.quota) || 0
    this.setData({ leftCount: Math.max(quota - enrolled, 0) })
  },

  async refreshExisting() {
    const activity = this.data.activity
    if (!activity || !activity.id) return
    try {
      const rows = await enrollmentApi.listMine()
      const hit = rows.filter((row) => Number(row.activity_id) === Number(activity.id))[0]
      if (!hit) {
        this.setData({ existing: null })
        return
      }
      this.setData({
        existing: {
          id: hit.id,
          applicant_name: hit.applicant_name,
          track: hit.track || '未选择',
          region: hit.region || '未填写',
          createdText: format.formatDateTime(hit.created_at),
          statusText: STATUS_TEXT[hit.status] || '待审核'
        }
      })
    } catch (error) {
      this.setData({ existing: null })
    }
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key
    if (!key) return
    const patch = {}
    patch['form.' + key] = event.detail.value
    patch['errors.' + key] = ''
    this.setData(patch)
  },

  onPickGender(event) {
    this.setData({ 'form.gender': event.currentTarget.dataset.value })
  },

  onPickTrack(event) {
    this.setData({ 'form.track': event.currentTarget.dataset.value, 'errors.track': '' })
  },

  async onLogin() {
    if (this.data.loggingIn) return
    this.setData({ loggingIn: true })
    try {
      await auth.login()
      this.setData({ loggedIn: true, loggingIn: false })
      this.refreshStats()
      this.refreshExisting()
    } catch (error) {
      this.setData({ loggingIn: false })
      wx.showToast({ title: error.message || '登录失败', icon: 'none' })
    }
  },

  async onPickPhoto() {
    const session = auth.getSession()
    if (!session || !session.user) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (this.data.photo.uploading) return
    let file = null
    try {
      file = await media.choosePhoto()
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
      return
    }
    if (file.size && file.size > 5 * 1024 * 1024) {
      wx.showToast({ title: '图片超过 5MB，请换一张', icon: 'none' })
      return
    }
    this.setData({
      'photo.preview': file.tempFilePath,
      'photo.uploading': true,
      'photo.tip': '正在上传…'
    })
    try {
      const objectPath = await media.uploadPhoto(session.user.id, file.tempFilePath)
      this.setData({
        'photo.path': objectPath,
        'photo.uploading': false,
        'photo.tip': '已存入云端，点击可更换'
      })
    } catch (error) {
      this.setData({
        'photo.preview': '',
        'photo.uploading': false,
        'photo.tip': '上传失败，可稍后重试或跳过'
      })
      wx.showToast({ title: error.message || '上传失败', icon: 'none' })
    }
  },

  async onRemovePhoto() {
    const objectPath = this.data.photo.path
    this.setData({
      'photo.path': '',
      'photo.preview': '',
      'photo.uploading': false,
      'photo.tip': '可选，一张清晰正面照，5MB 以内'
    })
    await media.removeObject(objectPath)
  },

  validate() {
    const form = this.data.form
    const errors = {}
    const name = String(form.applicant_name || '').trim()
    const phone = String(form.phone || '').trim()
    const region = String(form.region || '').trim()
    const age = String(form.age || '').trim()

    if (name.length < 2 || name.length > 20) {
      errors.applicant_name = '请填写 2-20 字的真实姓名'
    }
    if (!/^1\d{10}$/.test(phone)) {
      errors.phone = '请输入正确的 11 位手机号'
    }
    if (!region) {
      errors.region = '请填写所在城市'
    }
    if (!form.track) {
      errors.track = '请选择一门意向课业'
    }
    if (age) {
      const value = Number(age)
      if (!(value >= 16 && value <= 99)) {
        errors.age = '年龄需在 16 至 99 岁之间'
      }
    }
    this.setData({ errors: errors })
    return Object.keys(errors).length === 0
  },

  async onSubmit() {
    if (this.data.submitting) return
    const session = auth.getSession()
    if (!session || !session.user) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (format.daysUntil(this.data.activity.deadline_at) === 0) {
      wx.showToast({ title: '本期报名已截止', icon: 'none' })
      return
    }
    if (this.data.leftCount <= 0) {
      wx.showToast({ title: '本期名额已满', icon: 'none' })
      return
    }
    if (this.data.photo.uploading) {
      wx.showToast({ title: '形象照还在上传，请稍候', icon: 'none' })
      return
    }
    if (!this.validate()) {
      wx.showToast({ title: '请检查标红的资料', icon: 'none' })
      return
    }

    const form = this.data.form
    const payload = {
      activity_id: this.data.activity.id,
      owner_name: session.user.name || null,
      applicant_name: String(form.applicant_name).trim(),
      phone: String(form.phone).trim(),
      gender: form.gender || null,
      age: form.age === '' ? null : Number(form.age),
      region: String(form.region).trim(),
      track: form.track,
      self_intro: String(form.self_intro || '').trim() || null,
      photo_path: this.data.photo.path || null
    }

    this.setData({ submitting: true })
    try {
      await enrollmentApi.create(payload)
      this.setData({ submitting: false })
      wx.showToast({ title: '报名已提交', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/records/records' })
      }, 700)
    } catch (error) {
      this.setData({ submitting: false })
      if (error.code === '23505') {
        wx.showToast({ title: '你已提交过本期报名', icon: 'none' })
        this.refreshExisting()
        return
      }
      wx.showToast({ title: error.message || '提交失败，请重试', icon: 'none' })
    }
  },

  goRecords() {
    wx.switchTab({ url: '/pages/records/records' })
  }
})
