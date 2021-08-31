

const { v1: uuidv1, stringify } = require("uuid")
const { v5: uuidv5 } = require("uuid")

const { AppError: Error, CommonError } = require('../utils/error')
const logger = require('../utils/logger')
const passwordHash = require('../utils/password')
const { execute, executeWithData, executeAsync, executeWithDataAsync } = require('../utils/mysql').Client
const cache = require('../utils/redis').Client
const { CookieKeys, HeaderKeys } = require('../utils/constants')
const { error } = require("../utils/logger")
const password = require("../utils/password")
const { sha1Hash } = require("../utils/password")
const email = require("../utils/email")


const env = process.env;

const AuthError = {
    USER_HAS_BEEN_LOGGED: { message: "User Has been logged", code: "USER_HAS_BEEN_LOGGED" },
    INCORRECT_USERNAME_PASSWORD: { message: "Incorrect Username and Passowrd", code: "INCORRECT_USERNAME_PASSWORD" },
    USER_HAS_BEEN_DISABLED: { message: "User has been Disabled", code: "USER_HAS_BEEN_DISABLED" }
}

const createLoginSession = (user, credentials, callback) => {
    const deviceId = uuidv1()
    const accessToken = uuidv5("at", deviceId)
    const loggedDatetime = new Date().getTime()
    const dbSession = {
        device_id: deviceId,
        user_id: user.id,
        access_token: accessToken,
        level: user.level,
        is_verified: user.status,
        logged_by_username: credentials.username,
        logged_date_time: loggedDatetime,
        last_refreshed_datetime: loggedDatetime
    }
    const sessionInsertQ = `INSERT INTO session SET ?`
    executeWithData(sessionInsertQ, dbSession, (sessionInsertErr) => {
        if (!sessionInsertErr) {
            const session = {
                deviceId: deviceId,
                userId: user.id,
                level: user.level,
                isVerified: user.status,
                loggedByUsername: credentials.username,
                loggedDatetime: loggedDatetime
            }
            cache.set(accessToken, JSON.stringify(session), (cacheErr) => {
                if (!cacheErr) {
                    session.accessToken = accessToken
                    callback(false, session)
                    logger.info(`${credentials.username} logged to System`);
                } else {
                    execute(`DELETE FROM session WHERE device_id = '${deviceId}'`)
                    logger.warn(JSON.stringify(cacheErr))
                    callback(true, CommonError.CACHE_ERROR)
                }
            })
        } else {
            logger.warn(JSON.stringify(sessionInsertErr))
            callback(true, CommonError.DATABASE_ERROR)
        }
    })
}

const checkChache = (at) => {
    return new Promise((resolve, reject) => {
        if (typeof at === "undefined")
            return resolve(null)
        else {
            cache.get(at, (cacheErr, result) => {
                if (cacheErr || result == null) {
                    return resolve(cacheErr)
                } else {
                    console.log(result)
                    reject(undefined)
                }
            })
        }
    })
}

const generateResetPasswordToken = codeList => {
    let token = Math.round(Math.random() * 10000)
    while (typeof codeList.find(code => code.forget_password_token === token) !== "undefined") {
        token = Math.round(Math.random() * 10000)
    }
    return token
}

const generatePasswordResetValidationToken = (user, code) => {
    let body = JSON.stringify({
        u_id: user.id,
        email: user.email,
        iat: new Date().getTime(),
        code: code
    })

    let base64EncodedToken = Buffer.from(body).toString("base64")
    return base64EncodedToken.concat(".").concat(passwordHash.sha256Generate(base64EncodedToken.concat(env.TOKEN_SECRET)))
}

const validatePasswordResetToken = token => {
    let body = token.split(".")
    if (body.length > 1 && passwordHash.sha256Generate(body[0].concat(env.TOKEN_SECRET)) === body[1]) {
        let decodeToken = JSON.parse(Buffer.from(body[0], "base64").toString("ascii"))
        if (typeof decodeToken.u_id !== "undefined" && typeof decodeToken.email !== "undefined" && typeof decodeToken.code !== "undefined") {
            return decodeToken
        }
    }
    throw new Error("Token Not Valied")
}


