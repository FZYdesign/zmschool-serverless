const Router = require("koa-router");
const router = new Router();

const request = require('request');

/**
 * 小程序登录
 * code2Session
 */
router.post("/jscode2session", async (ctx) => {
    const { request } = ctx;
    const { header } = request;
    const { code } = request.body;
    try {
        const result = await jscode2session(code);
        ctx.body = result;
    } catch (error) {
        ctx.body = error;
    }
});

/**
* 获取用户openid
* @param {*} code 
* @returns 
*/
let jscode2session = async (code) => {
    return new Promise((resolve, reject) => {
        let url = 'https://api.weixin.qq.com/sns/jscode2session';
        request({
            url: url,
            method: 'GET',   //请求方式
            timeout: 10000,   // 设置超时
            qs: {
                grant_type: 'authorization_code',
                appid: 'wxd2c88695f98243fa',
                secret: 'ddc534e6c2682961ba25fccb522a3361',
                js_code:code
            }
        }, function (error, response) {
            if (response) {
                console.log('jscode2session接口返回内容', response.body)
                resolve(JSON.parse(response.body));
            }
            if (error) {
                reject(error)
            }
        })
    })
};

module.exports = router;