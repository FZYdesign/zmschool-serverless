const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Counter } = require("./db");

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");


const request = require('request')

// 首页
router.get("/", async (ctx) => {
  ctx.body = homePage;
});

// 更新计数
router.post("/api/count", async (ctx) => {
  const { request } = ctx;
  const { action } = request.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }

  ctx.body = {
    code: 0,
    data: await Counter.count(),
  };
});

// 获取计数
router.get("/api/count", async (ctx) => {
  const result = await Counter.count();

  ctx.body = {
    code: 0,
    data: result,
  };
});

// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
  if (ctx.request.headers["x-wx-source"]) {
    ctx.body = req.headers["x-wx-openid"];
  }
});

/**
 * 接收微信消息推送接口
 */
 router.get("/api/msgcall",async(ctx)=>{
  ctx.body='hello,saron';
});



 const subscribeMessage= async(msgData)=>{
  return new Promise((resolve, reject) => {
    request({
      method: 'POST',
      // url: 'http://api.weixin.qq.com/wxa/msg_sec_check?access_token=TOKEN',
      url: 'http://api.weixin.qq.com/wxa/msg_sec_check', // 这里就是少了一个token
      // url:'http://api.weixin.qq.com/cgi-bin/message/subscribe/send',
      body: JSON.stringify({
        // touser: 'olCm55e965oZA_5256GAmSp5TWts',// 可以从请求的header中直接获取 req.headers['x-wx-openid']
        // page: 'index',
        // lang: 'zh_CN',
        // data: {
        //   "thing1": {
        //     "value": msgData.thing1||"张三学生卡位置发生变化"
        //   },
        //   // "thing4": {
        //   //   "value": msgData.thing4||'深圳第一中学'
        //   // },
        //   // "date3": {
        //   //   "value": msgData.date3||'2019-11-05 00:00:00'
        //   // },
        //   "time3":{
        //     "value":"2019-11-05 00:00:00"
        //   }
        // },
        // templateId: 'Q3egK0TR8xnjPFokCjjQbkL65wLLFGuRtWSzgUPBrkk',
        // miniprogramState: 'developer'
        openid: 'olCm55e965oZA_5256GAmSp5TWts', // 可以从请求的header中直接获取 req.headers['x-wx-openid']
        version: 2,
        scene: 2,
        content: '安全检测文本'
      })
    },function (error, response) {
      console.log('接口返回内容', response.body)
      resolve(JSON.parse(response.body))
    })
  })
}
;
/**
 * 接收微信消息推送接口
 */
 router.post("/api/msgcall",async(ctx)=>{
  //  const { request } = ctx;
  //  const { action } = request.body;
   const result=await subscribeMessage();
   ctx.body=result;
  // if (ctx.request.headers["x-wx-source"]) {
  //   ctx.body=action;
  //   // ctx.body = req.headers["x-wx-openid"];
  // }
});

const app = new Koa();
app
  .use(logger())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

const port = process.env.PORT || 80;
async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}
bootstrap();
