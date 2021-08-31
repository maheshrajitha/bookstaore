const uuidV1 = require("uuid").v1;
const uuidV4 = require("uuid").v4
const { executeWithDataAsync, executeAsync, executeWithData } = require("../utils/mysql").Client
const fileUploadClient = require("../utils/fileupload")
const { AppError: Error, CommonError } = require('../utils/error')
const logger = require('../utils/logger')
const mysql = require("mysql")
const env = process.env

function isValiedItem(itemData) {
    return (itemData.name == ""
        || typeof itemData.name == "undefined"
        || itemData.gender == ""
        // || itemData.categoryId == ""
        // || typeof itemData.categoryId == "undefined"
        // || itemData.price == ""
        // || typeof itemData.price == "undefined"
        || itemData.size === ""
        || typeof itemData.size === "undefined"
        // || itemData.color === ""
        // || typeof itemData.color === "undefined"
        //|| itemData.itemId == ""
        //|| typeof itemData.itemId === "undefined"
    )
}

function generateColorsArray(color, itemId) {
    let colors = []
    let colorRequest = JSON.parse(color)
    colorRequest.forEach(color => {
        colors.push([
            uuidV1(),
            color.hex,
            color.color,
            itemId
        ])
    })
    return colors
}

function generateSizeArray(size, itemId) {
    let sizes = JSON.parse(size)
    let sizesArray = []
    sizes.forEach(size => {
        sizesArray.push([
            uuidV1(),
            itemId,
            size.size,
            size.quantity,
            size.price,
            size.hex,
            size.color
        ])
    })

    return sizesArray
}

