var denodeify = require('es6-denodeify')(Promise)
var tough = require('tough-cookie')
var cookieParser = require('set-cookie-parser');

module.exports = function fetchCookieDecorator (fetch, jar) {
  fetch = fetch || window.fetch
  jar = jar || new tough.CookieJar()

  var getCookieString = denodeify(jar.getCookieString.bind(jar))
  var setCookie = denodeify(jar.setCookie.bind(jar))

  return function fetchCookie (url, opts) {
    opts = opts || {}

    return getCookieString(url)
      .then(function (cookie) {
        // Not copying 
        var headers = opts.headers || new fetch.Headers();

        if (headers instanceof fetch.Headers) {
          // Headers instance
          headers.set('cookie', cookie);
        } else {
          // header object ie: { "content-type": "..." }
          headers['cookie'] = cookie;
        }
        
        return fetch(url, Object.assign(opts, {
          headers: headers
        }))
      })
      .then(function (res) {
        var cookies;

        if (res.headers.getAll) {
          // node-fetch v1 - deprecated!
          // TODO: Add test - this might not work anymore.
          cookies = res.headers.getAll('set-cookie');
        } else if (res.headers.get) {
          // node-fetch v2
          var headerStr = res.headers.get('set-cookie')
          cookies = cookieParser.parse(headerStr);
        } else {
          // object ie: { "content-type": "..." }
          var headerStr = res.headers['set-cookie'];
          cookies = cookieParser.parse(headerStr);
        }

        if (!cookies.length) {
          return res;
        }

        cookies = cookies.map(c => new tough.Cookie(c));

        return Promise.all(cookies.map(function (cookie) {
          return setCookie(cookie, res.url)
        })).then(function () {
          return res
        })
      })
  }
}
