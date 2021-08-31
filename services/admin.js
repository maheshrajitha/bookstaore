const { AppError: Error, CommonError } = require('../utils/error')
const logger = require('../utils/logger')
const { error } = require("../utils/logger")
const { execute, executeWithData, executeAsync, executeWithDataAsync } = require('../utils/mysql').Client
const fileUploadClient = require("../utils/fileupload")
const { v1: uuidv1 } = require("uuid")

const env = process.env
const CaroselError = {
    FAILED_TO_SAVE_CAROSEL: { message: "failed to save carosel", code: "FAILED_TO_SAVE_CAROSEL" },
    FAILED_TO_UPDATE_CAROSEL: { message: "failed to update category", code: "FAILED_TO_UPDATE_CAROSEL" },
    REQUIRED_FIELDS_EMPTY: { message: "Required Fields Empty", code: "REQUIRED_FIELDS_EMPTY" },
}

const isValidCarosel = (carosel) => {
    //|| typeof carosel.index != 'string' || carosel.index == "" 
    return !(typeof carosel.caption != "string" || carosel.caption == "" || typeof carosel.title != "string" || carosel.title == "")
}

module.exports = {
    getAvailableUsers(req, res, next) {
        execute(`SELECT id, CONCAT(first_name, ' ' ,last_name) userName, email, created_datetime FROM user WHERE level='2'`, (getUsersError, getUsersData) => {
            if (getUsersError) {
                logger.error(getUsersError)
                next(new Error(CommonError.DATABASE_ERROR, getUsersError, 400))
            } else res.status(200).json(getUsersData);
        });
    },
    async addNewCarosel(req, res, next) {
        const newCarosel = req.body
        if (isValidCarosel(newCarosel)) {
            let id = uuidv1()
            let buildCarosel = {
                id: id,
                title: newCarosel.title,
                caption: newCarosel.caption,
                status: '1',
                is_removed: '0'
            }
            try {
                /*  let getCount = await executeAsync(`SELECT COUNT(*) AS count FROM carosel`)
                 if (getCount[0].count <= 9) { */
                if (req.files !== null && typeof req.files.thumbnail !== "undefined") {
                    let caroselImage = {}
                    caroselImage['image'] = Buffer.from(req.files.thumbnail.data).toString("base64")
                    caroselImage['imageName'] = id
                    let image_url = await fileUploadClient.uploadOne(caroselImage, `carosel/${id}`)
                    buildCarosel.image_url = `${env.FILE_BASE_URL}${image_url.url}`
                }
                const caroselInsertQ = `INSERT INTO carosel SET ? `
                await executeWithDataAsync(caroselInsertQ, buildCarosel)
                res.status(200).json({ caroselInserteDone: true })
                // } else next(new Error(CommonError.INVALID_REQUEST, 'Stack overflowed', 400))
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        } else next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
    },

    async updateCarosel(req, res, next) {
        const newCarosel = req.body
        if (isValidCarosel(newCarosel)) {
            let buildCarosel = {
                title: newCarosel.title,
                caption: newCarosel.caption,
                status: newCarosel.status,
            }
            try {
                if (typeof req.params.caroselId != 'undefined' || req.params.caroselId !== "") {
                    if (req.files !== null && typeof req.files.thumbnail !== "undefined") {
                        let caroselImage = {}
                        caroselImage['image'] = Buffer.from(req.files.thumbnail.data).toString("base64")
                        caroselImage['imageName'] = req.params.caroselId
                        let image_url = await fileUploadClient.uploadOne(caroselImage, `carosel/${req.params.caroselId}`)
                        buildCarosel.image_url = `${env.FILE_BASE_URL}${image_url.url}`
                    }
                }
                const caroselUpdateQ = `UPDATE carosel SET ? WHERE id = '${req.params.caroselId}'`
                await executeWithDataAsync(caroselUpdateQ, buildCarosel)
                res.status(200).json({ caroselUpdateDone: true })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        } else next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
    },

    async deleteCarosel(req, res, next) {
        try {
            await executeAsync(`UPDATE carosel SET is_removed='1' WHERE id = '${req.params.caroselId}'`)
            res.status(200).json({ caroselDeleteDone: true })
        } catch (error) {
            if (typeof req.query.index !== 'string' || req.query.index == "") next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async getAllCarosel(req, res, next) {
        try {
            let getCarosel = await executeAsync(`SELECT * FROM carosel WHERE is_removed='0'`)
            res.status(200).json(getCarosel)
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async getAllCaroselUser(req, res, next) {
        try {
            let getCarosel = await executeAsync(`SELECT * FROM carosel WHERE is_removed='0' AND status='1'`)
            res.status(200).json(getCarosel)
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async getCaroselById(req, res, next) {
        try {
            let getCarosel = await executeAsync(`SELECT * FROM carosel WHERE id='${req.params.caroselId}'`)
            res.status(200).json(getCarosel)
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },
    async createNewPost(req, res, next) {
        //let newPost = 
        if (typeof req.body.post === 'undefined' || req.body.post == "" || typeof req.body.title === 'undefined' || req.body.title == "") next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
        else {
            let id = uuidv1()
            let buildPost = {
                id: id,
                post: req.body.post,
                title: req.body.title,
                createdDate: new Date().getTime(),
                createdBy: req.userId,
                isActive: 1,
                isDeleted: 0
            }
            try {
                if (req.files !== null && typeof req.files.thumbnail !== "undefined") {
                    let postImage = {}
                    postImage['image'] = Buffer.from(req.files.thumbnail.data).toString("base64")
                    postImage['imageName'] = id
                    let imageUrl = await fileUploadClient.uploadOne(postImage, `post_with_image/${id}`)
                    buildPost.imageUrl = `${env.FILE_BASE_URL}${imageUrl.url}`
                }
                await executeWithDataAsync(`INSERT INTO posts SET ?`, buildPost)
                res.status(200).json({ postCreated: true })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },
    async addImageToPost(req, res, next) {
        let id = uuidv1()
        let newPostImage = {
            id: id,
            addedBy: req.userId,
            isActive: 1,
            isRemoved: 0
        }
        try {
            if (req.files !== null && typeof req.files.thumbnail !== "undefined") {
                let postImage = {}
                postImage['image'] = Buffer.from(req.files.thumbnail.data).toString("base64")
                postImage['imageName'] = id
                let imageUrl = await fileUploadClient.uploadOne(postImage, `post_image/${id}`)
                newPostImage.imageUrl = `${env.FILE_BASE_URL}${imageUrl.url}`
            }
            await executeWithDataAsync(`INSERT INTO post_images SET ?`, newPostImage)
            res.status(200).json(newPostImage.imageUrl)
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },
    async updatePostById(req, res, next) {
        if (typeof req.params.postId === 'undefined' || req.params.postId == "") next(new Error(CommonError.INVALID_REQUEST, "Post Id Required", 400))
        else if (typeof req.body.post === 'undefined' || req.body.post == "" || typeof req.body.title === 'undefined' || req.body.title == "") next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
        else {
            let updatePost = {
                post: req.body.post,
                title: req.body.title,
                lastUpdateDate: new Date().getTime(),
                lastUpdateBy: req.userId
            }
            try {
                await executeWithDataAsync(`UPDATE posts SET ? WHERE id='${req.params.postId}'`, updatePost)
                res.status(200).json({ postUpdated: true })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },
    async deletePostById(req, res, next) {
        if (typeof req.params.postId === 'undefined' || req.params.postId == "") next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
        else {
            try {
                await executeAsync(`UPDATE posts SET isDeleted='1' WHERE id='${req.params.postId}'`)
                res.status(200).json({ postDeleted: true })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },
    async getAllPosts(req, res, next) {
        try {
            let result = await executeAsync(`SELECT * FROM posts WHERE isActive='1' AND isDeleted='0'`)
            result = result.map(r=>({
                ...r,
                metaPost: r.post.replace(/<img .*?>/g,"").substring(0,150)
            }))
            let firstPost = result.shift()
            res.render("articles",{data: result , firstPost})
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },
    async getPostById(req, res, next) {
        if (typeof req.params.postId === 'undefined' || req.params.postId == "") next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
        else {
            try {
                let result = await executeAsync(`SELECT * FROM posts WHERE id='${req.params.postId}' AND isActive='1' AND isDeleted='0'`)
                res.render("article",{data: result[0]})
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },

    async getAllPostApi(req,res,next){
        try {
            let result = await executeAsync(`SELECT * FROM posts WHERE isActive='1' AND isDeleted='0'`)
            res.send({
                data: result
            })
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },
    async getPostByIdApi(req, res, next) {
        if (typeof req.params.postId === 'undefined' || req.params.postId == "") next(new Error(CommonError.INVALID_REQUEST, CaroselError.REQUIRED_FIELDS_EMPTY, 400))
        else {
            try {
                let result = await executeAsync(`SELECT * FROM posts WHERE id='${req.params.postId}' AND isActive='1' AND isDeleted='0'`)
                if(result.length > 0){
                    res.send(result[0])
                }else{
                    next(new Error(CommonError.PAGE_NOT_FOUND,"No Posts",404))
                }
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },
}