const express = require("express");
const Authorize = require('./interceptors/authorize');
const AuthorizeSoap = require('./interceptors/authorize.soap');

const { UserRole } = require('./utils/constants');
const router = express.Router();
const { CommonError } = require('./utils/error');


const ItemService = require("./services/items")
router.get("/", ItemService.homeGetNewArrival);

router.get("/cart", AuthorizeSoap([UserRole.all.code]), ItemService.getCartItems);

router.get("/about", (req, res) => {
  res.render("aboutus");
});

router.get("/contact-us", (req, res) => {
  res.render("contactus");
});

router.get("/my-profile", (req, res) => {
  res.render("profile");
});

const collectionsRoutes = express.Router();
collectionsRoutes.get("/category", (req, res) => {
  res.render("category");
});
router.use("/collectios", collectionsRoutes);


const productRoutes = express.Router();
productRoutes.get("/product_name", (req, res) => {
  res.render("product");
});
router.use("/product", productRoutes);
router.get("/currency", ItemService.setCurrency)


const UserService = require('./services/user');
const userRouts = express.Router();
userRouts.post('/sign-up', UserService.create);
userRouts.get('/me', Authorize(UserRole.all.code), UserService.getMe);
router.use('/users', userRouts)


const AuthRouter = express.Router();
const AuthService = require('./services/auth');
AuthRouter.post('/login', AuthService.login);
AuthRouter.get('/is-logged', AuthService.isLoged);
AuthRouter.delete('/logout', AuthService.logout);
//AuthRouter.post('/forget-password', AuthService.forgetPassword);
AuthRouter.get("/by-code", AuthService.getUserByRecoveryCode)
AuthRouter.post("/send-forgot-password-code", AuthService.sendPasswordToken)
AuthRouter.put("/reset-forgot-password", AuthService.updateForgetPassword)
router.use('/auth', AuthRouter);

const AdminRoutes = express.Router()
const AdminService = require('./services/admin')
AdminRoutes.post('/carosel', Authorize([UserRole.admin.code]), AdminService.addNewCarosel)
AdminRoutes.get('/get-carosel', Authorize([UserRole.admin.code]), AdminService.getAllCarosel)
AdminRoutes.put('/:caroselId', Authorize([UserRole.admin.code]), AdminService.updateCarosel)
AdminRoutes.delete('/:caroselId', Authorize([UserRole.admin.code]), AdminService.deleteCarosel)
AdminRoutes.get('/:caroselId', Authorize([UserRole.admin.code]), AdminService.getCaroselById)
AdminRoutes.get('/all/carosel', AdminService.getAllCaroselUser)
AdminRoutes.post('/post', Authorize([UserRole.admin.code]), AdminService.createNewPost)
AdminRoutes.post('/post-image', Authorize([UserRole.admin.code]), AdminService.addImageToPost)
AdminRoutes.put('/update-post/:postId', Authorize([UserRole.admin.code]), AdminService.updatePostById)
AdminRoutes.delete('/remove-post/:postId', Authorize([UserRole.admin.code]), AdminService.deletePostById)
router.use("/admin", AdminRoutes)

const UserPostRouter = express.Router()
UserPostRouter.get('/all', AdminService.getAllPosts)
UserPostRouter.get('/:postId', AdminService.getPostById)
router.use("/user-post", UserPostRouter)

const itemRoutes = express.Router()
itemRoutes.post("/", Authorize([UserRole.admin.code]), ItemService.create)
itemRoutes.put("/update", Authorize([UserRole.admin.code]), ItemService.editItem)
itemRoutes.put("/update/:itemId", Authorize([UserRole.admin.code]), ItemService.updateItemImage)
itemRoutes.delete('/delete-image/:imageId', Authorize([UserRole.admin.code]), ItemService.deleteImage)
itemRoutes.delete("/delete-item/:itemId", Authorize([UserRole.admin.code]), ItemService.deleteItem)
itemRoutes.get("/by-gender", ItemService.getItemsByGender)
itemRoutes.get("/get/:itemId", ItemService.getItemById)
itemRoutes.get("/by-user", Authorize([UserRole.admin.code]), ItemService.getItemsByUserId)
itemRoutes.get("/all", ItemService.getAllItems)
itemRoutes.get("/by-gender", ItemService.getItemsByGender)
itemRoutes.get("/by-user/all", Authorize(UserRole.admin.code), ItemService.getAllItemsByUserId)
itemRoutes.get("/get-items-by-userid-and-id/:itemId", Authorize([UserRole.admin.code]), ItemService.getItemByUserIdAndItemId)
itemRoutes.get("/get-items-by-filters", ItemService.getItemsByFilter)
itemRoutes.post("/add-to-wishlist", Authorize([UserRole.all.code]), ItemService.addToWishList)
itemRoutes.get("/get-wishlist", Authorize([UserRole.all.code]), ItemService.getWishListByUserId)
itemRoutes.get('/get-wishlist-count', Authorize([UserRole.all.code]), ItemService.getgetWishListCountByUserId)
itemRoutes.delete("/delete-wishlist-item/:itemId", Authorize([UserRole.all.code]), ItemService.deleteFromWishListByItemId)
itemRoutes.get("/get-all-colors", ItemService.getAllColors)
itemRoutes.get("/api/get/:itemId", ItemService.getItemByIdApi)
itemRoutes.get('/get-new-arrival', ItemService.getNewArrival)
itemRoutes.post('/add-image', Authorize([UserRole.admin.code]), ItemService.addImageToItem)
itemRoutes.get("/:itemId", Authorize([UserRole.admin.code]), ItemService.prevItemById)
itemRoutes.put("/:itemId", Authorize([UserRole.admin.code]), ItemService.pubItemById)
itemRoutes.delete("/delete-price-list/:priceId", Authorize([UserRole.admin.code]), ItemService.deletePriceListByItemId)
itemRoutes.put("/add-thumbnail", Authorize([UserRole.admin.code]), ItemService.addThumbnailById)
router.use("/item", itemRoutes)

const PurchaseRouter = express.Router();
const PurchaseService = require('./services/purchase');
PurchaseRouter.post('/purchase-item', Authorize([UserRole.user.code]), PurchaseService.purchaseAnItem);
PurchaseRouter.get('/all-purchased-items', Authorize([UserRole.user.code]), PurchaseService.getAllPurchaseItems);
PurchaseRouter.get("/success", PurchaseService.paymentSuccess)
PurchaseRouter.get("/failed", PurchaseService.paymentFailed)
router.use('/purchase', PurchaseRouter);

const CategoryRouter = express.Router();
const CategoryService = require('./services/category');
const authorize = require("./interceptors/authorize");
CategoryRouter.post('/create-category', CategoryService.create);
CategoryRouter.get('/all-category', CategoryService.getAll);
CategoryRouter.get('/:categoryId', CategoryService.getById);
CategoryRouter.put('/:categoryId', CategoryService.editCatagory);
CategoryRouter.put('/delete/:categoryId', CategoryService.deleteCategory);
CategoryRouter.get('/by-category/:slug', CategoryService.getItemByCategory)
router.use('/category', CategoryRouter);

const WishlistRouter = express.Router();
WishlistRouter.get("/", (req, res) => {
  res.render("wishlist");
});
router.use('/wishlist', WishlistRouter);



/** All other */
router.all('/**', (req, res) => {
  res.status(404).json(CommonError.PAGE_NOT_FOUND);
});// page not found

module.exports = router;