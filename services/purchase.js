const { AppError: Error, CommonError } = require('../utils/error');
const logger = require('../utils/logger');
const { execute, executeWithData, executeAsync  , executeWithDataAsync} = require('../utils/mysql').Client;
const { v1: uuidv1 } = require("uuid")
const Stripe = require("stripe")

const PurchaiseErrorModels = {
    PAYMENT_METHOD_NOT_CONFIGURED:{
        message:"Payment Methods Not Configured Yet",
        code:"PAYMENT_METHOD_NOT_CONFIGURED"
    },
    THIS_ITEM_NOT_FOUND:{
        message:"This Item Not Found in our store",
        code:"THIS_ITEM_NOT_FOUND"
    },
    PAYMENT_FAILED:{
        message:"Payment Failed",
        code:"PAYMENT_FAILED"
    },
    PAYMENT_METHOD_SAVING_FAILED:{
        message:"Payment Method Saving Failed",
        code:"PAYMENT_METHOD_SAVING_FAILED"
    },
    INVALID_PAYMENT_METHOD_DETAILS:{
        message:"Invalid Payment Method Data",
        code:"INVALID_PAYMENT_METHOD_DETAILS"
    },
    PAYMENT_METHOD_NOT_FOUND:{
        message:"Payment Method Not Found",
        code:"PAYMENT_METHOD_NOT_FOUND"
    }
}

let generatepurchase = (item , userId)=>{
    let purchase = []
    for(let i=0 ; i<item.length ; i++){
        purchase.push(
            [
                uuidv1(),
                userId,
                item[i].id,
                new Date().getTime(),
                item[i].price * item[i].qty,
                item[i].qty
            ]
        )
    }
    return purchase
}

module.exports = {
    purchaseAnItem(req, res, next) {
        if (typeof req.userId === 'undefined' || req.userId == '' || typeof req.body.item === 'undefined' || req.body.item == '') next(new Error(CommonError.INVALID_REQUEST, 'User Id Or Item Id Missing', 400));
        else {
            let buildPurchase = generatepurchase(req.body.item, req.userId,); 
            executeWithData(`INSERT INTO purchase (id,user_id,item_id,purchase_date, total, quantity) VALUES ?`, [buildPurchase], (purchaseItemError, purchaseItemDone) => {
                if (purchaseItemError) {
                    logger.error(purchaseItemError);
                    next(new Error(CommonError.DATABASE_ERROR, purchaseItemError, 400));
                } else res.status(200).json(purchaseItemDone);
            });
        }
    },

    getAllPurchaseItems(req, res, next) {
        execute(`SELECT * FROM purchase`, (getPurchaseItemsError, getPurchaseItemsData) => {
            if (getPurchaseItemsError) {
                logger.error(getPurchaseItemsError);
                next(new Error(CommonError.DATABASE_ERROR, getPurchaseItemsError, 400));
            } else res.status(200).json(getPurchaseItemsData);
        });
    },

    async getPaymentMethods(req,res,next){
        try {
            let paymentMetods = await executeAsync(`SELECT id,gateway_name FROM payment_methods WHERE status=1 AND is_removed=false`)
            if(paymentMetods.length > 0 ){
                res.send(paymentMetods)
            }else next(new Error(PurchaiseErrorModels.PAYMENT_METHOD_NOT_CONFIGURED, "Payment Methods Not FOund", 404));
        } catch (error) {
            next(new Error(CommonError.DATABASE_ERROR, error, 500));
        }
    },

    async stripeCheckout(req,res,next){
        try {
            let gateWay = await executeAsync(`SELECT * FROM payment_methods WHERE id='${req.body.gatewayId}' AND is_removed=false AND status=1;SELECT '${req.currency}' AS currency , ROUND(price*${req.rate},2) AS convertedPrice,item_size.* FROM item_size WHERE item_id='${req.body.itemId}' AND is_removed=0 AND id='${req.body.sizeId}' AND quantity >='${req.body.qty}';SELECT id,name FROM item WHERE id='${req.body.itemId}' AND is_removed=0 AND status=1`)
            if(gateWay.length > 0 && gateWay[0].length > 0 && gateWay[1].length > 0 && gateWay.length > 0 && !isNaN(req.body.qty)){
                let stripe = Stripe(gateWay[0][0].private_key)
                let session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [ //should assign the values dynamically. values should pass from the frontend
                      {
                        price_data: {
                          currency:gateWay[1][0].currency === "LKR"? "lkr":"usd"  ,
                          product_data: {
                            name: gateWay[2][0].name,
                          },
                          unit_amount: Math.ceil(gateWay[1][0].convertedPrice * 100),
                        },
                        quantity: req.body.qty
                      },
                    ],
                    mode: 'payment',
                    success_url: process.env.PAYMENT_SUCCESS_URI, 
                    cancel_url: process.env.PAYMENT_FAILED_URI,
                  });
                res.send({
                    redirectUri: session.url
                })
            }else{
                next(new Error(PurchaiseErrorModels.PAYMENT_FAILED, "Stripe Error Occured", 404));
            }
        } catch (error) {
            next(new Error(PurchaiseErrorModels.PAYMENT_FAILED, error, 500));
        }
    },

    paymentSuccess(req,res,next){
        res.render("success")
    },

    paymentFailed(req,res,next){
        res.render("failed")
    },

    async stripeIntegrate(req,res,next){
        if(typeof req.body.pubKey === "string" && typeof req.body.secKey === "string"){
            let stripeGateway = {
                id: uuidv1(),
                gateway_name: "Stripe",
                private_key: req.body.secKey,
                public_key: req.body.pubKey,
            }
            try {
                await executeWithDataAsync("INSERT INTO payment_methods SET ?",stripeGateway)
                res.send({
                    message:"Gateway Added Successfully"
                })
            } catch (error) {
                next(new Error(PurchaiseErrorModels.PAYMENT_METHOD_SAVING_FAILED, "Payment Method Saving Failed", 500));
            }
        }else next(new Error(PurchaiseErrorModels.INVALID_PAYMENT_METHOD_DETAILS, "Invalid Payment Method", 400));
    },

    async listPaymentMethods(req,res,next){
        try {
            let paymentMethods = await executeAsync("SELECT * FROM payment_methods WHERE status=1 AND is_removed=false")
            if(paymentMethods.length > 0){
                res.send(paymentMethods)
            }else next(new Error(PurchaiseErrorModels.PAYMENT_METHOD_NOT_CONFIGURED, "Invalid Payment Method", 404))
        } catch (error) {
            next(new Error(CommonError.DATABASE_ERROR, error, 500));
        }
    },

    async getPaymentMethodById(req ,res,next){
        try {
            let data = await executeAsync(`SELECT * FROM payment_methods WHERE id='${req.params.id}' AND is_removed=false AND status=1`)
            if(data.length > 0){
                res.send(data[0])
            }else next(new Error(PurchaiseErrorModels.PAYMENT_METHOD_NOT_FOUND, "Payment Mathod Noy Found", 404))
        } catch (error) {
            next(new Error(CommonError.DATABASE_ERROR, error, 500));
        }
    }
}