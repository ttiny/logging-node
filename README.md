Logging
=======
Logging module for Node.js, implementation of <https://perennial.atlassian.net/wiki/display/DV2/Logging>.

The implementation is in `BETA` stage.

<!-- MarkdownTOC -->

- [About](#about)
- [Installation](#installation)
- [Example](#example)
- [TODO](#todo)
- [Authors](#authors)

<!-- /MarkdownTOC -->


About
-----

The purpose of this module is to bring consistent logging functionality across
the Perennial services with minimal required effort from the developer, while
still providing low level access for custom logging with output according to
the specs.

- Automatic logging of console output.
- Automatic logging of HTTP request.
- Automatic logging of unhandled exceptions.
- Domain sensitive logging - all logging done in the context of an HTTP
  request is associted with this request.
- File writes are buffered until the file is actually opened - so nothing is
  blocked and one can use semi-sync API without any blocking.
- Fully async with support for deferred creation of files and directories -
  nothing will be created until something is actually written.


Installation
------------

```sh
npm install https://github.com/Perennials/logging-node/tarball/master
```


Example
-------

The module provides the [LoggedHttpApp](#loggedhttpapp) class which implements
domain and error handling, as well as hooking of the console output and HTTP
requests. The low level logging classes can be used separately but the
automatic logging capabilieties will remain unused. Running this example (it
can be found in the examples directory) and requesting `localhost:1337` will
create log session with a bunch of records.

The [LoggedHttpApp](#loggedhttpapp) class extends
[HttpApp](https://github.com/Perennials/app-node#httpapp) of the [App
module](https://github.com/Perennials/app-node). Check the links for
explanation of the concept of reusing the `HttpApp` class.

```js

var LoggedHttpApp = require( '../LoggedHttpApp' );
var LoggedHttpAppRequest = require( '../LoggedHttpAppRequest' );
var FileSession = require( '../FileSession' );
var Config = require( 'App/Config' );

// this will be instantiated by LoggedHttpApp whenever we have a new request coming in
function MyAppRequest ( app, req, res ) {
	// call the parent constructor
	LoggedHttpAppRequest.call( this, app, req, res );

	// open a log stream, that is file, in which we can write data
	// don't forget to close it or our app will not close
	this._logStream = this.LogSession.openRecord( [ 'RECORD_STREAM', 'DATA_XML' ] );
	this._logStream.write( '<log>\n' );

}

MyAppRequest.extend( LoggedHttpAppRequest, {

	// make sure we clean what we have opened
	// logsession will not be closed properly if we have open streams
	cleanup: function () {
		this._logStream.write( '</log>' );
		this._logStream.close();
	},
	
	onError: function ( err ) {

		// log some line in our stream
		this._logStream.write( '<ERROR>Unhandled error "' + err.message + '"</ERROR>\n' );

		// this will be copied to a file in the log session
		console.error( 'Damn, error happened with this specific client request', this.Request );

		// finish the response so we can close the server
		this.Response.writeHead( 500, {
			'Connection': 'close',
		} );
		this.Response.end();
		this.cleanup();

		// call the default handler, which will log the error and abort the app
		LoggedHttpAppRequest.prototype.onError.call( this, err );
	},


	// this will be called when we have the whole http request
	onHttpContent: function ( content ) {

		// log some line in our stream
		this._logStream.write( '<INFO>HTTP request received</INFO>\n' );

		// write a log record in the context of the HTTP request
		this.LogSession.write( { some: 'json' }, [ 'MyRecord', 'RECORD_GENERIC','DATA_JSON' ] )

		// we have the full request at this point, headers and content
		console.log( 'A request came from', this.Request.headers[ 'user-agent' ], '.' );

		doSomethingWithThe( this.Request, function ( good ) {

			// normal nodejs handling of the response
			this.Response.writeHead( good ? 200 : 500, {
				'Connection': 'close',
				'Content-Type': 'text/plain'
			} );
			this.Response.end( 'bye' );
			this.cleanup();

		} );

	}
} );


// construct a new HttpApp, tell it our request class is MyAppRequest
var app = new LoggedHttpApp( MyAppRequest, '0.0.0.0', 1337 );

// log sessions will be written in the directory pointed by 'storage.log', or the temp directory
app.setConfig( new Config( { storage: { log: __dirname } } ) );

// we can customize the session directory naming
FileSession.DirectoryFormat = 'myapp-{LogSession}{SessionName}';

app.startListening();
```

...some more docs here...


TODO
----

- When hooking `http.ClientRequest` the headers are not logged.
- When hooking `http.IncommingMessage` the body should be human readable, not
  chuncked or compressed, but I'm not sure because for repeating the request
  is better to have the exact replica, for human ispection and testing it
  needs to be readable and the `content-length` needs to be adjusted.


Authors
-------
Borislav Peev (borislav.asdf at gmail dot com)