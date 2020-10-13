var fs = require('fs');

// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 8080;

// Grab the blacklist from the command-line so that we can update the blacklist without deploying
// again. CORS Anywhere is open by design, and this blacklist is not used, except for countering
// immediate abuse (e.g. denial of service). If you want to block all origins except for some,
// use originWhitelist instead.
var originBlacklist = parseEnvBlackList(process.env.CORSANYWHERE_BLACKLIST);
var originWhitelist = parseEnvWhiteList(process.env.CORSANYWHERE_WHITELIST);

function parseEnvBlackList(env)
{
	if (!env)
	{
		return [];
	}

	return env.split(',');
}

function parseEnvWhiteList(env)
{
	if (!env)
	{
		return ["https://www.simonyu.net", "http://fa20-cs523-40.cs.illinois.edu:8000"];
	}

	return env.split(',');
}

// Set up rate-limiting to avoid abuse of the public CORS Anywhere server.
var checkRateLimit = require('./lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);

var cors_proxy = require('./lib/cors-anywhere');
cors_proxy.createServer({
	originBlacklist: originBlacklist,
	originWhitelist: originWhitelist,
	requireHeader: ['origin', 'x-requested-with'],
	checkRateLimit: checkRateLimit,
	removeHeaders: [
		'cookie',
		'cookie2',
		// Strip Heroku-specific headers
		'x-request-start',
		'x-request-id',
		'via',
		'connect-time',
		'total-route-time',
		// Other Heroku added debug headers
		// 'x-forwarded-for',
		// 'x-forwarded-proto',
		// 'x-forwarded-port',
	],
	redirectSameOrigin: true,
	httpsOptions: {
		key: fs.readFileSync('/etc/letsencrypt/live/www.simonyu.net/privkey.pem', 'utf8'),
		cert: fs.readFileSync('/etc/letsencrypt/live/www.simonyu.net/fullchain.pem', 'utf8')
	},
	httpProxyOptions: {
		// Do not add X-Forwarded-For, etc. headers, because Heroku already adds it.
		xfwd: false,
	},
}).listen(port, host, function() {
	console.log('Running CORS Anywhere on ' + host + ':' + port);
});
