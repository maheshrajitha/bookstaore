exports.UserRole = {
    super_admin: { code: 1, name: 'Super Administrator' },
    admin: { code: 90, name: 'Administrator' },
    user: { code: 2, name: 'User' },
    all: { code: 0, name: 'All Users' }
}

exports.CookieKeys = {
    ACCESS_TOKEN: 'at',
    REFRESH_TOKEN: 'rt',
    INSTRUCTOR_ACCESS_TOKEN:"iat",
    INSTRUCTOR_REFRESH_TOKEN:"irt"
}

exports.HeaderKeys = {
    IS_VERIFIED_USER: "Is-Verified-User"
}