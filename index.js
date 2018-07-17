var denodeify = require('es6-denodeify')(Promise)
var { CookieJar } = require('tough-cookie')

/**
 * @param {Response} response
 * @returns {boolean}
 */
function isRedirect (response) {
  return response.status >= 300 && response.status < 400
}

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

    // Custom redirects
    opts.redirect = "manual"
    opts.counter = opts.counter || 0;
    opts.follow = opts.follow || 20;

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

    // Store all present cookies
    await Promise.all(cookies.map((cookie) => setCookie(cookie, res.url)))

    // Follow a possible redirect
    if (isRedirect(res)) {
      const location = res.headers.get('location');
      
      // HTTP-redirect fetch step 2
      if (!location)
        return res;

      // HTTP-redirect fetch step 5
      if (opts.counter >= opts.follow)
        throw new Error(`maximum redirect reached at: ${opts.url}`)
      
      // HTTP-redirect fetch step 6 (counter increment)
      // Prepare a new Request object.
      const redirectOpts = Object.assign({}, opts);
      redirectOpts.counter++;

      // HTTP-redirect fetch step 9
      if (res.statusCode !== 303 && opts.body && getTotalBytes(opts) === null) {
        throw new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect');
      }

      // HTTP-redirect fetch step 11
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && opts.method === 'POST')) {
        redirectOpts.method = 'GET';
        redirectOpts.body = undefined;
        delete (redirectOpts.headers['content-length']);
      }

      // HTTP-redirect fetch step 15
      return fetchCookie(location, redirectOpts);
    }

    return res
  }

  return fetchCookie
}
