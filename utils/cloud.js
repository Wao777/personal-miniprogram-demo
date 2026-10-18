const { createMiniProgramWorkBuddyCloud } = require('@tencent-ai/workbuddy-cloud-sdk/miniprogram')
const { createDiagnosticWx } = require('./workbuddy-cloud-diagnostics')
const { publicConfig } = require('../config/cloud')

let client = null

function getCloud() {
  if (!client) {
    client = createMiniProgramWorkBuddyCloud({
      endpoint: publicConfig.endpoint,
      publishableKey: publicConfig.publishableKey,
      wx: createDiagnosticWx(wx)
    })
  }
  return client
}

module.exports = { getCloud }
