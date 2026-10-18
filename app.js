const auth = require('./utils/auth')

App({
  globalData: {
    session: null
  },

  onLaunch() {
    // 首屏静默登录：wx.login 不弹授权框，失败也不阻塞浏览
    auth.silentLogin().catch((error) => {
      console.info('[app] silent login skipped',
        JSON.stringify({ message: error && error.message ? error.message : 'unknown' }))
    })
  }
})
