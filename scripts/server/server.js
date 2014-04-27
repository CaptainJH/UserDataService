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

//// websocket stuff
wss.on('connection', function(ws) {
	ws.on('message', function(message) {
		var obj = JSON.parse(message);
		console.log(obj);
		console.log('received: %s', message);
	});
	ws.send('something');
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
app.get('/find/:id/:mac/:date/:info', function(request, response) {
	var requestObj = BuildRequestObject(request.params.id,
		request.params.mac,
		request.params.date,
		request.params.info);
	
	dbHandle.collection(
		doc, 
		function(outer_error, collection) {
			collection.find(requestObj).toArray( function(inner_error, map_list) {
						response.contentType('json');
						response.send(RemoveRawProp(map_list));
					}); 
		});
});

app.get('/findall/:id', function(request, response) {	
	var requestObj = BuildRequestObject(request.params.id, 'NA', 'NA', 'NA');
	
	dbHandle.collection(
		doc,
		function(outer_error, collection) {
			collection.find(requestObj).toArray(
				function(inner_error, map_list) {
					response.contentType('json');
					response.send(RemoveRawProp(map_list));
				});
		});
});

app.get('/findlatest/:id', function(request, response) {
	var requestObj = BuildRequestObject(request.params.id, 'NA', 'NA', 'NA');
	
	dbHandle.collection(
		doc,
		function(outer_error, collection) {
			collection.find(requestObj).toArray(
				function(inner_error, map_list) {
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
});

app.get('/findatdate/:id/:date', function(request, response) {
	var requestObj = BuildRequestObject(request.params.id, 'NA', 
		request.params.date, 'NA');
	
	dbHandle.collection(
		doc, 
		function(outer_error, collection) {
			collection.find(requestObj).toArray( function(inner_error, map_list) {
						response.contentType('json');
						response.send(RemoveRawProp(map_list));
					}); 
		});
});

app.get('/distinct/:key', function(request, response) {
	var key = request.params.key;
	
	dbHandle.collection(
		doc, 
		function(outer_error, collection) {
			collection.distinct(key, function(inner_error, map_list) {
				response.contentType('json');
				response.send(map_list);
			});
		});
});

app.get('/count/:id/:mac/:date/:info', function(request, response) {
	var requestObj = BuildRequestObject(request.params.id,
		request.params.mac,
		request.params.date,
		request.params.info);
		
	dbHandle.collection(
		doc, 
		function(outer_error, collection) {
			collection.count(requestObj, function(inner_error, count) {
						response.contentType('text/plain');
						response.send(count.toString());
					}); 
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

server.listen(3000);

console.log( 'Express server listening on port %d in %s mode in folder %s', server.address().port, app.settings.env, __dirname );