/**
 * @Author Udara Premadasa
 * @module Email
 */

const { default : axios } = require("axios")
const env = process.env

module.exports = {
    isValid(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },

    async sendEmail(path, data = {}) {
        return axios.post(`${env.EMAIL_SERVICE_URI}`, data, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": env.EMAIL_API_KEY
            }
        })
    }
}