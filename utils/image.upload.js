/**
 * @Author Udara Premadasa
 * @module Password
 */

const https = require('https');
const http = require('http');
const url = require("url");

const handleRes = (req, callback) => {
    let body = '';
    let status = req.statusCode;
	req.on('data', function (data){
		body += data;
	});
	req.on('end', function (data){
		var post = body;
		if (post.substr(-2) == '[]'){
			post += '}';
		}
		try{
			post = JSON.parse(post);
		}
		catch(e){
			try{
				post = post.replace(/u'/g, '"').replace(/'/g, '"');
				post = JSON.parse(post);
			}
			catch(e){}
        }
        const res = {
            status: status,
            body: post
        }
		callback(res);
	});
}

const httpsReq = (method, reqUrl, apiKey, data, callback) => {
    let pru = url.parse(reqUrl);
    let protocol = http;
    let port = pru.port || 80;
    if (pru.protocol === 'https:') {
        protocol = https;
        port = pru.port || 443;
    }
    let apiReq = protocol.request(
        {
            port: port, 
            method: method, 
            host: pru.hostname, 
            path: pru.path,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Api-Key': apiKey }
        },
         (response) => {
            response.setEncoding('utf8');
            //console.log(response.body)
            handleRes(response, callback);
        }
    )
    .on('error',  (err) => {

    });
    if (method != 'GET' && data) {
        apiReq.write(data);
    }
    apiReq.end();
}

module.exports = {
    upload: (imageBase64, imageType, callback) => {
        let data = {
            imageBase64: imageBase64,
            dataType: imageType,
        }
        let uri = process.env.FILE_UPLOAD_URL;
        let apiKey = process.env.FILE_UPLOAD_API_KEY;
        httpsReq("POST", uri, apiKey, JSON.stringify(data), callback);
    }
};
