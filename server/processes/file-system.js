/* Copyright (C) [2003] - [2016] RealEyes Media, LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by RealEyes Media, October 2016
 *
 * THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND,
 * EITHER EXPRESSED OR IMPLIED,  INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND/OR FITNESS FOR A PARTICULAR PURPOSE.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of RealEyes Media, LLC and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to RealEyes Media, LLC
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from RealEyes Media, LLC.
 */

/* MODULE FOR FS MANAGEMENT */

const fs = require('fs');
const _ = require('lodash');
const q = require('q');
const async = require('async');
const debug = require('debug')('demo-encoder:file-system');
const path = require('path');
const rimraf = require('rimraf');
var config = require('../config/configuration.json');
var status = require('../control/status');

// Create all directories needed for workflow
exports.createDirs = function(options, callback) {
	status.updateStatusObject(options.statusURI, 'Creating Directories...');
	return function(callback) {
		options.outputDirectory = path.join(__dirname, ('../../' + options.outputDir + options.timestamp));

		// Make parent directory for workflow
		makeDirectory(options.outputDirectory)
		.then(function() {
			options.outputDirs = [];

			// If there's a single bitrate, make it an array so it doesn't read length of string
			if (_.isString(options.bitrates)) {
				options.bitrates = [options.bitrates];
			}

			// Loop through bitrates
			async.each(options.bitrates, function(bitrate, cb) {
				var directory = options.outputDirectory + '/' + bitrate;
				options.outputDirs.push(directory);

				// Make bitrate directories
				makeDirectory(directory) 
				.then(function(){
					// Successfully looped through bitrates
					cb(null);
				}, function(error) {
					cb(error);
				});
			}, function(error) {
				if (error) {
					// Workflow Error
					callback(error);
				} else {
					// All directories created
					debug('Successfully created output directories for ' + options.statusURI);
					callback(null, options);
				}
			});
		}, function(error) {
			// Workflow Error
			callback(error);
		});
	}
}

// Cleanup local media directory
exports.cleanup = function(options, callback) {
	status.updateStatusObject(options.statusURI, 'Finishing up...');

	// Array of files to clean, there's probably a better way to dynamically cleanup than this
	var cleanupArray = [path.join(__dirname, '../../' + options.inputURI), options.outputDirectory];

	async.each(cleanupArray, function(directory, cb) {
		rimraf(directory, function(err) {
			if (err) {
				cb(err);
			} else {
				debug('cleaned up: ' + directory);
				cb();
			}
		});
	}, function(error) {
		if (error) {
			callback(error);
		} else {
			debug('Successfully cleaned up: ' + options.statusURI);
			callback(null, options);
		}
	});
}

// Creates a directory if it doesn't exist
function makeDirectory(directory) {  
	var deferred = q.defer();
  	fs.stat(directory, function(err, stats) {
	    //Check if error defined and the error code is "not exists"
	    if (err) {
		    //Create the directory, call the callback.
		    fs.mkdir(directory, function(error) {
		    	if (error) {
		    		deferred.reject(error);
		    	} else {
		    		deferred.resolve();
		    	}
		    });
	    } else {
	    	// It exists
	        deferred.resolve();
	    }
	});

  	return deferred.promise;
}