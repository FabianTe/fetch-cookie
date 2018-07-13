/* eslint-env mocha */

const { assert } = require('chai')
const nodeFetch = require('node-fetch')
var { CookieJar, Cookie } = require('tough-cookie')
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

  it('should handle cookies (using internal cookie jar)', async () => {
    await fetch('http://localhost:9999/set?name=foo&value=bar')
    const res = await fetch('http://localhost:9999/get')
    assert.deepEqual(await res.json(), ['foo=bar'])
  })

  // This test esentially tests if to clients with different jars are completely separated and don't share state
  it('should handle cookies (using custom cookie jar)', async () => {
    // Client 1
    const jar1 = new CookieJar()
    const fetch1 = require('../index')(nodeFetch, jar1)
    await fetch1('http://localhost:9999/set?name=foo&value=bar')
    const cookies1 = jar1.store.idx.localhost['/']
    assert.property(cookies1, 'foo')
    /** @type {Cookie} */
    const cookie1 = cookies1.foo
    assert.instanceOf(cookie1, Cookie)
    assert.propertyVal(cookie1, 'value', 'bar')

    // Client 2
    const jar2 = new CookieJar()
    const fetch2 = require('../index')(nodeFetch, jar2)
    await fetch2('http://localhost:9999/set?name=tuna&value=can')
    const cookies2 = jar2.store.idx.localhost['/']
    assert.property(cookies2, 'tuna')
    /** @type {Cookie} */
    const cookie2 = cookies2.tuna
    assert.instanceOf(cookie2, Cookie)
    assert.propertyVal(cookie2, 'value', 'can')

    // Compare the two clients (jars)
    assert.notEqual(cookie1, cookie2);
    assert.notStrictEqual(cookie1.key, cookie2.key);
    assert.notProperty(cookies1, cookie2);
    assert.notProperty(cookies2, cookie1);
  })

  it.skip('should handle cookies jars (DEPRECATED)', async () => {
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

  after('stop test server', () => {
    if (server) { server.close() }
  })
})
