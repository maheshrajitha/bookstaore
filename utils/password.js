/**
 * @Author Udara Premadasa
 * @module Password
 */


const bcrypt = require('bcrypt');
const crypto = require('crypto');

const saltRounds = 11;

module.exports = {
    hash(plaintext) {
        return bcrypt.hashSync(plaintext, saltRounds)
    },

    isMatch(plaintext, hashtext) {
        return bcrypt.compareSync(plaintext, hashtext);
    },

    sha1Hash(plaintext) {
        let shasum = crypto.createHash('sha1').update(plaintext)
        return shasum.digest('hex')
    },

    sha256Generate(plainText){
        return crypto.createHash('sha256').update(plainText).digest("hex")
    }
}
