var denodeify = require('es6-denodeify')(Promise)
var { CookieJar } = require('tough-cookie')

/**
 * @param {*} fetch Fetch function which will be called to perform the HTTP request
 * @param {CookieJar} jar Custom tough-cookie CookieJar instance
 */
module.exports = function fetchCookieDecorator (fetch, jar) {
  fetch = fetch || window.fetch
  jar = jar || new CookieJar()

  /** @type {(currentUrl: string, options?: CookieJar.GetCookiesOptions) => Promise<Cookie>} */
  var getCookieString = denodeify(jar.getCookieString.bind(jar))
  /** @type {(cookieOrString: Cookie | string, currentUrl: string, options?: CookieJar.SetCookieOptions) => Promise<Cookie>} */
  var setCookie = denodeify(jar.setCookie.bind(jar))

  /**
   * @param {string|Request} url URL string or a [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) instance
   * @param {object} [opts] Optional options
   * @returns {Promise<Response>}
   */
  async function fetchCookie (url, opts) {
    // FIXME: Issue #9
    // Prepare request
    if (typeof url === 'object') {
      opts = url
      url = opts.url
    } else { opts = opts || {} }
    const cookie = await getCookieString(url)
    const headers = Object.assign(opts.headers || {}, (cookie ? { cookie: cookie } : {}))
    opts = Object.assign(opts, {
      headers: headers
    })

    // Actual request
    const res = await fetch(url, opts)

    // Get cookie header
    var cookies = []
    if (res.headers.getAll) {
      // node-fetch v1
      cookies = res.headers.getAll('set-cookie')
      console.warn("You are using a fetch version that supports 'Headers.getAll' which is deprecated!")
      console.warn("In the future 'fetch-cookie-v2' may discontinue supporting that fetch implementation.")
      console.warn('Details: https://developer.mozilla.org/en-US/docs/Web/API/Headers/getAll')
    } else {
      // node-fetch v2
      const headers = res.headers.raw()
      if (headers['set-cookie'] !== undefined) {
        cookies = headers['set-cookie']
      }
    }

    // Do nothing if no cookies present
    if (!cookies.length) {
      return res
    }

    // Store all present cookies
    await Promise.all(cookies.map((cookie) => {
      return setCookie(cookie, res.url)
    }))

    return res
  }

  return fetchCookie
}
