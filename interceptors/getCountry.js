const { get } = require("axios").default
const cache = require("../utils/redis").Client
const { executeAsync } = require("../utils/mysql").Client

module.exports =  (req, res, next) => {
    let ip =req.headers['x-forwarded-for'] || req.socket.remoteAddress || null
    if(typeof req.cookies !== "undefined" && req.cookies["_currency"] ===  "LKR"){
        cache.get("lkCurrency",async (err,result)=>{
            if(err || result === null){
                try {
                    let data = await executeAsync(`SELECT * FROM currency_rates WHERE country='LK'`)
                    cache.set("lkCurrency",JSON.stringify({
                        rate: data[0].rate
                    }),(err)=>{
                        req.currency= "LKR",
                        req.rate = data[0].rate
                        next()
                    })
                } catch (error) {
                    console.log(error);
                    req.currency= "$",
                    req.rate = 1
                    next()
                }
            }else{
                let currency = JSON.parse(result)
                req.currency= "LKR",
                req.rate = currency.rate
                next()
            }
        })
    }else if(typeof req.cookies !== "undefined" && req.cookies["_currency"] ===  "USD"){
        req.currency= "$",
        req.rate = 1
        next()
    }else{
        if(ip !== null){
            get(`https://ipinfo.io/${ip}?token=${process.env.IP_INFO_KEY}`).then(async data=>{
                if(typeof data.data !== "undefined" && data.data.country === "LK" ){
                    cache.get("lkCurrency",async (err,result)=>{
                        if(err || result === null){
                            try {
                                let data = await executeAsync(`SELECT * FROM currency_rates WHERE country='LK'`)
                                cache.set("lkCurrency",JSON.stringify({
                                    rate: data[0].rate
                                }),(err)=>{
                                    req.currency= "LKR",
                                    req.rate = data[0].rate
                                    next()
                                })
                            } catch (error) {
                                console.log(error);
                                req.currency= "$",
                                req.rate = 1
                                next()
                            }
                        }else{
                            let currency = JSON.parse(result)
                            req.currency= "LKR",
                            req.rate = currency.rate
                            next()
                        }
                    })
                }else{
                    req.currency= "$",
                    req.rate = 1
                    next()
                }
            }).catch(_=>{
                req.currency= "$",
                req.rate = 1
                next()
            })
        }else{
            req.currency= "$",
            req.rate = 1
            next()
        }
    }
}