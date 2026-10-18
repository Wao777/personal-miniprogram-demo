/**
 * 云端环境公开配置模板
 *
 * 用法：复制本文件为同目录下的 cloud.js，并填入自己云环境的三个值。
 *   resourceId      —— 云服务开通后给出的资源 id（wbcs_ 开头）
 *   endpoint        —— 云服务 API 地址
 *   publishableKey  —— 客户端公开 key（wbpk_ 开头），可内置到前端
 *
 * cloud.js 已在 .gitignore 中，不会被提交到仓库。
 */
const publicConfig = {
  resourceId: 'wbcs_xxxxxxxxxxxxxxxxxxxxxxxx',
  endpoint: 'https://your-cloud-endpoint.example.com',
  publishableKey: 'wbpk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
}

module.exports = { publicConfig }
