/**
 * @Author Udara Premadasa
 * @module Base64Factory
 */


module.exports = {
    /**
     * Base 64 Encode
     * @param {*} bitmap 
     */
    encode(bitmap) {
        return new Buffer(bitmap).toString('base64');
    },

    /**
     * Decode to bitmap
     * @param {*} base64str 
     */
    decode(base64str) {
        return new Buffer(base64str, 'base64');
    }
}

