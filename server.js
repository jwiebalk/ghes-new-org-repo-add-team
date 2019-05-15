var http = require('http')
var createHandler = require('github-webhook-handler')
var handler = createHandler({ path: '/webhook', secret: (process.env.SECRET)})

// these should go into the other app to create the team when org created
// var userArray = ["user1"]
// var team = "robots"
// var description = "Team of Robots"
// var team_privacy = "closed" // closed (visibile) / secret (hidden) are options here

var team_name = process.env.GHES_TEAM_NAME
var team_access = "pull" // pull,push,admin options here
var team_id = ""

// var creator = ""

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

  if(event.payload.action == "created") {
    repo = event.payload.repository.full_name
    org = event.payload.repository.owner.login
    getTeamID(org)
  }
})

function getTeamID(org)
{

const https = require('https')

const options = {
  hostname: (process.env.GHE_HOST),
  port: 443,
  path: '/api/v3/orgs/' + org + "/teams",
  method: 'GET',
  headers: {
    'Authorization': 'token ' + (process.env.GHE_TOKEN),
    'Content-Type': 'application/json'
  }
}
let body = [];
const req = https.request(options, (res) => {
  res.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = JSON.parse(Buffer.concat(body))
        body.forEach(item => {
          if (item.name == team_name) {
            team_id = item.id
            addTeamToRepo(repo, team_id)
          }

       })
    })

})

req.on('error', (error) => {
  console.error(error)
})

req.end()

}

function addTeamToRepo(repo, team_id)
{

const https = require('https')
const data = JSON.stringify({
  permission: team_access
})

const options = {
  hostname: (process.env.GHE_HOST),
  port: 443,
  path: '/api/v3/teams/'+ team_id + '/repos/' + repo,
  method: 'PUT',
  headers: {
    'Authorization': 'token ' + (process.env.GHE_TOKEN),
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}
let body = [];
const req = https.request(options, (res) => {
  res.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
console.log("added team to " + repo)
    })

})

req.on('error', (error) => {
  console.error(error)
})

 req.write(data)
req.end()

}
