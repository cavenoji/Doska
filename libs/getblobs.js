'use strict'

module.exports = (blobs) => {
    blobs.map(blob => {
        blob.photoFile = "/static/photos/" + blob.photoFile.split("/").pop();
    })
    return blobs;
}