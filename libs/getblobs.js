'use strict'

module.exports = (blobs) => {
    blobs.map(blob => {
        blob.photo.large = "/static/photos/large/" + blob.photo.large.split("/").pop();
        blob.photo.normal = "/static/photos/compressed/" + blob.photo.normal.split("/").pop();
        blob.photo.thumbnail = "/static/photos/downscaled/" + blob.photo.thumbnail.split("/").pop();
    })
    return blobs;
}