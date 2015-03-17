var httpntlm = require("httpntlm");
var fs = require("fs");

fs.readFile(__dirname + "\\config.json", function (err, data) {
	if(err) throw err;
	
	var config = JSON.parse(data);

	var endsWith = config.onprem.siteUrl.slice(-1);
	if(endsWith !== "/") {
		config.onprem.siteUrl = config.onprem.siteUrl + "/";
	}

	httpntlm.get({
		url: config.onprem.siteUrl + "_api/web/",
		headers: {
			"Accept": "application/json;odata=verbose"
		},
		username: config.onprem.username,
		password: config.onprem.password,
		workstation: config.onprem.workstation,
		domain: config.onprem.domain
	}, function (err, res) {
		if (err) {
			return err;
		}
		
		var result = JSON.parse(res.body);
		console.log("Web title: " + result.d.Title);
	});
});