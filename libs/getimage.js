'use strict'

const fs = require('fs');

module.exports = (filename) => {
	return new Promise((resolve, reject) => {
		fs.readFile(filename, (err, data) =>{
			if (err) reject(err);
			resolve(data);
		});
	});
}