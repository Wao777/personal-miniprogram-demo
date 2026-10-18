const { getCloud } = require('./cloud')

/** 取第一张图片的访问地址（云存储签名地址，10 分钟有效） */
async function signedUrl(objectPath, ttl) {
  if (!objectPath) return ''
  try {
    const { data, error } = await getCloud().storage.createSignedUrl(objectPath, ttl || 600)
    if (error || !data) return ''
    if (typeof data === 'string') return data
    return data.signedUrl || data.signedURL || data.url || ''
  } catch (error) {
    return ''
  }
}

/** 选择一张图片（相册 / 拍摄） */
function choosePhoto() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(result) {
        const file = result.tempFiles && result.tempFiles[0]
        if (!file) {
          reject(new Error('未选择图片'))
          return
        }
        resolve(file)
      },
      fail(error) {
        const message = (error && error.errMsg) || ''
        reject(new Error(message.indexOf('cancel') > -1 ? '已取消选择' : '选择图片失败'))
      }
    })
  })
}

/** 读取本地临时文件并上传到云存储，返回对象路径 */
async function uploadPhoto(userId, tempFilePath) {
  if (!userId) throw new Error('请先登录')
  const buffer = wx.getFileSystemManager().readFileSync(tempFilePath)
  const matched = String(tempFilePath).match(/\.([a-zA-Z0-9]+)$/)
  const ext = matched ? matched[1].toLowerCase() : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'
  const objectPath = getCloud().storage.userPath(
    userId,
    'enrollments/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext
  )
  const { error } = await getCloud().storage.upload(objectPath, buffer, {
    contentType: contentType,
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw new Error(error.message || '图片上传失败')
  return objectPath
}

async function removeObject(objectPath) {
  if (!objectPath) return
  try {
    await getCloud().storage.remove([objectPath])
  } catch (error) {
    // 清理失败不影响主流程
  }
}

module.exports = { signedUrl, choosePhoto, uploadPhoto, removeObject }
