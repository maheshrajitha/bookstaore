const { v1: uuidv1 } = require("uuid");
const { AppError: Error, CommonError } = require('../utils/error');
const { executeAsync, executeWithData, execute, executeWithDataAsync } = require('../utils/mysql').Client;
const fileClient = require("../utils/fileupload");
const logger = require("../utils/logger");

const env = process.env
const isValidCategory = (category) => {
    return !(typeof category.category_name != "string" || category.category_name == "")
}

const CategoryError = {
    FAILED_TO_SAVE_CATEGORY: { message: "failed to save category", code: "FAILED_TO_SAVE_CATEGORY" },
    FAILED_TO_UPDATE_CATEGORY: { message: "failed to update category", code: "FAILED_TO_UPDATE_CATEGORY" },
    REQUIRED_FIELDS_EMPTY: { message: "Required Fields Empty", code: "REQUIRED_FIELDS_EMPTY" },
}



module.exports = {
    async create(req, res, next) {
        const newCategory = req.body
        if (isValidCategory(newCategory)) {
            let id = uuidv1();
            const buildedCategory = {
                id: id,
                category_name: newCategory.category_name,
                created_datetime: new Date().getTime(),
                is_removed: 0,
                slug: newCategory.category_name.replace(" ", "-").toLowerCase()
            }
            try {
                if (req.files !== null && typeof req.files.thumbnail !== "undefined") {
                    let categoryImage = {}
                    categoryImage['image'] = Buffer.from(req.files.thumbnail.data).toString("base64")
                    categoryImage['imageName'] = id
                    let imege_url = await fileClient.uploadOne(categoryImage, `category/${id}`)
                    buildedCategory.image_url = `${env.FILE_BASE_URL}${imege_url.url}`
                }
                const categoryInsertQuery = `INSERT INTO category SET ?`;
                await executeWithDataAsync(categoryInsertQuery, buildedCategory)
                delete buildedCategory.is_removed
                res.status(200).json(buildedCategory)
            } catch (error) {
                next(new Error(CommonError.DATABASE_ERROR, error, 500))
            }
        } else next(new Error(CategoryError.REQUIRED_FIELDS_EMPTY, undefined, 400))
    },

    async getAll(req, res, next) {
        const getAllQuery = " SELECT id AS value,category_name AS label, category.* FROM category WHERE is_removed=0";

        try {
            let result = await executeAsync(getAllQuery)
            res.status(200).json(result);
        } catch (error) {
            next(new Error(CommonError.DATABASE_ERROR, error, 400))
        }
    },

    async getById(req, res, next) {
        try {
            let data = await executeAsync(`SELECT id as Id, category_name as categoryName, image_url FROM category WHERE is_removed=0 and id = '${req.params.categoryId}'`)
            res.status(200).json(data);
        } catch (error) {
            next(new Error(CommonError.DATABASE_ERROR, error, 400))
        }
    },

    async editCatagory(req, res, next) {
        const updateCategory = req.body
        if (isValidCategory(updateCategory)) {
            try {
                let category = {
                    category_name: updateCategory.category_name,
                    last_updated_datetime: new Date().getTime()
                }
                // let updateQuery = await executeAsync(`UPDATE category SET 
                //                                 category_name = '${updateCategory.category_name}',
                //                                 last_updated_datetime = '${new Date().getTime()}' 
                //                             WHERE id = '${req.params.categoryId}' and is_removed = 0`);
                if (req.files !== null && typeof req.files.thumbnail !== "undefined") {
                    let categoryImage = {}
                    categoryImage['image'] = Buffer.from(req.files.thumbnail.data).toString("base64")
                    categoryImage['imageName'] = req.params.categoryId
                    let imege_url = await fileClient.uploadOne(categoryImage, `category/${req.params.categoryId}`)
                    category.image_url = `${env.FILE_BASE_URL}${imege_url.url}`
                }
                let updateQuery = await executeWithDataAsync(`UPDATE category SET ? WHERE id='${req.params.categoryId}'`, category)
                if (updateQuery.affectedRows === 1) {
                    res.status(200).json(updateCategory);
                } else {
                    next(new Error(CommonError.INVALID_REQUEST, "Category does not exist", 400))
                }

            } catch (error) {
                next(new Error(CommonError.DATABASE_ERROR, error, 400))
            }

        } else next(new Error(CategoryError.REQUIRED_FIELDS_EMPTY, undefined, 400))

    },

    async deleteCategory(req, res, next) {
        try {
            let updateQuery = await executeAsync(`UPDATE category SET 
                                            is_removed = '${req.body.is_removed}',
                                            last_updated_datetime = '${new Date().getTime()}' 
                                        WHERE id = '${req.params.categoryId}'`);

            res.status(200).json("Deteted true");
        } catch (error) {
            next(new Error(CommonError.DATABASE_ERROR, error, 400))
        }
    },

    async getItemByCategory(req, res, next) {
        let filter = ''
        if (typeof req.query.gender != 'undefined') {
            filter += `AND item.gender='${req.query.gender}' `
        }
        if (typeof req.query.color != 'undefined') {
            filter += `AND item_size.color_name='${req.query.color}' `
        }
        try {
            let updateQuery = await executeAsync(`SELECT DISTINCT '${req.currency}' AS currency,ROUND(${req.rate}* price,2) AS convertedPrice,item.*, item_size.price FROM item JOIN category ON category_id=category.id LEFT JOIN item_size ON item.id=item_size.item_id WHERE item.status='1' AND item.is_removed='0' AND category.slug = '${req.params.slug}' ${filter} ORDER BY item_size.price ${(typeof req.query.price === 'undefined') ? 'DESC, item_size.price ASC' : req.query.price}`)
            let addedDate = []
            let result = []
            for (let item of updateQuery) {
                if (!addedDate.includes(item.id)) {
                    result.push(item)
                    addedDate.push(item.id)
                }
            }
            res.render("category", { data: result, name: req.params.slug });
            // res.status(200).json(updateQuery)
        } catch (error) {
            logger.error(error)
            next(new Error(CommonError.INVALID_REQUEST, CommonError.INTERNAL_SERVER_ERROR, 500))
        }
    }


}
