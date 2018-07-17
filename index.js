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
 * @param {CookieJar} [jar] Custom tough-cookie CookieJar instance
 * @param {boolean} [handleRedirect] Should redirect cookies also be stored? Defaults to `false`
 */
module.exports = function fetchCookieDecorator (fetch, jar, handleRedirect = false) {
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
    if (handleRedirect === true) {
      opts.redirect = 'manual'
      opts.counter = opts.counter || 0
      opts.follow = opts.follow || 20
    }

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
    if (isRedirect(res) && opts.redirect === 'manual') {
      const location = res.headers.get('location')

      // HTTP-redirect fetch step 2
      if (!location) { return res }

      // HTTP-redirect fetch step 5
      if (opts.counter >= opts.follow) { throw new Error(`maximum redirect reached at: ${opts.url}`) }

      // HTTP-redirect fetch step 6 (counter increment)
      // Prepare a new Request object.
      const redirectOpts = Object.assign({}, opts)
      redirectOpts.counter++

      // HTTP-redirect fetch step 9
      if (res.statusCode !== 303 && opts.body && getTotalBytes(opts) === null) {
        throw new Error('Cannot follow redirect with body being a readable stream', 'unsupported-redirect')
      }

      // HTTP-redirect fetch step 11
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && opts.method === 'POST')) {
        redirectOpts.method = 'GET'
        redirectOpts.body = undefined
        delete (redirectOpts.headers['content-length'])
      }

      // HTTP-redirect fetch step 15
      return fetchCookie(location, redirectOpts)
    }

    return res
  }

  return fetchCookie
}

/**
 * **This function was copied from https://github.com/bitinn/node-fetch/blob/master/src/body.js.**
 *
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param   Body    instance   Instance of Body
 * @return  Number?            Number of bytes, or null if not possible
 */
function getTotalBytes (instance) {
  const {body} = instance

  // istanbul ignore if: included for completion
  if (body === null) {
    // body is null
    return 0
  } else if (typeof body === 'string') {
    // body is string
    return Buffer.byteLength(body)
  } else if (isURLSearchParams(body)) {
    // body is URLSearchParams
    return Buffer.byteLength(String(body))
  } else if (body instanceof Blob) {
    // body is blob
    return body.size
  } else if (Buffer.isBuffer(body)) {
    // body is buffer
    return body.length
  } else if (body instanceof ArrayBuffer) {
    // body is ArrayBuffer
    return body.byteLength
  } else if (ArrayBuffer.isView(body)) {
    // body is ArrayBufferView
    return body.byteLength
  } else if (body && typeof body.getLengthSync === 'function') {
    // detect form data input from form-data module
    if (body._lengthRetrievers && body._lengthRetrievers.length == 0 || // 1.x
			body.hasKnownLength && body.hasKnownLength()) { // 2.x
      return body.getLengthSync()
    }
    return null
  } else {
    // body is stream
    // can't really do much about this
    return null
  }
}
