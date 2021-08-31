/**
 * @Author Udara Premadasa
 * @module User.Authenticate
 */

const {v5 : uuidv5} = require("uuid")
const {AppError, CommonError} = require("../utils/error")
const {CookieKeys, HeaderKeys} = require('../utils/constants')
const cache = require("../utils/redis").Client
const mysqlClient = require('../utils/mysql').Client

const env = process.env;

let cookieList = [
    CookieKeys.ACCESS_TOKEN,
    CookieKeys.INSTRUCTOR_ACCESS_TOKEN
]

let getAccessToken = (cookies)=>{
    let cookieVal = ""
    for (const key in cookies) {
        // console.log(cookies[key])
        cookieList.forEach(name=>{
            if (cookies.hasOwnProperty(name)) {
                return cookieVal = cookies[name];
            }
        })
    }

    return null
}


let checkAccessToken = (cookies, roles, callback) => {
    if (typeof cookies[CookieKeys.ACCESS_TOKEN] != "undefined")
        cache.get(cookies[CookieKeys.ACCESS_TOKEN], function(err, reply) {
            if (err || typeof reply === "undefined" || reply == null) callback(true, undefined);
            else {
                let session = JSON.parse(reply);
                if (roles.length === 0 || roles.includes(0) || roles.includes(session.level)) 
                    callback(false, session);
                else callback(true, undefined);
            }
        });
    else callback(true, undefined);
};

let checkRefreshToken = (cookies, roles, callback) => {
    if (typeof cookies[CookieKeys.REFRESH_TOKEN] != "undefined") {
        let getUserDataForSessionQ = `SELECT u.id as id, u.level as level, u.is_active as isActive, s.logged_by_username as loggedByUsername from user as u, session as s where u.id = s.user_id and s.device_id = '${cookies["rt"]}'`;
        mysqlClient.execute(getUserDataForSessionQ, (mysqlGetDataErr, userData) => {
            if (!mysqlGetDataErr && Array.isArray(userData) && userData.length > 0 && userData[0].isActive == 1) {
                let deviceId = cookies[CookieKeys.REFRESH_TOKEN];
                let accessToken = uuidv5("at", deviceId);
                let session = {
                    deviceId: deviceId,
                    userId: userData[0].id,
                    level: userData[0].level,
                    isVerified: userData[0].isActive,
                    loggedByUsername: userData[0].loggedByUsername,
                    lastRefreshedDatetime: new Date().getTime()
                };
                let sessionUpdateQ = `UPDATE session SET access_token = '${accessToken}', level = '${session.level}', is_verified = '${session.isVerified}', last_refreshed_datetime = '${session.lastRefreshedDatetime}' WHERE device_id = '${deviceId}'`;
                mysqlClient.execute(sessionUpdateQ, (mysqlSessionUpdateErr, result) => {
                    if(!mysqlSessionUpdateErr)
                        cache.set(accessToken, JSON.stringify(session), (cacheErr, reply) => {
                            if(!cacheErr) {
                                session.accessToken = accessToken;
                                callback(false, session);
                            } else callback(true, "Cache Error");
                        });
                    else callback(true, "Database Error");
                });
            } else callback(true, (mysqlGetDataErr) ? "Database Error" : (userData.length > 0) ? "User not found" : "User Disabled");
        });
    } else callback(true, "Request Token Missing");
};

let authorize = (req, res, roles, callback) => {
    if (typeof req.cookies != "undefined"){
        checkAccessToken(req.cookies, roles, (accessTokenErr, session) => {
            if (!accessTokenErr) {
                req.userId = session.userId;
                req.isVerified = session.isVerified;
                req.level = session.level;
                res.header(HeaderKeys.IS_VERIFIED_USER, session.isVerified);
                callback(false, undefined);
            } else {
                checkRefreshToken(req.cookies, roles, (refreshTokenErr, refreshSession) => {
                    if (!refreshTokenErr) {
                        req.userId = refreshSession.userId;
                        req.isVerified = refreshSession.isVerified;
                        req.level = refreshSession.level;
                        res.cookie(CookieKeys.ACCESS_TOKEN, refreshSession.accessToken, { maxAge: env.ACCESS_SESSION_TIMEOUT, httpOnly: true });
                        res.cookie(CookieKeys.REFRESH_TOKEN, refreshSession.deviceId, { maxAge: env.REFRESH_SESSION_TIMEOUT, httpOnly: true });
                        res.header(HeaderKeys.IS_VERIFIED_USER, refreshSession.isVerified);
                        if (roles.length === 0 || roles.includes(0) || roles.includes(refreshSession.level)) callback(false, undefined);
                        else callback(true, refreshSession);
                    } else {
                        res.clearCookie(CookieKeys.ACCESS_TOKEN);
                        res.clearCookie(CookieKeys.REFRESH_TOKEN);
                        callback(true, refreshSession);
                    }
                });
            }
        });
    }
    else{
        callback(true, undefined);
    }
};
  

module.exports = (roles = []) => {
    if(!Array.isArray(roles))
        roles = [roles]
    return [
        (req, res, next) => {
            authorize(req, res, roles, (err, exception) => {
                if (!err || roles.length === 0) next();
                else res.redirect("/")
            });
        }
    ];
};