"use strict";

var Events = require( 'events' );
var ILogEngine = require( './ILogEngine' );

function ILogSession ( log, parentId, props, callback ) {
	this._log = log;
	this._id = null;
	this._parentId = parentId;
}

ILogSession.extend( Events.EventEmitter, {
	
	getLog: function () {
		return this._log;
	},

	getId: function () {
		return this._id;
	},

	getParentId: function () {
		return this._parentId;
	},

	getStorageUri: function () {},
	close: function ( callback ) {},
	getOpenRecords: function () {},
	getLoggedRecords: function () {},
	openRecord: function ( props, callback ) {},
	wait: function ( callback ) {},

	write: function ( data, props, callback ) {

		if ( props instanceof Function ) {
			callback = props;
			props = [ 'RECORD_GENERIC', String.isString( data ) ? 'DATA_TEXT' : 'DATA_JSON' ];
		}

		props = ILogEngine.labelsToProps( props, ILogEngine.DefaultRecordProps );

		// handle known data types
		if ( data instanceof Error &&
		     props.DataType == ILogEngine.DATA_TEXT.Value ) {
			
			data = data.stack;
		}
		else if ( data instanceof Object &&
			 props.DataType == ILogEngine.DATA_JSON.Value ) {
			
			data = JSON.stringify( data );
		}

		//todo: handle http classes here

		this.openRecord( props, function ( err, record ) {
			if ( err ) {
				if ( callback instanceof Function ) {
					process.nextTick( function () {
						callback( err, null );
					} );
				}
				return;
			}

			record.write( data, function ( err ) {

				record.close( function () {
					if ( callback instanceof Function ) {
						process.nextTick( function () {
							callback( err );
						} );
					}
				} );

			} );
		} );
	}
} );

module.exports = ILogSession;