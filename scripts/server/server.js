var 
	path = require('path'),
	http = require('http'),
	express = require('express'),
	connect = require('connect'),
	app = express(),
	server = http.createServer(app),
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
	response.redirect('/client.html');
});

///// CRUD
app.get('/findall/:id', function(request, response) {	
	
	dbHandle.collection(
		doc,
		function(outer_error, collection) {
			console.log(request.params.id);
			collection.find({qq:parseInt(request.params.id)}).toArray(
				function(inner_error, map_list) {
					response.contentType('json');
					response.send(RemoveRawProp(map_list));
				});
		})
});

app.get('/findlatest/:id', function(request, response) {
	dbHandle.collection(
		doc,
		function(outer_error, collection) {
			collection.find({qq:parseInt(request.params.id)}).toArray(
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
		})
});

app.get('/findatdate/:id/:date', function(request, response) {
	dbHandle.collection(
		doc, 
		function(outer_error, collection) {
			var padCount = 14 - request.params.date.length;
			var floorPad = '';
			var cellPad = '';
			for(var i = 0; i < padCount; ++i)
			{
				floorPad += '0';
				cellPad += '9';
			}

			collection.find(
				{ $and:
					[
						{ qq: parseInt(request.params.id) },
						{ log_id : {$gt : parseInt(request.params.date + floorPad) } },
						{ log_id : {$lt : parseInt(request.params.date + cellPad) } }
					]
				}).toArray( function(inner_error, map_list) {
						response.contentType('json');
						response.send(RemoveRawProp(map_list));
					}); 
		})
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