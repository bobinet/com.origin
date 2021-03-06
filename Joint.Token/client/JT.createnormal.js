var openpgp = require('openpgp');
var fs = require('fs');
var readline = require('readline');
var yaml = require('js-yaml');
var http = require('http');

var config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

//var infra = require('./infra');

var name,id,email,passphrase;

rl.question("请输入姓名：\n", function(answer) {
	name = answer;
	rl.question("请输入id(英文和字母组成)：\n", function(answer) {
		id = answer;
		rl.question("请输入Email地址：\n", function(answer) {
			email = answer;
			rl.question("请输入私钥保护口令(以后经常使用，请务必记住，但不能告诉任何人。)：\n", function(answer) {
				passphrase = answer;
				rl.close();
				
				createNor(name,id,email,passphrase);
			});
		});
	});
});

function createNor(name,id,email,passphrase){
	var UserId = name + " (" + id + ") <" + email + ">" ;
	
	var publicKey,privateKey;
	var opt = {numBits: 2048, userId: UserId, passphrase: passphrase};

	console.log("正在创建密钥对，需要几十秒时间，请稍候。。。");

	openpgp.generateKeyPair(opt).then(function(key) {
		var data = new Object();
		
		data.id = key.key.primaryKey.fingerprint;
		data.keytype = 2;
		data.pubkey = key.publicKeyArmored;
		data.createtime =  new Date().getTime();//Date.parse(key.key.primaryKey.created);
		data.remark = "Normal Account";
		
		//doc = yaml.safeDump(data);
		var authorseckey = openpgp.key.readArmored(key.privateKeyArmored).keys[0];
		
		var item = new Object();
		
		//item.cod = "";
		item.tag = "nor";
		item.author = id;
		item.data = data;
		item.sigtype = 0;
		
		sent(item,'POST',function(retstr){
			fs.writeFile(retstr+".pub",key.publicKeyArmored,function(err){
				if(err) throw err;
				console.log("公钥文件 ",retstr+".pub 已保存.");
			});
			fs.writeFile(retstr+".sec",key.privateKeyArmored,function(err){
				if(err) throw err;
				console.log("私钥文件 ",retstr+".sec 已保存.");
			});
		});
	});
}

// distribute storage
function sent(item,method,callback){
	var itemyaml = yaml.safeDump(item);
	var options = {
	  hostname: config.server.url,
	  port: config.server.port,
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/x-yaml'
	  }
	};
	
	console.log("sending account to server...\n",options);
	var req = http.request(options, function(res) {
	  console.log('STATUS: ' + res.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
		console.log('BODY: ' + chunk);
		callback(chunk);
	  });
	});
	req.write(itemyaml);
	req.end();
}