const { getCloud } = require('./cloud')

let session = null
let pendingLogin = null
const listeners = []

function getSession() {
  return session
}

function setSession(next) {
  session = next || null
  listeners.slice().forEach((fn) => {
    try {
      fn(session)
    } catch (error) {
      console.info('[auth] listener error', error && error.message ? error.message : '')
    }
  })
}

function subscribe(fn) {
  if (typeof fn !== 'function') return function noop() {}
  listeners.push(fn)
  return function unsubscribe() {
    const index = listeners.indexOf(fn)
    if (index > -1) listeners.splice(index, 1)
  }
}

/** 恢复已有会话；没有会话时返回 null，不抛错 */
async function restore() {
  try {
    const { data, error } = await getCloud().auth.getSession()
    if (error || !data) {
      setSession(null)
      return null
    }
    setSession(data)
    return data
  } catch (error) {
    setSession(null)
    return null
  }
}

/** 微信授权登录：wx.login 取 code，交由云端换取会话 */
function login() {
  if (pendingLogin) return pendingLogin

  pendingLogin = new Promise((resolve, reject) => {
    wx.login({
      success(success) {
        const code = success && success.code
        if (!code) {
          reject(new Error('微信登录未返回授权码，请重试'))
          return
        }
        const appid = wx.getAccountInfoSync().miniProgram.appId
        getCloud()
          .auth.signInWithWechat(code, appid)
          .then(({ data, error }) => {
            if (error || !data) {
              reject(new Error((error && error.message) || '微信登录失败，请重试'))
              return
            }
            setSession(data)
            resolve(data)
          })
          .catch((error) => {
            console.info('[auth] login failed', JSON.stringify({
              stage: 'wechat-login-handler',
              message: error && error.message ? error.message : '微信登录失败'
            }))
            reject(new Error('微信登录失败，请重试'))
          })
      },
      fail(error) {
        console.info('[auth] login failed', JSON.stringify({
          stage: 'wx.login',
          message: error && error.errMsg ? error.errMsg : 'wx.login fail'
        }))
        reject(new Error('已取消微信登录'))
      }
    })
  }).then(
    (result) => {
      pendingLogin = null
      return result
    },
    (error) => {
      pendingLogin = null
      throw error
    }
  )

  return pendingLogin
}

/** 启动时静默登录：已有会话直接复用，否则尝试一次微信登录 */
async function silentLogin() {
  const existing = await restore()
  if (existing) return existing
  return login()
}

async function logout() {
  try {
    await getCloud().auth.signOut()
  } catch (error) {
    // 退出登录失败不阻塞界面，仍然清空本地会话
  }
  setSession(null)
}

module.exports = {
  getSession,
  subscribe,
  restore,
  login,
  silentLogin,
  logout
}
