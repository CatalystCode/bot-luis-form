var request = require('request-promise');
var util = require('util');

// replace LUIS endpoint with your own
var luisEndpoint = 'https://api.projectoxford.ai/luis/v2.0/apps/6bbb97ee-7727-4651-aa22-f6ec704075d0?subscription-key=b46ebba7b9434807af2bb27de4719940&verbose=true';
var luisUrlTemplate = `${luisEndpoint}&q=%s`;

function query(text) {
	return new Promise((resolve, reject) => {
		var queryUrl = util.format(luisUrlTemplate, encodeURIComponent(text));
		console.log(`invoking LUIS query: ${queryUrl}`);
		return request(queryUrl)
			.then((body) => {
				var result = JSON.parse(body);
				console.log(`got LUIS response: ${JSON.stringify(body, true, 2)}`);
				return resolve(result);				
			})
			.catch(err => {
				console.error(`error: ${JSON.stringify(err, true, 2)}`);
				return reject(err);
			});
	});
}

module.exports = {
	query
};

