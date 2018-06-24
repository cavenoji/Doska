'use strict'

module.exports = (blobs) => {
    blobs.map(blob => {
        blob.photo.large = "/static/photos/" + blob.photo.large.split("/").pop();
        blob.photo.normal = "/static/photos/" + blob.photo.normal.split("/").pop();
        blob.photo.thumbnail = "/static/photos/" + blob.photo.thumbnail.split("/").pop();
    })
    return blobs;
}