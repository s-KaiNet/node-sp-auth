var https = require("https");
var SP = require("sharepoint");
var consts = require("constants");
var fs = require("fs");
var urlparse = require('url').parse;

fs.readFile(__dirname + "\\config.json", function (err, data) {
	if(err) throw err;
	
	var config = JSON.parse(data);

	var endsWith = config.online.siteUrl.slice(-1);
	if(endsWith !== "/") {
		config.online.siteUrl = config.online.siteUrl + "/";
	}

	var service = new SP.RestService(config.online.siteUrl);
	
	service.signin(config.online.username, config.online.password, function (err, data) {
			if (err)  throw err; 
			
			var url = urlparse(config.online.siteUrl);

			var req_options = {
				method: "GET",
				host: url.host,
				path: url.path + "_api/web",
				headers: {
					"Accept": "application/json;odata=verbose",
					"Cookie": "FedAuth=" + data.FedAuth + "; rtFa=" + data.rtFa
				},
				secureOptions: consts.SSL_OP_NO_TLSv1_2
			};
			
			var req = https.request(req_options, function (res) {
				var jsonString = "";

				res.setEncoding("utf8");
				res.on("data", function(chunk) {
					jsonString += chunk;
				});

				res.on("end", function () {
					var json = JSON.parse(jsonString);
					console.log("Web title: " + json.d.Title);
				});
			});

			req.end();

		});
});