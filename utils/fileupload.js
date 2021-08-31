const FormData = require("form-data")
const axios = require("axios")
const querystring = require("querystring")
const env = process.env

let params = {
    path: 'images',
    bucket:'tigereye',
    key: env.FILE_UPLOAD_API_KEY
}

module.exports={
    async uploadMultiple(file , fileName){
        if(!Array.isArray(file)){
            file = [file]
        }
        try{
            let data = {}
            file.forEach((f,index)=>{
                data[`image${index}`] = Buffer.from(f.data).toString("base64")
                data[`imageName${index}`] = `${fileName}${index}`
            })

            data['path']=`${params.bucket}/${params.path}/${fileName}`
            
            let req = await axios.default.post(env.FILE_UPLOAD_URL,querystring.stringify(data),{
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization':params.key
                }
            })
            return req.data
        }catch(error){
            throw error
        }
    },

    async upload(file , fileName){
        try{
            let data =file
            data['path']=`${params.bucket}/${params.path}/${fileName}`
            
            let req = await axios.default.post(env.FILE_UPLOAD_URL,querystring.stringify(data),{
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization':params.key
                }
            })
            return req.data
        }catch(error){
            throw error
        }
    },
    async deleteFile(fileName , path){
        try{
            let data = {
                path: `${params.bucket}/${params.path}/${path}/${fileName}`
            }
            console.log(data.path)
            let response = await axios.default.post(`${env.FILE_UPLOAD_URL}delete.php/`,querystring.stringify(data),{
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization':params.key
                }
            })
            console.log(response.data)
            return response.data
        }catch(error){
            //console.log(error.data)
            throw error
        }
    },
    async uploadOne(file , fileName){
        try{
            let data =file
            data['path']=`${params.bucket}/${params.path}/${fileName}`
            
            let req = await axios.default.post(`${env.FILE_UPLOAD_URL}upload-one.php/`,querystring.stringify(data),{
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization':params.key
                }
            })
            return req.data
        }catch(error){
            throw error
        }
    }
}