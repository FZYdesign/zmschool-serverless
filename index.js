const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Counter } = require("./db");

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");


const request = require('request');

// const cloud = require('wx-server-sdk');
// cloud.init({
//   // env: cloud.DYNAMIC_CURRENT_ENV,
//   env:'prod-9gyduzozb3779da5'
// })
router.post("/api/creatcode", async (ctx) => {
  const { request } = ctx;
  const {header} = request;
  const token = header['x-wx-cloudbase-access-token'];
  const openid=header['x-wx-openid'];
  let wxinfo={
   token:token,
   openid:openid
  }
  const { roleType,schoolId } = request.body;
  let result={roleType:roleType,schoolId:schoolId};
  try {
    //  result = await cloud.openapi.wxacode.getUnlimited({
    //     "page": 'pages/v2/index/index',
    //     "scene": 'roleType='+roleType+'&schoolId='+schoolId,
    //     "checkPath": true,
    //     "envVersion": 'release'
    //   })
    // const token = fs.readFileSync('/.tencentcloudbase/wx/cloudbase_access_token', 'utf-8');//获取容器推送的token
    let data={
      // cloudbase_access_token:token,
      page: "pages/v2/index/index",
      // scene: 'roletype='+roleType+'&schoolid='+schoolId,//最大32个可见字符，只支持数字，大小写英文以及部分特殊字符：!#$&'()*+,/:;=?@-._~，其它字符请自行编码为合法字符（因不支持%，中文无法使用 urlencode 处理，请使用其他编码方式）
      scene: 'roleType='+roleType+'&schoolId='+schoolId,
      // scene: "a=12",
      check_path: true,
      env_version: "release"
      }
    result=await creatcode(wxinfo,data);
  } catch (err) {
      result=err;
  }
  ctx.body = {
    code: 0,
    data: result,
  };
})

/**
 * 生成小程序二维码
 * @param {*} wxinfo 
 * @param {*} msgData 
 * @returns 
 */
let creatcode= async(wxinfo,msgData)=>{
  return new Promise((resolve, reject) => {
    const token = fs.readFileSync('/.tencentcloudbase/wx/cloudbase_access_token', 'utf-8');
    request({
      method: 'POST',
      url:'https://api.weixin.qq.com/wxa/getwxacodeunlimit?cloudbase_access_token='+token,
      // url:'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token='+wxinfo.token,
      body: JSON.stringify(msgData||{
        // cloudbase_access_token:token,
        page: "pages/v2/index/index",
        // scene: 'roletype='+roleType+'&schoolid='+schoolId,//最大32个可见字符，只支持数字，大小写英文以及部分特殊字符：!#$&'()*+,/:;=?@-._~，其它字符请自行编码为合法字符（因不支持%，中文无法使用 urlencode 处理，请使用其他编码方式）
        // scene: urlencode('roleType='+roleType+'&schoolId='+schoolId),
        // scene: "a=12",
        scene: 'roleType='+roleType+'&schoolId='+schoolId,
        check_path: true,
        env_version: "release"
        })
    },function (error, response) {
      if(response){
        console.log('接口返回内容', response.body)
        resolve(JSON.parse(response.body));
      }
      if(error){
        reject(error)
      }
   
    })
  })
};




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
  const { request } = ctx;
  const {header} = request;
  const token = header['x-wx-cloudbase-access-token'];
  const openid=header['x-wx-openid'];
  const wxinfo={
   token:token,
   openid:openid
  }
  try {
    const result=await subscribeMessage(wxinfo,{thing1:'张三学生卡位置发生变化'});
    // ctx.body=wxinfo;
    ctx.body=result;
   } catch (error) {
    ctx.body=error;
   }
});



 let subscribeMessage= async(wxinfo,msgData)=>{
  return new Promise((resolve, reject) => {
    request({
      method: 'POST',
      // url: 'http://api.weixin.qq.com/wxa/msg_sec_check?access_token=TOKEN',
      // url: 'http://api.weixin.qq.com/wxa/msg_sec_check', // 这里就是少了一个token
      url:'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?cloudbase_access_token='+wxinfo.token,
      
      // url:'http://api.weixin.qq.com/cgi-bin/message/custom/send',
      // body: JSON.stringify({
      //   touser: "olCm55e965oZA_5256GAmSp5TWts",
      //   msgtype: "text",
      //   text: {
      //     content: "Hello World"
      //   }
      // })

      body: JSON.stringify({
        touser: wxinfo.openid||'olCm55e965oZA_5256GAmSp5TWts',// 可以从请求的header中直接获取 req.headers['x-wx-openid']
        page: 'index',
        lang: 'zh_CN',
        data: {
          "thing1": {
            "value": msgData.thing1||"张三学生卡位置发生变化"
          },
          // "thing4": {
          //   "value": msgData.thing4||'深圳第一中学'
          // },
          // "date3": {
          //   "value": msgData.date3||'2019-11-05 00:00:00'
          // },
          "time3":{
            "value":"2019-11-05 00:00:00"
          }
        },
        template_id: "Q3egK0TR8xnjPFokCjjQbs5nKqWaFB_DrINOPmjNd08",
        miniprogram_state:"developer",//跳转小程序类型：developer为开发版；trial为体验版；formal为正式版；默认为正式版
        // openid: 'olCm55e965oZA_5256GAmSp5TWts', // 可以从请求的header中直接获取 req.headers['x-wx-openid']
        // version: 2,
        // scene: 2,
        // content: '安全检测文本'
      })
    },function (error, response) {
      if(response){
        console.log('接口返回内容', response.body)
        resolve(JSON.parse(response.body));
      }
      if(error){
        reject(error)
      }
   
    })
  })
  // try {
  //   const result = await cloud.openapi.subscribeMessage.send({
  //       "touser": 'olCm55e965oZA_5256GAmSp5TWts',
  //       "page": 'index',
  //       "lang": 'zh_CN',
  //       "data": {
  //       "thing1": {
  //         "value": msgData.thing1||"张三学生卡位置发生变化"
  //       },
  //       "time3":{
  //         "value":"2019-11-05 00:00:00"
  //       }
  //       },
  //       "templateId": 'Q3egK0TR8xnjPFokCjjQbkL65wLLFGuRtWSzgUPBrkk',
  //       "miniprogramState": 'developer'
  //     })
  //   return result
  // } catch (err) {
  //   return err
  // }
};
// subscribeMessage();
/**
 * 接收微信消息推送接口
 */
 router.post("/api/msgcall",async(ctx)=>{
   const { request } = ctx;
   const {header} = request;
   const token = header['x-wx-cloudbase-access-token'];
   const openid=header['x-wx-openid'];
   const wxinfo={
    token:token,
    openid:openid
   }
   const { action } = request.body;
   try {
    const result=await subscribeMessage(wxinfo,{thing1:'张三学生卡位置发生变化'});
    // ctx.body=wxinfo;
    ctx.body=result;
   } catch (error) {
    ctx.body=error;
   }

  // if (ctx.request.headers["x-wx-source"]) {
    // ctx.body=action;
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
