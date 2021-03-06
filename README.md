# fetch-cookie-v2 [![npm version](https://badge.fury.io/js/fetch-cookie-v2.svg)](https://badge.fury.io/js/fetch-cookie-v2) [![Build Status](https://travis-ci.org/Fabitee/fetch-cookie-v2.svg?branch=master)](https://travis-ci.org/Fabitee/fetch-cookie-v2) [![Known Vulnerabilities](https://snyk.io/test/github/Fabitee/fetch-cookie-v2/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Fabitee/fetch-cookie-v2?targetFile=package.json)
> This a fork of [valeriangalliat/fetch-cookie](https://github.com/valeriangalliat/fetch-cookie). It will be updated to work with current `node-fetch` and `tough-cookie` versions.

---

> Decorator for a `fetch` function to support automatic cookies.

Roadmap
-------

**Warning:** The way this package works is subject to change. While `fetch-cookie` is decorating a given `fetch` function, this package will be reworked to depend on `node-fetch` since most NodeJS projects working with a `fetch` function will propably already use `node-fetch`.

Description
-----------

This library is more suited to use with a Node.js `fetch` implementation
like [node-fetch], since the browser version is supposed to let a way
[to include cookies in requests][include].

[node-fetch]: https://www.npmjs.com/package/node-fetch
[include]: http://updates.html5rocks.com/2015/03/introduction-to-fetch#sending-credentials-with-a-fetch-request

Usage
-----

```js
var fetch = require('fetch-cookie')(require('node-fetch'))
```

If you want to customize the [tough-cookie][] [`CookieJar`][cookie-jar]
instance (for example, with a custom store), you can inject it as a
second argument.

[tough-cookie]: https://www.npmjs.com/package/tough-cookie
[cookie-jar]: https://github.com/SalesforceEng/tough-cookie#cookiejar

All calls to `fetch` will store and send back cookies according to the URL.

Cookies and redirection
-----------------------

By default, cookies are not set correctly in the edge case where a response
sets cookies and redirects to another URL. A real-life example of this behaviour
is a login page setting a session cookie and redirecting.

The reason for this limitation is that the generic fetch API does not allow any way to
hook into redirects. However, the [node-fetch] library does expose its own API which
we can use.

Long story short: if cookies during indirection turns out to be a requirement for you,
and if you are using [node-fetch], then you can use the custom node-fetch decorator
provided with this library:

```js
var fetch = require('fetch-cookie/node-fetch')(require('node-fetch'))
```
