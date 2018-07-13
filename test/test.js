/* eslint-env mocha */

const { assert } = require('chai')
const nodeFetch = require('node-fetch')
const fetch = require('../')(nodeFetch)
const app = require('./test-server')

describe('fetch-cookie', () => {
  let server

  before('start test server', async () => {
    return new Promise((resolve, reject) => {
      server = app.listen(9999, (err) => {
        if (err) { reject(err) } else { resolve() }
      })
    })
  })

  it('should handle cookies', async () => {
    await fetch('http://localhost:9999/set?name=foo&value=bar')
    const res = await fetch('http://localhost:9999/get')
    assert.deepEqual(await res.json(), ['foo=bar'])
  })

  it('should handle cookies jars', async () => {
    const cookieJar1 = {}
    const cookieJar2 = {}
    await fetch('http://localhost:9999/set?name=foo&value=bar', cookieJar1)
    const res1 = await fetch('http://localhost:9999/get', cookieJar1)

    await fetch('http://localhost:9999/set?name=foo&value=bar2', cookieJar2)
    const res2 = await fetch('http://localhost:9999/get', cookieJar2)

    assert.deepEqual(await res1.json(), ['foo=bar'])
    assert.equal(cookieJar1.headers.cookie, 'foo=bar')

    assert.deepEqual(await res2.json(), ['foo=bar2'])
    assert.equal(cookieJar2.headers.cookie, 'foo=bar2')
  })

  it.skip('should handle multiple cookies (including commata)', async () => {
    const cookieJar1 = {}
    await fetch('http://localhost:9999/set-multiple', cookieJar1)
    const res = await fetch('http://localhost:9999/get', cookieJar1)
  })

  after('stop test server', () => {
    if (server) { server.close() }
  })
})