module.exports = {
    async login(req, res, next) {
        try {
            let tokenValidation = await checkChache(req.cookies[CookieKeys.ACCESS_TOKEN])
            let credentials = req.body;
            let exception = {};
            if (typeof credentials.username === "undefined" || credentials.username == "" || typeof credentials.password === "undefined" || credentials.password == "") {
                exception.username = typeof credentials.username === "undefined" || credentials.username == "" ? "username | email required" : undefined;
                exception.password = typeof credentials.password === "undefined" || credentials.password == "" ? "password required" : undefined;
                next(new Error(CommonError.INVALID_REQUEST, exception, 400));
            } else {
                let searchQ = `SELECT id, password, level, is_active as isActive FROM user WHERE email = '${credentials.username}'`;
                execute(searchQ, (userSearchErr, users) => {
                    if (!userSearchErr) {
                        if (users.length > 0) {
                            const user = users[0];
                            if (user.isActive == 1 && (!req.isFromAdmin || (req.isFromAdmin && user.role > 10)))
                                if (passwordHash.isMatch(credentials.password, user.password)) {
                                    createLoginSession(user, credentials, (createSessionErr, result) => {
                                        if (!createSessionErr) {
                                            res.cookie(CookieKeys.ACCESS_TOKEN, result.accessToken, {
                                                maxAge: env.ACCESS_SESSION_TIMEOUT,
                                                httpOnly: false,
                                                domain: env.LANDING_APP_DOMAIN
                                            });
                                            res.cookie(CookieKeys.REFRESH_TOKEN, result.deviceId, {
                                                maxAge: env.REFRESH_SESSION_TIMEOUT,
                                                httpOnly: false,
                                                domain: env.LANDING_APP_DOMAIN
                                            });
                                            res.header(HeaderKeys.IS_VERIFIED_USER, result.isVerified);
                                            res.status(200).json({ userRole: user.role });
                                        } else next(new Error(result, undefined, 400));
                                    })
                                } else next(new Error(AuthError.INCORRECT_USERNAME_PASSWORD, "Password did not match", 400));
                            else if (req.isFromAdmin) next(new Error(CommonError.UNAUTHORIZED, undefined, 400));
                            else next(new Error(AuthError.USER_HAS_BEEN_DISABLED, undefined, 400));
                        } else next(new Error(AuthError.INCORRECT_USERNAME_PASSWORD, "Username or Email Not Exist", 400));
                    } else next(new Error(CommonError.DATABASE_ERROR, userSearchErr, 400));
                });
            }
        } catch (error) {
            next(new Error(AuthError.USER_HAS_BEEN_LOGGED, error, 400))
        }
    },

    isLoged(req, res, next) {
        if (typeof req.cookies[CookieKeys.ACCESS_TOKEN] != "undefined" || typeof req.cookies[CookieKeys.REFRESH_TOKEN] != "undefined")
            // res.render("home", { msg: req.flash('info')[0] , signUpErr:  req.flash('signUpErr')[0], logged: true });
            res.status(200).json({ logged: true });
        else
            // res.render("home", { msg: req.flash('info')[0] , signUpErr:  req.flash('signUpErr')[0], logged: false });
            res.status(200).json({ logged: false });
    },

    logout(req, res, next) {
        if (typeof req.cookies[CookieKeys.REFRESH_TOKEN] != "undefined") {
            let deviceId = req.cookies[CookieKeys.REFRESH_TOKEN];
            let getSessionAndDeleteQ = `DELETE FROM session WHERE device_id = '${deviceId}'`;
            execute(getSessionAndDeleteQ, (mysqlErr, result) => {
                if (!mysqlErr) {
                    if (typeof req.cookies[CookieKeys.ACCESS_TOKEN] != "undefined") {
                        cache.del(req.cookies[CookieKeys.ACCESS_TOKEN], (redisDeleteError, result) => {
                            res.clearCookie(CookieKeys.ACCESS_TOKEN);
                            res.clearCookie(CookieKeys.REFRESH_TOKEN);
                            res.status(200).json({ message: "logout" });
                        });
                    } else {
                        res.clearCookie(CookieKeys.ACCESS_TOKEN);
                        res.clearCookie(CookieKeys.REFRESH_TOKEN);
                        res.status(200).json({ message: "logout" });
                    }

                } else
                    next(new Error(CommonError.DATABASE_ERROR, undefined, 400));
            });
        } else next(new Error(CommonError.INVALID_REQUEST, 'User Already Logout', 400));
    },

    async sendPasswordToken(req, res, next) {
        if (typeof req.body.email !== "undefined" && req.body.email !== null) {
            try {
                let user = await executeAsync(`SELECT email FROM user WHERE email='${req.body.email}'; SELECT forget_password_token FROM user`)
                if (user[0].length > 0) {
                    let token = { forget_password_token: generateResetPasswordToken(user[1]) }
                    await executeWithDataAsync(`UPDATE user SET ? WHERE email='${req.body.email}'`, token)
                    await email.sendEmail("forgot-password", {
                        code: token.forget_password_token,
                        emails: [req.body.email],
                        subject: "Password Reset Code"
                    })
                    res.send({
                        codeSent: true
                    })
                }
                else next(new Error(AuthError.INCORRECT_EMAIL, "No User With This Email Address", 404))
            } catch (error) {
                console.log(error)
                next(new Error(CommonError.INTERNAL_SERVER_ERROR, error, 500))
            }
        } else
            next(new Error(CommonError.INVALID_REQUEST, "Required Data Missing", 400))
    },

    async getUserByRecoveryCode(req, res, next) {
        if (typeof req.query.code !== "undefined" && req.query.code != null) {
            try {
                let user = await executeAsync(`SELECT id,email FROM user WHERE forget_password_token='${req.query.code}'`)
                if (user.length > 0) {

                    res.send({
                        token: generatePasswordResetValidationToken(user[0], req.query.code)
                    })
                } else
                    next(new Error(AuthError.PASSWORD_RESET_CODE_NOT_FOUND, "User Not Exists", 404))
            } catch (error) {
                next(new Error(CommonError.INTERNAL_SERVER_ERROR, error, 500))
            }
        } else next(new Error(CommonError.INVALID_REQUEST, "Required Data Missing", 400))
    },

    async updateForgetPassword(req, res, next) {
        if (typeof req.body.token !== "undefined" && req.body.token != null && req.body.password !== null && typeof req.body.password !== "undefined") {
            try {
                let decodeToken = validatePasswordResetToken(req.body.token)
                let data = {
                    password: passwordHash.hash(req.body.password),
                    forget_password_token: null
                }
                let updateResult = await executeWithDataAsync(`UPDATE user SET ? WHERE email='${decodeToken.email}' AND id='${decodeToken.u_id}' AND forget_password_token='${decodeToken.code}'`, data)
                if (updateResult.changedRows > 0)
                    res.send({
                        passwordReset: true
                    })
                else next(new Error(AuthError.INVALIED_PASSWORD_RESET_TOKEN, "Token Not Valied", 400))
            } catch (error) {
                next(new Error(CommonError.INTERNAL_SERVER_ERROR, error, 500))
            }
        } else next(new Error(CommonError.INVALID_REQUEST, "Required Data Missing", 400))
    }
}