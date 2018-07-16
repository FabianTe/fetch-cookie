var denodeify = require('es6-denodeify')(Promise)
var { CookieJar } = require('tough-cookie')

/**
 * @param {*} fetch Fetch function which will be called to perform the HTTP request
 * @param {CookieJar} jar Custom tough-cookie CookieJar instance
 */
module.exports = function fetchCookieDecorator (fetch, jar) {
  fetch = fetch || window.fetch
  jar = jar || new CookieJar()

  var getCookieString = denodeify(jar.getCookieString.bind(jar))
  var setCookie = denodeify(jar.setCookie.bind(jar))

  /**
   * @param {string|Request} url URL string or a [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) instance
   * @param {object} opts
   * @returns {Promise<Response>}
   */
  function fetchCookie (url, opts) {
    opts = opts || {}

    return getCookieString(url)
      .then(function (cookie) {
        return fetch(url, Object.assign(opts, {
          headers: Object.assign(opts.headers || {}, (cookie ? { cookie: cookie } : {}))
        }))
      })
      .then(function (res) {
        var cookies = []

        if (res.headers.getAll) {
          // node-fetch v1
          cookies = res.headers.getAll('set-cookie')
        } else {
          // node-fetch v2
          const headers = res.headers.raw()
          if (headers['set-cookie'] !== undefined) {
            cookies = headers['set-cookie']
          }
        }

        if (!cookies.length) {
          return res
        }

        return Promise.all(cookies.map(function (cookie) {
          return setCookie(cookie, res.url)
        })).then(function () {
          return res
        })
      })
  }

  return fetchCookie
}
