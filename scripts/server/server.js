var 
	path = require('path'),
	http = require('http'),
	express = require('express'),
	connect = require('connect'),
	app = express(),
	server = http.createServer(app),
	WebSocketServer = require('ws').Server,
	wss = new WebSocketServer({port : 3001}),
	doc = 'UserReport',
	
	mongodb = require('mongodb'),
	mongoServer = new mongodb.Server('localhost', mongodb.Connection.DEFAULT_PORT),
	dbHandle = new mongodb.Db('test', mongoServer, {safe : true});
	
dbHandle.open(function() {
	console.log('** Connected to MongoDB **');
});

__dirname = path.normalize(__dirname + '/../..');


function RemoveRawProp(map_list)
{
	if(Object.prototype.toString.call(map_list) === '[object Array]')
	{
		for(var ele in map_list)
		{
			delete map_list[ele].raw;
		}
	}
	else
	{
		delete map_list.raw;
	}
	
	return map_list;
}
	
app
	.use(connect.logger('dev'))
	.use(connect.errorHandler())
	.use(connect.bodyParser())
	.use(express.static(__dirname));

app.get('/', function(request, response) {
	//response.redirect('/client.html');
	response.sendfile(__dirname + '/client.html');
});

///// CRUD
function BuildRequestObject(id, macAddress, date, info)
{
	var requestObj = {$and:[]};
	
	if(id !== 'NA')
	{
		requestObj['$and'].push( {qq : parseInt(id)} );
	}
	
	if(macAddress !== 'NA')
	{
		requestObj['$and'].push( {mac : macAddress} );
	}
	
	if(date !== 'NA')
	{
		var padCount = 14 - date.length;
		var floorPad = '';
		var cellPad = '';
		for(var i = 0; i < padCount; ++i)
		{
			floorPad += '0';
			cellPad += '9';
		}
		
		requestObj['$and'].push( {
			$and : [
				{log_id : {$gt : parseInt(date + floorPad)} },
				{log_id : {$lt : parseInt(date + cellPad)} }
			]
		});
	}
	
	if(info !== 'NA')
	{
		requestObj['$and'].push( {info: '/' + info + '/i'} );
	}
	
	//console.log(requestObj);
	return requestObj;
}

function Find(id, mac, date, info, callback) {
	var requestObj = BuildRequestObject(id, mac, date, info);
	
	dbHandle.collection(
	doc, 
	function(outer_error, collection) {
		collection.find(requestObj).toArray( function(inner_error, map_list) {
					callback(inner_error, map_list);
				}); 
	});
	
	return [];
}

function Distinct(key, callback) {
	dbHandle.collection(
	doc,
	function(outer_error, collection) {
		collection.distinct(key, function(inner_error, map_list) {
			callback(inner_error, map_list);
		});
	});
}

function Count(id, mac, date, info, callback) {
	var requestObj = BuildRequestObject(id, mac, date, info);
	
	dbHandle.collection(
	doc, 
	function(outer_error, collection) {
		collection.count(requestObj, function(inner_error, count) {
			callback(inner_error, count);
		});
	});
}

app.get('/find/:id/:mac/:date/:info', function(request, response) {
	Find(request.params.id, request.params.mac,
		request.params.date, request.params.info, function(error, map_list){
				response.contentType('json');
				response.send(RemoveRawProp(map_list));
		});
});

app.get('/findall/:id', function(request, response) {	
	Find(request.params.id, 'NA', 'NA', 'NA', 
		function(error, map_list){
			response.contentType('json');
			response.send(RemoveRawProp(map_list));
		});
});

app.get('/findlatest/:id', function(request, response) {
	Find(request.params.id, 'NA', 'NA', 'NA', 
		function(error, map_list){
			response.contentType('json');
			var latest = '0';
			for(var ele in map_list)
			{
				if(map_list[ele].log_id > map_list[latest].log_id)
				{
					latest = ele;
				}
			}
			response.send(RemoveRawProp(map_list[latest]));
		});	
});

app.get('/findatdate/:id/:date', function(request, response) {
	Find(request.params.id, 'NA', request.params.date, 'NA', 
		function(error, map_list){
			response.contentType('json');
			response.send(RemoveRawProp(map_list));
		});
});

app.get('/distinct/:key', function(request, response) {
	var key = request.params.key;
	
	Distinct(key, function(error, map_list) {
		response.contentType('json');
		response.send(map_list);
	});
	
});

app.get('/count/:id/:mac/:date/:info', function(request, response) {
	Count(request.params.id, request.params.mac,
		request.params.date, request.params.info, function(error, count) {
			response.contentType('text/plain');
			response.send(count.toString());
		});
});

app.post('/', function(request, response) {
	response.send('POST response!\n');
});
app.put('/', function(request, response) {
	response.send('PUT response!\n');
});
app.delete('/', function(request, response) {
	response.send('Delete response!\n');
});

//// websocket stuff
wss.on('connection', function(ws) {
	ws.on('message', function(message) {
		var obj = JSON.parse(message);
		//console.log(obj);
		//console.log('received: %s', message);
		
		if(obj.msg === 'count')
		{
			Count(obj.qq, obj.mac, obj.date, obj.info, function(error, count) {
				ws.send(JSON.stringify({ msg : 'count', ret : count, date : obj.date } ) );
			});
		}
	});
	//ws.send('something');
});

server.listen(3000);

console.log( 'Express server listening on port %d in %s mode in folder %s', server.address().port, app.settings.env, __dirname );