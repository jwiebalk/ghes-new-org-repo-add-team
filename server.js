const http = require('http')
const createHandler = require('github-webhook-handler')
require('dotenv').config()
const handler = createHandler({ path: '/webhook', secret: (process.env.WEBHOOK_SECRET) })

require('log-timestamp')
const program = '-- ghes-new-repo-add-team --'

const teamName = process.env.GHES_TEAM_NAME
let repo = ''

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
    repo = event.payload.repository.name
    const org = event.payload.repository.owner.login
    getTeamId(org)
  }
})

async function getTeamId (org) {
  try {
    await octokitAdmin.teams.getByName({
      team_slug: teamName,
      org: org
    }).then(({ data, status }) => {
      if (status === 200) {
        addTeamToRepo(org, data.id)
      } else {
        console.log(`${program} Failed to find ${teamName}`)
      }
    })
  } catch (error) {
    if (error.status === 404) {
      console.log(error)
    }
  }
}

async function addTeamToRepo (org, teamId) {
  try {
    await octokitAdmin.teams.addOrUpdateRepoPermissions({
      team_id: teamId,
      owner: org,
      repo: repo
    }).then(({ data, status }) => {
      if (status === 204) {
        console.log(`${program} Successfully added ${teamName} to ${repo}`)
      } else {
        console.log(`${program} Failed to add ${teamName} to ${repo}`)
      }
    })
  } catch (error) {
    console.log(error)
    if (error.status === 404) {
      console.log(error)
    }
  }
}
