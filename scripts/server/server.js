var 
	path = require('path'),
	http = require('http'),
	express = require('express'),
	connect = require('connect'),
	app = express(),
	server = http.createServer(app),
	
	mongodb = require('mongodb'),
	mongoServer = new mongodb.Server('localhost', mongodb.Connection.DEFAULT_PORT),
	dbHandle = new mongodb.Db('test', mongoServer, {safe : true});
	
dbHandle.open(function() {
	console.log('** Connected to MongoDB **');
});

__dirname = path.normalize(__dirname + '/../..');
	
app
	.use(connect.logger('dev'))
	.use(connect.errorHandler())
	.use(connect.bodyParser())
	.use(express.static(__dirname));
app.get('/:doc/find/:id', function(request, response) {	
	//response.send('Hello Express\n');
	//response.redirect('/d3_test.html');
	
	dbHandle.collection(
		request.params.doc,
		function(outer_error, collection) {
			console.log(request.params.id);
			collection.find({qq:parseInt(request.params.id)}).toArray(
				function(inner_error, map_list) {
					response.contentType('json');
					response.send(map_list);
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