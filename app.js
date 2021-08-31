require("dotenv").config({ path: `${process.env.NODE_ENV}.env` })
const http = require("http")
const express = require("express");
const exphbs = require("express-handlebars");
const path = require('path')
const cookieParser = require("cookie-parser")
const fileUpload = require("express-fileupload")
const logger = require('./utils/logger')
const currencyFind = require("./interceptors/getCountry")
const env = process.env

const app = express();

const httpServer = http.createServer(app)

app.engine(
  "hbs",
  exphbs({
    layoutsDir: __dirname + "/views/layouts",
    extname: "hbs",
    defaultLayout: "main",
    partialsDir: __dirname + "/views/partials/",
  })
);

require('./utils/mysql').Client.connect(conErr => {
  if(conErr) logger.error(conErr)
})

require("./utils/redis").Client.start()

httpServer.listen(env.APP_SERVER_PORT, () =>
    logger.info(
        `(${env.APP_NAME}) started on ${env.APP_SERVER_PORT} and ${env.APP_RUNNING_PROFILE} environment!`
    )
)
app.use(express.static(path.join(__dirname, 'public')))

app.set("view engine", "hbs");
app.use(cookieParser())
app.use(fileUpload())
app.use(express.json())
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, OPTIONS, DELETE");
  res.header("Access-Control-Max-Age", 86400);
  next();
}); 
app.use(currencyFind)

app.use(require('./router.api'))
app.use(require('./router'))
app.use((err, req, res, next) => {
    if (typeof err.error === "object" && typeof err.error.message === "string" && typeof err.error.code === "string") {
        err.message = err.error.message;
        err.error = err.error.code;
    } else {
        err.message = err.error;
        err.error = "UNEXPECTED_ERROR";
    }
    logger.debug(`Responsed Error '${err.message}'`);
    const statusCode = err.statusCode || 500;
    delete err.statusCode;
    return res.status(statusCode).json(err);
});