const express = require("express")
const Authorize = require("./interceptors/authorize")
const { UserRole } = require('./utils/constants');

const RootRouter = express.Router()

const ItemRouter = express.Router()
const ItemService = require("./services/items");
const { CommonError } = require("./utils/error");

ItemRouter.post("/add-to-cart",Authorize([UserRole.all.code]),ItemService.addToCart)
ItemRouter.delete("/remove-from-cart/:id",Authorize([UserRole.all.code]),ItemService.removeFormCart)
ItemRouter.get("/cart-count",Authorize([UserRole.all.code]),ItemService.getCartCount)
RootRouter.use("/item",ItemRouter)

const PurchaiseRouter = express.Router()
const PurchaiseService = require("./services/purchase")
PurchaiseRouter.get("/methods",PurchaiseService.getPaymentMethods)
PurchaiseRouter.post("/stripe",Authorize([UserRole.all.code]),PurchaiseService.stripeCheckout)
PurchaiseRouter.post("/config/stripe",Authorize([UserRole.admin.code]),PurchaiseService.stripeIntegrate)
PurchaiseRouter.get("/config/methods",Authorize([UserRole.admin.code]),PurchaiseService.getPaymentMethods)
PurchaiseRouter.get("/config/methods/:id",Authorize([UserRole.admin.code]),PurchaiseService.getPaymentMethodById)
RootRouter.use("/purchaise",PurchaiseRouter)

const ArticleRouter = express.Router()
const ArticleService = require("./services/admin")
ArticleRouter.get("/",Authorize([UserRole.admin.code]),ArticleService.getAllPostApi)
ArticleRouter.get("/:postId",Authorize([UserRole.admin.code]),ArticleService.getPostByIdApi)
RootRouter.use("/articles",ArticleRouter)

RootRouter.all('/**', (req, res) => {
    res.status(404).json(CommonError.PAGE_NOT_FOUND);
});// page not found

module.exports = express.Router().use("/api",RootRouter)