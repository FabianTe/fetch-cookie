/* eslint-env mocha */

const { equal } = require('assert')
const nodeFetch = require('node-fetch')
const fetch = require('../')(nodeFetch)
const { CookieJar } = require('tough-cookie')
const app = require('./test-server');

describe('fetch-cookie', () => {
  let server;

  before('start test server', async () => {
    return new Promise((resolve, reject) => {
      server = app.listen(9999, (err) => {
        if (err)
          reject(err);
        else
          resolve();
      })
    })
  })

  it.only('should store single cookie', async () => {
    // const jar = new CookieJar();
    // const fetch = require('../')(nodeFetch, jar);
    // const cookie = { name: 'foo', value: 'bar' };
    // const create = await fetch(`http://localhost:9999/set-single?name=${cookie.name}&value=${cookie.value}`);
    // const res = await fetch('http://localhost:9999/get');
    // equal(await res.text(), `${cookie.name}=${cookie.value}`);

    await fetch('http://localhost:9999/set');
    const res = await fetch('http://localhost:9999/get');
    equal(await res.text(), 'foo=bar');
  })

  it('should handle cookies jars', async () => {
    const cookieJar1 = {};
    const cookieJar2 = {};
    await fetch('http://localhost:9999/set', cookieJar1);
    const res1 = await fetch('http://localhost:9999/get', cookieJar1);

    await fetch('http://localhost:9999/set2', cookieJar2);
    const res2 = await fetch('http://localhost:9999/get', cookieJar2);

    equal(await res1.text(), 'foo=bar');
    equal(cookieJar1.headers.cookie, 'foo=bar');

    equal(await res2.text(), 'foo=bar2');
    equal(cookieJar2.headers.cookie, 'foo=bar2');
  })

  it.skip('should handle redirect cookies', async () => {
    // TODO: Implement
  })

  it('should be able to use Headers instance', async () => {
    const headers = new nodeFetch.Headers();
    const res = await fetch('http://localhost:9999/get', { headers });
  })

  it('should be able to handle multiple set-cookie headers', async () => {
    const headers = new nodeFetch.Headers();
    const res = await fetch('http://localhost:9999/set-multiple', { headers });
  })

  after('stop test server', () => {
    if (server)
      server.close();
  })
})
