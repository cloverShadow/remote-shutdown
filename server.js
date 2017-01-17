(function () {
    'use strict';
    /*jshint node:true*/

    var express = require('express');
    var compression = require('compression');
    var url = require('url');
    var request = require('request');
    var bodyParser = require('body-parser');
    var exec = require('child_process').exec;
    var iconv = require('iconv-lite');

    var yargs = require('yargs').options({
        'port': {
            'default': 10040,
            'description': 'Port to listen on.'
        },
        'public': {
            'type': 'boolean',
            'description': 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy': {
            'description': 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:10040".'
        },
        'bypass-upstream-proxy-hosts': {
            'description': 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'help': {
            'alias': 'h',
            'type': 'boolean',
            'description': 'Show this help.'
        }
    });
    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    //控制文件类型连接头
    var mime = express.static.mime;
    mime.define({
        'application/json': ['czml', 'json', 'geojson', 'topojson'],
        'image/crn': ['crn'],
        'image/ktx': ['ktx'],
        'model/vnd.gltf+json': ['gltf'],
        'model/vnd.gltf.binary': ['glb'],
        'application/octet-stream': ['b3dm', 'pnts', 'i3dm', 'cmpt'],
        'text/plain': ['glsl']
    });

    var app = express();
    app.use(compression());
    app.use(express.static(__dirname));
    app.use(bodyParser.urlencoded({
        limit: '100mb',
        extended: false
    }));
    app.use(bodyParser.json({limit: '100mb'}));

    function getRemoteUrlFromParam(req) {
        var remoteUrl = req.params[0];
        if (remoteUrl) {
            //添加http://头到URL
            if (!/^https?:\/\//.test(remoteUrl)) {
                remoteUrl = 'http://' + remoteUrl;
            }
            remoteUrl = url.parse(remoteUrl);
            // 复制查询字符串
            remoteUrl.search = url.parse(req.url).search;
        }
        return remoteUrl;
    }

    var dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

    function filterHeaders(req, headers) {
        var result = {};
        Object.keys(headers).forEach(function (name) {
            if (!dontProxyHeaderRegex.test(name)) {
                result[name] = headers[name];
            }
        });
        return result;
    }

    var upstreamProxy = argv['upstream-proxy'];
    var bypassUpstreamProxyHosts = {};
    if (argv['bypass-upstream-proxy-hosts']) {
        argv['bypass-upstream-proxy-hosts'].split(',').forEach(function (host) {
            bypassUpstreamProxyHosts[host.toLowerCase()] = true;
        });
    }

    app.get('/proxy/*', function (req, res, next) {
        var remoteUrl = getRemoteUrlFromParam(req);
        if (!remoteUrl) {
            remoteUrl = Object.keys(req.query)[0];
            if (remoteUrl) {
                remoteUrl = url.parse(remoteUrl);
            }
        }

        if (!remoteUrl) {
            return res.status(400).send('No url specified.');
        }

        if (!remoteUrl.protocol) {
            remoteUrl.protocol = 'http:';
        }

        var proxy;
        if (upstreamProxy && !(remoteUrl.host in bypassUpstreamProxyHosts)) {
            proxy = upstreamProxy;
        }


        request.get({
            url: url.format(remoteUrl),
            headers: filterHeaders(req, req.headers),
            encoding: null,
            proxy: proxy
        }, function (error, response, body) {
            var code = 500;

            if (response) {
                code = response.statusCode;
                res.header(filterHeaders(req, response.headers));
            }

            res.status(code).send(body);
        });
    });

    //关机服务
    app.post('/shutdown', function (req, res) {
        exec('shutdown -s -f -t 15', {encoding: 'gbk'}, function (err, stdout, stderr) {
            if (!err) {
                res.send(iconv.decode(stdout, "GBK"));
            } else {
                res.send(iconv.decode(stderr, "GBK"));
            }
        });
    });

    var server = app.listen(argv.port, argv.public ? undefined : '', function () {
        if (argv.public) {
            console.log('remote server running publicly.  Connect to http://localhost:%d/', server.address().port);
        } else {
            console.log('remote server running locally.  Connect to http://localhost:%d/', server.address().port);
        }
    });

    server.on('error', function (e) {
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use, select a different port.', argv.port);
            console.log('Example: node server.js --port %d', argv.port + 1);
        } else if (e.code === 'EACCES') {
            console.log('Error: This process does not have permission to listen on port %d.', argv.port);
            if (argv.port < 1024) {
                console.log('Try a port number higher than 1024.');
            }
        }
        console.log(e);
        process.exit(1);
    });

    server.on('close', function () {
        console.log('remote server stopped.');
    });

    var isFirstSig = true;
    process.on('SIGINT', function () {
        if (isFirstSig) {
            console.log('remote server shutting down.');
            server.close(function () {
                process.exit(0);
            });
            isFirstSig = false;
        } else {
            console.log('remote server force kill.');
            process.exit(1);
        }
    });

})();
