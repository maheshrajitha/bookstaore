const { v1: uuidv1 } = require("uuid");

const { AppError: Error, CommonError } = require('../utils/error');
const logger = require('../utils/logger');
const passwordHash = require('../utils/password');
const { executeAsync, executeWithData, execute } = require('../utils/mysql').Client;
const email = require('../utils/email');

const { UserRole } = require('../utils/constants')


const isValidUser = (user) => {
    return !(typeof user.firstName != "string" || user.firstName == "" || typeof user.lastName != "string" || user.lastName == "" || typeof user.email != "string" || user.email == "" || !email.isValid(user.email) || typeof user.password != "string" || user.password == "")
}

const UserError = {
    FAILED_TO_SAVE_USER: { message: "failed to save user", code: "FAILED_TO_SAVE_USER" },
    PASSWORD_HASH_ERROR: { message: "Password Hashing Error", code: "PASSWORD_HASH_ERROR" },
    FAILED_TO_UPDATE_USER: { message: "failed to update user", code: "FAILED_TO_UPDATE_USER" },
    EMAIL_ALREADY_USED: { message: "Email Already Used", code: "EMAIL_ALREADY_USED" },
    REQUIRED_FIELDS_EMPTY: { message: "Required Fields Empty", code: "REQUIRED_FIELDS_EMPTY" },
    COURSE_NOT_FOUND:{ message: "Course Not Found",code:"COURSE_NOT_FOUND"}
}

module.exports = {
    create(req, res, next) {
        const newUser = req.body
        if (isValidUser(newUser)) {
            const hashedPW = passwordHash.hash(newUser.password)
            if (hashedPW != '') {
                const buildedUser = {
                    id : uuidv1(),
                    first_name: newUser.firstName,
                    last_name: newUser.lastName,
                    email: newUser.email,
                    password: hashedPW,
                    created_datetime: new Date().getTime(),
                    is_active: 1,
                    is_confirmed: 1,
                    level : UserRole.user.code
                }
                const userInsertQuery = `INSERT INTO user SET ?`;
                executeWithData(userInsertQuery, buildedUser, (userInsertErr, result) => {
                    delete buildedUser.password
                    delete buildedUser.is_active
                    if (!userInsertErr) res.status(200).json(buildedUser)
                    else if (typeof userInsertErr.code == "string" && userInsertErr.code == "ER_DUP_ENTRY")
                        next(new Error(UserError.EMAIL_ALREADY_USED, userInsertErr, 400));
                    else next(new Error(CommonError.DATABASE_ERROR, userInsertErr, 400));
                })
            } else next(new Error(UserError.PASSWORD_HASH_ERROR, undefined, 400))
        } else next(new Error(UserError.REQUIRED_FIELDS_EMPTY, undefined, 400))
    },

    getMe(req, res, next) {
        executeAsync(`SELECT id as Id, first_name as firstName, last_name as lastName, email, avatar, level FROM user WHERE id = '${req.userId}'`)
            .then(result => {
                res.status(200).json(result[0])
            })
            .catch(error => {
                next(new AppError(CommonError.DATABASE_ERROR, error, 400))
            })
    },
}