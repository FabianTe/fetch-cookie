const express = require('express')

const app = express()

// Responds with a 'set-cookie' header with a single cookie with only a name and value created by the URL params
app.get('/set', (req, res) => {
  const { name, value } = req.query
  res.set('set-cookie', `${name}=${value}`)
  res.end()
})

// Responds with two cookies. We want to cause a 'set-cookie' header with a comma in the cookie to be able to test
// correct parsing on the client side.
app.get('/set-multiple', (req, res) => {
  res.cookie('foo', 'bar', { expires: new Date() }) // The date will contain a comma. eg: Mon, 17-Jul-2017 16:06:00 GMT
  res.cookie('tuna', 'can')
  res.end()
})

app.get('/get', (req, res) => {
  res.end(req.headers.cookie)
})

app.get('/redirect', (req, res) => {
  res.redirect('http://localhost:9998/get') // FIXME: There is nothing at this port ...
})

module.exports = app