function arrangeFilesForUploading(files, imageName) {
    let imageArray = []
    if (files !== null) {
        for (let i = 0; i < 5; i++) {
            if (typeof files[`image${i}`] !== "undefined") {
                imageArray[`image${i}`] = Buffer.from(files[`image${i}`].data).toString("base64")
                imageArray[`imageName${i}`] = `${imageName}`
            }
        }
    }
    return imageArray
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

module.exports = {
    async create(req, res, next) {
        if (!isValiedItem(req.body)) {
            try {
                let item = {
                    id: uuidV1(),
                    name: req.body.name.trim().capitalize(),
                    gender: req.body.gender,
                    category_id: req.body.category,
                    created_user: req.userId,
                    created_datetime: new Date().getTime(),
                    last_update_datetime: new Date().getTime(),
                    status: '-1',
                    description: req.body.description
                }
                await executeWithDataAsync(`INSERT INTO item SET ?; INSERT INTO item_size (id,item_id,size,quantity,price,color,color_name) VALUES ? `, [item, generateSizeArray(req.body.size, item.id)])
                res.status(200).json(item)
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        } else {
            next(new Error(CommonError.INVALID_REQUEST, 'Request Data Missing', 400))
        }
    },

    async addImageToItem(req, res, next) {
        if ((req.files != null && typeof req.files.image !== "undefined") && (typeof req.body.itemId !== 'undefined' || req.body.itemId != "")) {
            if (req.body.index <= 5 && req.body.index > 0) {
                let id = uuidV1()
                let buildItemImage = {
                    id: id,
                    item_id: req.body.itemId,
                    created_datetime: new Date().getTime(),
                    last_update_datetime: new Date().getTime(),
                    created_user: req.userId,
                    status: '1',
                    img_index: req.body.index
                }
                try {
                    if (req.files !== null && typeof req.files.image !== "undefined") {
                        let itemImage = {}
                        itemImage['image'] = Buffer.from(req.files.image.data).toString("base64")
                        itemImage['imageName'] = id
                        let image_url = await fileUploadClient.uploadOne(itemImage, `item-image/${id}`)
                        buildItemImage.image_url = `${env.FILE_BASE_URL}${image_url.url}`
                    }
                    let imageInsertQ = ''
                    if (typeof req.body.index !== "undefined" && req.body.index === '1') {
                        imageInsertQ += `UPDATE item SET thumbnail='${buildItemImage.image_url}' WHERE id='${req.body.itemId}';`
                    }
                    imageInsertQ += `INSERT INTO item_image SET ? ON DUPLICATE KEY UPDATE image_url='${buildItemImage.image_url}'; UPDATE item set status='-2' WHERE id='${req.body.itemId}'`
                    await executeWithDataAsync(imageInsertQ, buildItemImage)
                    res.status(200).json({ buildItemImage })
                } catch (error) {
                    logger.error(error)
                    next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
                }
            } else next(new Error(CommonError.INVALID_REQUEST, 'Please insert valid index', 400))
        } else next(new Error(CommonError.INVALID_REQUEST, 'Required fields empty', 400))
    },

    async prevItemById(req, res, next) {
        if (typeof req.params.itemId !== 'undefined' && req.params.itemId != "") {
            try {
                let prevQ = await executeAsync(`SELECT item.*, category.category_name FROM item LEFT JOIN category ON item.category_id=category.id WHERE item.id='${req.params.itemId}'; SELECT * FROM item_size WHERE is_removed='0' AND item_id='${req.params.itemId}'; SELECT * FROM item_image WHERE is_removed='0' AND item_id='${req.params.itemId}'`)
                res.status(200).json({ itemData: prevQ[0], itemSize: prevQ[1], itemImage: prevQ[2] })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        } else next(new Error(CommonError.INVALID_REQUEST, 'Required fields empty', 400))
    },

    async pubItemById(req, res, next) {
        if (typeof req.params.itemId !== 'undefined' && req.params.itemId != "") {
            try {
                await executeAsync(`UPDATE item SET status='1' WHERE id='${req.params.itemId}'`)
                res.status(200).json({ PublishAnItemDone: true })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        } else next(new Error(CommonError.INVALID_REQUEST, 'Required fields empty', 400))
    },

    async addThumbnailById(req, res, next) {
        if ((req.files != null && typeof req.files.image !== "undefined") && (typeof req.body.itemId !== 'undefined' || req.body.itemId != "")) {
            try {
                let thumb = {};
                if (req.files !== null && typeof req.files.image !== "undefined") {
                    let itemImage = {}
                    itemImage['image'] = Buffer.from(req.files.image.data).toString("base64")
                    itemImage['imageName'] = req.body.itemId
                    let image_url = await fileUploadClient.uploadOne(itemImage, `item-image/${req.body.itemId}`)
                    thumb.image_url = `${env.FILE_BASE_URL}${image_url.url}`
                }
                await executeAsync(`UPDATE item SET thumbnail='${thumb.image_url}' WHERE id='${req.body.itemId}'`)
                res.status(200).json({ ThumbnailAdded: true })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        } else next(new Error(CommonError.INVALID_REQUEST, 'Required fields empty', 400))
    },

    async getItemById(req, res, next) {
        if (req.params.itemId == "" || typeof req.params.itemId === "undefined") {
            next(new Error(CommonError.INVALID_REQUEST, "Item ID Missing", 400))
        } else {
            try {
                let item = await executeAsync(`
                    SELECT * FROM item WHERE id='${req.params.itemId}' AND is_removed=0 AND status=1;
                    SELECT * FROM item_image WHERE item_id='${req.params.itemId}' AND is_removed=0 ORDER BY image_url;
                    SELECT '${req.currency}' AS currency , ROUND(price*${req.rate},2) AS convertedPrice,item_size.* FROM item_size WHERE item_id='${req.params.itemId}' AND is_removed=0
                `)
                if (item.length > 0) {
                    res.render("product", {
                        data: {
                            item: item[0][0],
                            itemImage: item[1],
                            itemSize: item[2]
                        }
                    });
                } else {
                    next(new Error(CommonError.PAGE_NOT_FOUND, 'Item Not Found', 404))
                }
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        }
    },

    async getItemByIdApi(req, res, next) {
        if (req.params.itemId == "" || typeof req.params.itemId === "undefined") {
            next(new Error(CommonError.INVALID_REQUEST, "Item ID Missing", 400))
        } else {
            try {
                let item = await executeAsync(`
                    SELECT * FROM item WHERE id='${req.params.itemId}' AND is_removed=0 AND status=1;
                    SELECT * FROM item_image WHERE item_id='${req.params.itemId}' AND is_removed=0 ORDER BY image_url;
                    SELECT * FROM item_size WHERE item_id='${req.params.itemId}' AND is_removed=0
                `)
                if (item.length > 0) {


                    res.send({
                        item: item[0][0],
                        itemImage: item[1],
                        itemSize: item[2]
                    });
                } else {
                    next(new Error(CommonError.PAGE_NOT_FOUND, 'Item Not Found', 404043))
                }
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        }
    },

    async getAllItems(req, res, next) {
        //const size = (typeof req.query.size != 'undefined') ? parseInt(req.query.size) : 100;
        const page = (typeof req.query.page != 'undefined') ? parseInt(req.query.page) : 1;
        try {
            console.log(`SELECT * FROM item WHERE is_removed=0 AND status=1 LIMIT ${(page - 1) * 10},10`);
            let itemList = await executeAsync(`SELECT * FROM item WHERE is_removed=0 AND status=1 LIMIT ${(page - 1) * 10},10`)
            if (itemList.length > 0)
                res.send(itemList)
            else
                next(new Error(CommonError.PAGE_NOT_FOUND, "Empty Items", 404))
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.DATABASE_ERROR, error, 500))
        }
    },

    async editItem(req, res, next) {
        if (!isValiedItem(req.body)) {
            try {
                let item = {
                    name: req.body.name.trim().capitalize(),
                    gender: req.body.gender,
                    category_id: req.body.category,
                    last_update_datetime: new Date().getTime(),
                    status: req.body.status,
                    description: req.body.description
                }
                let sizesList = JSON.parse(req.body.size)
                let sizeListUpdateQuery = ""
                sizesList.forEach(size => {
                    if (typeof size.id !== "undefined")
                        sizeListUpdateQuery += `UPDATE item_size SET size='${size.size}', quantity='${size.quantity}', price='${size.price}', color_name='${size.color}', color='${size.hex}' WHERE id='${size.id}' ;`
                    else
                        sizeListUpdateQuery += `INSERT INTO item_size VALUES ('${uuidV1()}','${req.body.itemId}','${size.size}',0,'${size.quantity}','${size.color}','${size.hex}','${size.price}') ;`
                })
                await executeWithDataAsync(`UPDATE item SET ? WHERE id= '${req.body.itemId}';${sizeListUpdateQuery}`, item)
                res.status(200).json(item)
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        } else {
            next(new Error(CommonError.INVALID_REQUEST, 'Request Data Missing', 400))
        }
    },

    async updateItemImage(req, res, next) {
        if ((req.files != null && typeof req.files.image !== "undefined") && (typeof req.params.itemId !== 'undefined' || req.params.itemId != "")) {
            if (req.body.index <= 5 && req.body.index > 0) {
                let id = uuidV1()
                let buildItemImage = {
                    id: id,
                    item_id: req.params.itemId,
                    created_datetime: new Date().getTime(),
                    last_update_datetime: new Date().getTime(),
                    created_user: req.userId,
                    status: '1',
                    img_index: req.body.index
                }
                try {
                    if (req.files !== null && typeof req.files.image !== "undefined") {
                        let itemImage = {}
                        itemImage['image'] = Buffer.from(req.files.image.data).toString("base64")
                        itemImage['imageName'] = id
                        let image_url = await fileUploadClient.uploadOne(itemImage, `item-image/${id}`)
                        buildItemImage.image_url = `${env.FILE_BASE_URL}${image_url.url}`
                    }
                    let imageInsertQ = ''
                    if (typeof req.body.index !== "undefined" && req.body.index === '1') {
                        imageInsertQ += `UPDATE item SET thumbnail='${buildItemImage.image_url}' WHERE id='${req.params.itemId}';`
                    }
                    imageInsertQ += `INSERT INTO item_image SET ? ON DUPLICATE KEY UPDATE image_url='${buildItemImage.image_url}'`
                    await executeWithDataAsync(imageInsertQ, buildItemImage)
                    res.status(200).json({ buildItemImage })
                } catch (error) {
                    logger.error(error)
                    next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
                }
            } else next(new Error(CommonError.INVALID_REQUEST, 'Please insert valid index', 400))
        } else next(new Error(CommonError.INVALID_REQUEST, 'Required fields empty', 400))
    },

    async deleteImage(req, res, next) {
        if (typeof req.params.imageId === "undefined" || req.params.imageId === "" || req.query.itemId === null || req.query.name === null)
            next(new Error(CommonError.INVALID_REQUEST, "Item Image Id Missing", 400))
        else {
            try {
                executeAsync(`DELETE FROM item_image WHERE id='${req.params.imageId}'`)
                //await fileUploadClient.deleteFile(req.query.name,req.query.itemId)
                res.status(200).json({
                    delete: true
                })
            } catch (error) {
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        }
    },

    async deleteItem(req, res, next) {
        if (req.params.itemId === "")
            next(new Error(CommonError.INVALID_REQUEST, "Item Id Missing", 400))
        else {
            try {
                executeAsync(`UPDATE item SET is_removed=1 WHERE id='${req.params.itemId}' AND created_user='${req.userId}'`)
                res.send({
                    deleted: true
                })
            } catch (error) {
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        }
    },

    async getItemsByGender(req, res, next) {
        if (req.query.gender !== "" || typeof req.query.gender !== "undefined") {
            const page = (typeof req.query.page != 'undefined') ? parseInt(req.query.page) : 1;
            try {
                let itemList = await executeAsync(`SELECT * FROM item WHERE status=1 AND is_removed=0 AND gender=${req.query.gender} LIMIT ${(page - 1) * 10},10`)
                if (itemList.length > 0)
                    res.send(itemList)
                else
                    next(new Error(CommonError.PAGE_NOT_FOUND, "Empty Items", 404))
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        } else {
            next(new Error(CommonError.INVALID_REQUEST, 'Gender Data Missing', 400))
        }
    },

    async getItemsByUserId(req, res, next) {
        const page = (typeof req.query.page != 'undefined') ? parseInt(req.query.page) : 1;
        try {
            let itemList = await executeAsync(`SELECT * FROM item i  WHERE i.status=1 AND i.is_removed=0 AND i.created_user='${req.userId}' LIMIT ${(page - 1) * 10},10; SELECT COUNT(id) AS itemCount FROM item WHERE status=1 AND is_removed=0`)
            if (itemList.length > 0)
                res.send({
                    itemList: itemList[0],
                    count: itemList[1][0].count
                })
            else
                next(new Error(CommonError.PAGE_NOT_FOUND, "Empty Items", 404))
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.DATABASE_ERROR, error, 500))
        }
    },

    async getItemByUserIdAndItemId(req, res, next) {
        if (req.params.itemId === "") {
            next(new Error(CommonError.INVALID_REQUEST, "Item Id Invalied", 400))
        } else {
            try {
                let item = await executeAsync(`
                    SELECT * FROM item WHERE id='${req.params.itemId}' AND created_user='${req.userId}' AND is_removed=0;
                    SELECT * FROM item_image WHERE item_id='${req.params.itemId}' AND is_removed=0;
                    SELECT * FROM item_size WHERE item_id='${req.params.itemId}' AND is_removed=0
                `)

                if (item[0].length > 0) {
                    res.send({
                        item: item[0][0],
                        itemImage: item[1],
                        itemSize: item[2]
                    })
                } else
                    next(new Error(CommonError.PAGE_NOT_FOUND, "There Is No Item With This Id", 404))
            } catch (error) {
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        }
    },

    async getItemsByCategory(req, res, next) {
        if (req.params.category === "") {
            next(new Error(CommonError.INVALID_REQUEST, "Category ID Empty", 400))
        } else {
            try {
                let item = await executeAsync(`
                    SELECT * FROM item WHERE category_id='${req.params.category}'
                `)
                if (item[0].length > 0) {
                    res.send(item)
                } else
                    next(new Error(CommonError.PAGE_NOT_FOUND, "There Is No Item With This Category", 404))
            } catch (error) {
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        }
    },
    async getAllItemsByUserId(req, res, next) {
        const page = (typeof req.query.page != 'undefined') ? parseInt(req.query.page) : 1;
        try {
            let itemList = await executeAsync(`SELECT * FROM item i  WHERE i.is_removed=0 AND i.created_user='${req.userId}' LIMIT ${(page - 1) * 10},10`)
            if (itemList.length > 0)
                res.send(itemList)
            else
                next(new Error(CommonError.PAGE_NOT_FOUND, "Empty Items", 404))
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.DATABASE_ERROR, error, 500))
        }
    },

    async getItemsByFilter(req, res, next) {
        const page = (typeof req.query.page != 'undefined') ? parseInt(req.query.page) : 1;
        let filter = ''
        if (typeof req.query.gender != 'undefined') {
            filter += `AND item.gender='${req.query.gender}' `
        }
        /*  if (typeof req.query.price != 'undefined') {
             filter += `ORDER BY item.price '${req.query.price}' `
         } */
        //
        if (typeof req.query.color != 'undefined') {
            filter += `AND item_size.color_name='${req.query.color}' `
        }
        try {
            let itemQ = await executeAsync(`SELECT DISTINCT item.*, item_size.price, item_size.color_name FROM item LEFT JOIN item_size ON item.id=item_size.item_id WHERE item.status='1' AND item.is_removed='0' ${filter} ORDER BY item_size.price ${(typeof req.query.price === 'undefined') ? 'DESC, item_size.price ASC' : req.query.price} LIMIT ${(page - 1) * 10},10`)
            if (itemQ.length > 0)
                res.send(itemQ)
            else
                next(new Error(CommonError.PAGE_NOT_FOUND, "Empty Items", 404))
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.DATABASE_ERROR, error, 500))
        }
    },

    addToWishList(req, res, next) {
        if (typeof req.body.itemId === 'undefined' || req.body.itemId == '' || typeof req.userId === 'undefined' || req.userId == '') next(new Error(CommonError.INVALID_REQUEST, 400));
        else {
            const buildWishList = {
                id: uuidV1(),
                user_id: req.userId,
                item_id: req.body.itemId,
                status: '1',
                added_date: new Date().getTime()
            }
            executeWithData("INSERT INTO wishlist SET ?", buildWishList, (dataBaseError, saved) => {
                if (!dataBaseError)
                    res.send(buildWishList)
                else if (typeof dataBaseError.code == "string" && dataBaseError.code == "ER_DUP_ENTRY")
                    next(new Error(CommonError.INVALID_REQUEST, "Item ALready Exists", 400))
                else
                    next(new Error(CommonError.DATABASE_ERROR, dataBaseError, 500))
            })

        }
    },

    async getWishListByUserId(req, res, next) {
        if (typeof req.userId === 'undefined' || req.userId == '') next(new Error(CommonError.INVALID_REQUEST, 400));
        else {
            try {
                let wishListQ = await executeAsync(`SELECT DISTINCT item.*, item_size.price FROM item INNER JOIN wishlist ON item.id=wishlist.item_id LEFT JOIN item_size ON item.id=item_size.item_id WHERE wishlist.status='1' AND wishlist.user_id='${req.userId}'`)
                if (wishListQ.length > 0)
                    res.render("wishlist", { data: wishListQ });
                else
                    res.render("wishlist");
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },

    async getgetWishListCountByUserId(req, res, next) {
        if (typeof req.userId === 'undefined' || req.userId == '') next(new Error(CommonError.INVALID_REQUEST, 400));
        else {
            try {
                let wishListQ = await executeAsync(`SELECT COUNT(item.id) AS wishListCount FROM item INNER JOIN wishlist ON item.id=wishlist.item_id WHERE wishlist.status='1' AND wishlist.user_id='${req.userId}'`)
                if (wishListQ.length > 0) {
                    res.send(wishListQ[0])
                }
                else
                    next(new Error(CommonError.PAGE_NOT_FOUND, "Empty Items", 404))
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        }
    },

    async deleteFromWishListByItemId(req, res, next) {
        if (typeof req.userId === 'undefined' || req.userId == '' || typeof req.params.itemId === 'undefined' || req.params.itemId == '') next(new Error(CommonError.INVALID_REQUEST, 400))
        else {
            try {
                let wishListQ = await executeAsync(`DELETE FROM wishlist WHERE user_id='${req.userId}' AND item_id='${req.params.itemId}'`)
                res.status(200).json({
                    delete: true
                })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },

    async getAllColors(req, res, next) {
        try {
            let colorQ = await executeAsync(`SELECT DISTINCT color_name, color FROM item_size`)
            res.send(colorQ)
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async getNewArrival(req, res, next) {
        try {
            let arrivalQ = await executeAsync(`SELECT '${req.currency}' AS currency , item.*, item_size.price,ROUND(${req.rate}* item_size.price,2) AS convertedPrice FROM item LEFT JOIN item_size ON item.id=item_size.item_id WHERE item.status='1'AND item.is_removed='0' ORDER BY item.created_datetime DESC LIMIT 10`)
            let addedDate = []
            let result = []
            for (let item of arrivalQ) {
                if (!addedDate.includes(item.id)) {
                    result.push(item)
                    addedDate.push(item.id)
                }
            }
            res.render('newarivals', { data: result })
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async homeGetNewArrival(req, res, next) {
        try {
            let arrivalQ = await executeAsync(`SELECT '${req.currency}' AS currency,ROUND(${req.rate}* price,2) AS convertedPrice,item.*, item_size.price FROM item LEFT JOIN item_size ON item.id=item_size.item_id WHERE item.status='1'AND item.is_removed='0' ORDER BY item.created_datetime DESC LIMIT 10; SELECT * FROM carosel WHERE status='1' AND is_removed='0'`)
            let addedDate = []
            let result = []
            for (let item of arrivalQ[0]) {
                if (!addedDate.includes(item.id)) {
                    result.push(item)
                    addedDate.push(item.id)
                }

            }
            res.render('home', { data: result, carouselData: arrivalQ[1] })
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async deletePriceListByItemId(req, res, next) {
        if (typeof req.params.priceId === 'undefined' || req.params.priceId == '') next(new Error(CommonError.INVALID_REQUEST, 400))
        else {
            try {
                await executeAsync(`UPDATE item_size SET is_removed='1' WHERE id='${req.params.priceId}'`)
                res.status(200).json({ priceListDeleted: true })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }

    },

    async addToCart(req,res,next){
        if (typeof req.body.size === 'undefined' || req.body.size == '' || typeof req.body.itemId === 'undefined' || req.body.itemId == '' || typeof req.userId === 'undefined' || req.userId == '') next(new Error(CommonError.INVALID_REQUEST, 400));
        else{
            try {
                let cartItem={
                    id: uuidV1(),
                    item_id: req.body.itemId,
                    user_id: req.userId,
                    qty: 1,
                    added_date: new Date().getTime(),
                    size: req.body.size
                }
                await executeWithDataAsync(`INSERT INTO cart SET ? ON DUPLICATE KEY UPDATE qty=qty+1,status=1`,cartItem)
                res.send({
                    message:"Item Added To Cart"
                })
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },
    async getCartItems(req, res, next) {
        if (typeof req.userId === 'undefined' || req.userId == '') next(new Error(CommonError.INVALID_REQUEST, 400));
        else {
            try {
                // console.log(`SELECT DISTINCT '${req.currency}' AS currency,(price * qty) AS total, ((price * qty) * ${req.rate}) AS convertedTotal item.*, item_size.price,cart.* FROM item INNER JOIN cart ON item.id=cart.item_id JOIN item_size ON cart.size=item_size.id WHERE cart.status='1' AND cart.user_id='${req.userId}' AND item.status=1`);
                let wishListQ = await executeAsync(`SELECT DISTINCT '${req.currency}' AS currency,(price * qty) AS total, ((price * qty) * ${req.rate}) AS convertedTotal, item.*, item_size.price,item_size.size AS itemSize,cart.* FROM item INNER JOIN cart ON item.id=cart.item_id JOIN item_size ON cart.size=item_size.id WHERE cart.status='1' AND cart.user_id='${req.userId}' AND item.status=1`)
                let cartTotal = {
                    convertedCartTotal: 0
                }
                wishListQ.forEach(item=>{
                    cartTotal.convertedCartTotal = cartTotal.convertedCartTotal + item.convertedTotal
                })
                if (wishListQ.length > 0)
                    res.render("cart", { data: wishListQ , cartData:{
                        ...cartTotal,
                        currency: req.currency
                    } });
                else
                    res.render("cart");
            } catch (error) {
                logger.error(error)
                next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
            }
        }
    },

    async removeFormCart(req,res,next){
        try {
            await executeAsync(`UPDATE cart SET status=0 WHERE id='${req.params.id}'`)
            res.send({
                message:"Remove From Cart"
            })
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async getCartCount(req,res,next){
        try {
            let count = await executeAsync(`SELECT COUNT(user_id) AS count FROM cart WHERE status=1 AND user_id='${req.userId}'`)
            res.send({
                count: count[0].count
            })
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    },

    async setCurrency(req,res,next){
        if(req.query.cur === "lkr"){
            res.cookie("_currency","LKR",{
                maxAge: env.REFRESH_SESSION_TIMEOUT,
                httpOnly: false,
            })
            res.redirect(302,"/")
        }else if(req.query.cur === "usd"){
            res.cookie("_currency","USD",{
                maxAge: env.REFRESH_SESSION_TIMEOUT,
                httpOnly: false,
            })
            res.redirect(302,"/")
        }else{
            res.redirect(302,"/")
        }
    }
}