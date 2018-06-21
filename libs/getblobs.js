'use strict'

const getImage = require('./getimage');

module.exports = (res, blobs) => {
    let promises = [];
    blobs.map( blob => {
        promises.push(getImage(blob.photoFile)
        .then(data => {
            blob.photoFile = "data:image/png;base64," + data.toString('base64');
            return blob;
        })
        .catch(e => {
            console.log(e);
        }));
    })
    Promise.all(promises).then(jsonblobs => res.json(jsonblobs)).catch(console.log);
}