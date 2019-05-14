var http = require('http')
var createHandler = require('github-webhook-handler')
var handler = createHandler({ path: '/webhook', secret: (process.env.SECRET)})

var userArray = ["user1"]
var team = "robots"
var description = "Team of Robots"
var team_privacy = "closed" // closed (visibile) / secret (hidden) are options here
var team_access = "pull" // pull,push,admin options here

var impersonationToken = ""
var org = ""
var creator = ""

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

handler.on('organization', function (event) {
  if(event.payload.action == "created") {
    org = event.payload.organization.login
    creator = event.payload.sender.login
    getImpersonation(creator)
  }
})

handler.on('repository', function (event) {
  if(event.payload.action == "created") {
    repo = event.payload.full_name
    creator = event.payload.sender.login
    console.log("Repo created %s", repo)
    //getImpersonation(creator)
  }
})

function getImpersonation(creator)
{

const https = require('https')
const data = JSON.stringify({
  scopes: ["admin:org"]
})

const options = {
  hostname: (process.env.GHE_HOST),
  port: 443,
  path: '/api/v3/admin/users/' + creator + "/authorizations",
  method: 'POST',
  headers: {
    'Authorization': 'token ' + (process.env.GHE_TOKEN),
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}
let body = [];
const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`)
  res.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
  // at this point, `body` has the entire request body stored in it as a string
      impersonationToken = JSON.parse(body).token
        adminLoop()
    })

})

req.on('error', (error) => {
  console.error(error)
})

 req.write(data)
req.end()

}

function adminLoop()
{
  adminArray.forEach(function(adminUser){
      addAdminsToNewOrg(impersonationToken, org, adminUser)
})

}


function addAdminsToNewOrg(impersonationToken, org, adminUser)
{
  console.log(org, adminUser)

  const https = require('https')
  const data = JSON.stringify({
    role: "admin"
  })

  const options = {
    hostname: (process.env.GHE_HOST),
    port: 443,
    path: '/api/v3/orgs/' + org + "/memberships/"  + adminUser,
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + impersonationToken,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }
  let body = [];
  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`)

  })

  req.on('error', (error) => {
    console.error(error)
  })

   req.write(data)
  req.end()

}
