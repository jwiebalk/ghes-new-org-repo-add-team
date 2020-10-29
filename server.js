const http = require('http')
const createHandler = require('github-webhook-handler')
const handler = createHandler({ path: '/webhook', secret: (process.env.WEBHOOK_SECRET) })

require('dotenv').config()
require('log-timestamp')
const program = '-- ghes-new-repo-add-team --'

const teamName = process.env.GHES_TEAM_NAME
const teamAccess = process.env.GHES_TEAM_PERMISSION // pull,push,admin options here

const { Octokit } = require('@octokit/rest')
const { enterpriseServer220 } = require('@octokit/plugin-enterprise-server')

const { retry } = require('@octokit/plugin-retry')
const { throttling } = require('@octokit/plugin-throttling')

const OctokitEnterprise220 = Octokit.plugin(enterpriseServer220, retry, throttling)
const octokitAdmin = new OctokitEnterprise220({
  auth: process.env.GHES_TOKEN,
  baseUrl: `https://${process.env.GHES_HOST}/api/v3`,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      octokitAdmin.log.warn(
        `[${new Date().toISOString()}] ${program} Request quota exhausted for request, will retry in ${retryAfter}`
      )
      return true
    },
    onAbuseLimit: (retryAfter, options) => {
      octokitAdmin.log.warn(
        `[${new Date().toISOString()}] ${program} Abuse detected for request, will retry in ${retryAfter}`
      )
      return true
    }
  }
})

http.createServer(function (req, res) {
  handler(req, res, function (err) {
    console.log(err)
    res.statusCode = 404
    res.end('no such location')
  })
}).listen(3000)

handler.on('error', function (err) {
  console.error('Error:', err.message)
})

handler.on('repository', function (event) {
  if (event.payload.action === 'created') {
    const repo = event.payload.repository.full_name
    console.log(repo)
    const org = event.payload.repository.owner.login
    console.log(org)

    // octokitAdmin.teams.addOrUpdateRepoPermissionsInOrg({
    //   org,
    //   team_slug: teamName,
    //   owner,
    //   repo
    // })
  }
})
