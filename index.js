const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Counter, Wxauth } = require("./db");

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");


const {isFunction,getSignature}=require('./common/utils');//
const request = require('request');


router.post("/api/creatcode", async (ctx) => {
  const { request } = ctx;
  const { header } = request;
  const token = header['x-wx-cloudbase-access-token'];
  const openid = header['x-wx-openid'];
  let wxinfo = {
    token: token,
    openid: openid
  }
  const { roleType, schoolId } = request.body;
  let result = { roleType: roleType, schoolId: schoolId };
  try {
    //  result = await cloud.openapi.wxacode.getUnlimited({
    //     "page": 'pages/v2/index/index',
    //     "scene": 'roleType='+roleType+'&schoolId='+schoolId,
    //     "checkPath": true,
    //     "envVersion": 'release'
    //   })
    // const token = fs.readFileSync('/.tencentcloudbase/wx/cloudbase_access_token', 'utf-8');//获取容器推送的token
    let data = {
      // cloudbase_access_token:token,
      page: "pages/v2/index/index",
      // scene: 'roletype='+roleType+'&schoolid='+schoolId,//最大32个可见字符，只支持数字，大小写英文以及部分特殊字符：!#$&'()*+,/:;=?@-._~，其它字符请自行编码为合法字符（因不支持%，中文无法使用 urlencode 处理，请使用其他编码方式）
      // scene: 'roleType='+roleType+'&schoolId='+schoolId,
      scene: "a=12",
      check_path: true,
      env_version: "release"
    }
    result = await creatcode(wxinfo, data, null);
  } catch (err) {
    result = err;
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
let creatcode = async (wxinfo, msgData, token) => {
  return new Promise((resolve, reject) => {
    const cloudbase_access_token = fs.readFileSync('/.tencentcloudbase/wx/cloudbase_access_token', 'utf-8');
    let url = token ? 'http://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=' + token : 'http://api.weixin.qq.com/wxa/getwxacodeunlimit?cloudbase_access_token=' + cloudbase_access_token
    request({
      method: 'POST',
      // url:'http://api.weixin.qq.com/wxa/getwxacodeunlimit',//
      url: url,
      // url: 'http://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=' + _token,
      // url:'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token='+wxinfo.token,
      body: JSON.stringify(msgData),
      timeout: 10000,
    }, function (error, response) {
      if (response) {
        console.log('接口返回内容', response.body)
        // const buffer = new Buffer(response.body, 'binary');
        let result=response.body;
        // let base64str = Buffer.from(response.body).toString('base64'); // base64编码
        // let base64str = Buffer.from(response.body,'binary').toString('base64'); // base64编码
        //返回来的二进制图片数据，需要转成base64,或者保存后，返回给前端
        // let result=new Buffer(response.body).toString('base64');
        // let buffer = Buffer.from(response.body, 'utf-8');
        // let result=buffer.toString('base64');
        // if(isBuffer(result)){
          // result=toBase64("image/jpeg",result);
        // }
        resolve(result);
        // resolve(JSON.parse(response.body));
      }
      if (error) {
        reject(error)
      }
    })
  })
};
const isBuffer=(str)=>{
  return str && typeof str === "object" && Buffer.isBuffer(str)
}
const toBase64 = (extMimeType, buffer) =>{
  return  'data:'+extMimeType||'image/jpeg'+';base64,'+buffer.toString('base64');
}

let getWxaccessToken = async () => {
  return new Promise((resolve, reject) => {
    request({
      url: 'http://api.weixin.qq.com/cgi-bin/token',//云托管要使用http,如果使用https需要配置证书
      method: 'GET',   //请求方式
      timeout: 10000,   // 设置超时
      qs: {
        grant_type: 'client_credential',
        appid: 'wx1339e1588285a2d7',
        secret: '9b0c36192d033ac6c378450d77a9245a',
      }
      // body: JSON.stringify({
      //   touser: wxinfo.openid||'olCm55e965oZA_5256GAmSp5TWts',// 可以从请求的header中直接获取 req.headers['x-wx-openid']
      // })
    }, function (error, response) {
      if (response) {
        console.log('接口返回内容', response.body)
        resolve(JSON.parse(response.body));
      }
      if (error) {
        reject(error)
      }
    })
  })
};





/**
 * 先判断数据库表是否有，有并且未过期，就直接从数据库获取，准备过期，就重新请求微信接口获取，并更新到数据库
 */
const getToken = async () => {
  let result = { saron: '333333' };
  let wxAuthInfo = [];//数据库表数据列表token实例,数组对象
  // result = await getWxaccessToken();
  try {

    wxAuthInfo = await Wxauth.findAll({
      where: {
        id: 1
      }
    });
    //先从数据库里面取数据，如果数据库没有数据，或者token即将过期，就请求腾讯接口获取更新token
    if (wxAuthInfo.length > 0 && wxAuthInfo[0].expiresin) {
      let nowTimestamp = new Date().getTime() + 600000;//当前时间+10分钟，换算成毫秒
      if (wxAuthInfo[0].expiresin > nowTimestamp) {
        //直接获取token就行
        result = {
          expiresin: wxAuthInfo[0].expiresin,
          accesstoken: wxAuthInfo[0].accesstoken
        }
      } else {
        //还有10分钟过期了，就重新获取
        result = await getWxaccessToken();
        if (result.access_token) {
          //获取token成功
          let access_token = result.access_token;//
          let timestamp = new Date().getTime() + result.expires_in * 1000;//换算成毫秒
          //  let expires_in=result.expires_in;//token有效期
          let expires_in = timestamp;//token有效期
          await wxAuthInfo[0].update({ accesstoken: access_token, expiresin: expires_in });//更新token，和token有效期
          // console.log(wxAuthInfo.toJSON()); 
          result = {
            expiresin: expires_in,
            accesstoken: access_token
          }
        } else {
          result = '微信token接口无数据返回';
        }
      }
    } else {
      result = await getWxaccessToken();
      if (result.access_token) {
        //获取token成功
        let access_token = result.access_token;//
        let timestamp = new Date().getTime() + result.expires_in * 1000;//换算成毫秒
        //  let expires_in=result.expires_in;//token有效期
        let expires_in = timestamp;//token有效期
        wxAuthInfo = await Wxauth.create({ accesstoken: access_token, expiresin: expires_in });//创建返回来的是一个对象
        // console.log(wxAuthInfo.toJSON()); 
        if (wxAuthInfo.accesstoken) {
          result = {
            expiresin: wxAuthInfo.expiresin,
            accesstoken: wxAuthInfo.accesstoken
          }
        } else {
          result = '获取不了创建token记录的数据';
        }
      } else {
        result = '微信token接口无数据返回';
      }
    }
  } catch (error) {
    result = error
  }
  return result
};

/**
 * HUA 获取token接口
 * @returns 
 */
let wechatAppGetToken= async () => {
  return new Promise((resolve, reject) => {
    let _signature=getSignature({
      appKey:'1000620'
    });//生成签名
    request({
      url: 'https://zm.annie2x.com/wechat/index.php/wechatAppGetToken',//云托管要使用http,如果使用https需要配置证书
      method: 'POST',   //请求方式
      timeout: 10000,   // 设置超时
      qs: {
        appKey: '1000620',
        signature: _signature,
      }
      // body: JSON.stringify({
      //   touser: wxinfo.openid||'olCm55e965oZA_5256GAmSp5TWts',// 可以从请求的header中直接获取 req.headers['x-wx-openid']
      // })
    }, function (error, response) {
      if (response) {
        console.log('接口返回内容', response.body)
        resolve(JSON.parse(response.body));
      }
      if (error) {
        reject(error)
      }
    })
  })
};



// 首页
router.get("/", async (ctx) => {
  ctx.body = homePage;
});

/**
 * 获取微信accesstoken
 */
router.get("/api/token", async (ctx) => {
  const { request } = ctx;
  const { header } = request;
  // const { roleType, schoolId } = request.body;
  let result = {};
  let wxAuthInfo = [];//数据库表数据列表token实例,数组对象
  try {
    result = await getToken();
    if (result.accesstoken||result.access_token) {
      let data = {
        // access_token:result.accesstoken,
        page: "pages/v2/index/index",
        // scene: 'roletype='+roleType+'&schoolid='+schoolId,//最大32个可见字符，只支持数字，大小写英文以及部分特殊字符：!#$&'()*+,/:;=?@-._~，其它字符请自行编码为合法字符（因不支持%，中文无法使用 urlencode 处理，请使用其他编码方式）
        // scene: 'roleType='+roleType+'&schoolId='+schoolId,
        scene: 'roleType=0&schoolId=7',
        check_path: true,
        env_version: "release"
      }

      result = await creatcode(null, data, result.accesstoken||result.access_token);
      // let mytoken='57_5Pa_DHJEmdk3ne_sety_wuvfCYTTSg3rPP85r569p8Tmf3CMrTbdUgLQL6xOxPW-3U2K-vZBe0UIJbWyqFmE_yWRSc69wTAMr-S2kbayxBlTJhG46xBd-6l3NoTMm-oQ3Y1xkvEkP9mftPj0SYQeAHAOUM';
      // result = await creatcode(null, data, mytoken);
      // if(result.errcode=="40001"){
      //    //token失效了，要重新通过微信获取，华哥之前的接口刷新了token，导致我们这边的token失效了。
      // }
    } 
  } catch (error) {
    result = error
  }
  //
  ctx.body = {
    code: 0,
    debugInfo: wxAuthInfo,
    data: result,
  };
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
router.get("/api/msgcall", async (ctx) => {
  const { request } = ctx;
  const { header } = request;
  const { tempData } = request.query;
  const token = header['x-wx-cloudbase-access-token'];
  const openid = header['x-wx-openid'];
  const wxinfo = {
    token: token,
    openid: openid
  }
  try {
    const result = await subscribeMessage(wxinfo, tempData||{ thing1: '张三学生卡位置发生变化' });
    // ctx.body=wxinfo;
    ctx.body = result;
  } catch (error) {
    ctx.body = error;
  }
});

function getCurrentTime() {
  var date = new Date();//当前时间
  var year = date.getFullYear() //返回指定日期的年份
  var month = repair(date.getMonth() + 1);//月
  var day = repair(date.getDate());//日
  var hour = repair(date.getHours());//时
  var minute = repair(date.getMinutes());//分
  var second = repair(date.getSeconds());//秒
  
  //当前时间 
  var curTime = year + "-" + month + "-" + day
          + " " + hour + ":" + minute + ":" + second;
  return curTime;
}

//补0

function repair(i){
  if (i >= 0 && i <= 9) {
      return "0" + i;
  } else {
      return i;
  }
}

let subscribeMessage = async (wxinfo, msgData) => {
  return new Promise((resolve, reject) => {
    let _data=null;
    if(msgData.tempId=='l8sv58g0tG1EVD6SfvB3GunFW3zuN28g5LduquKSxos'){
      //收到未读消息通知
      _data={
        "short_thing1": {
          "value": msgData.short_thing1 || "系统消息"
        },
        "thing2":{
          "value": msgData.thing2 ||'您有新的未读消息，请点击查看'
        },
        "time3": {
          "value": getCurrentTime()
        }
      }
    }else if(msgData.tempId=='E_UfdlSN7yi0HzeuxQzZ5CzLfz23jAHB6XDIWVIKIYc'){
      //到校离校提醒
      _data={
        "thing5": {
          "value": msgData.thing5 || "学校名称"
        },
        "name2":{
          "value": msgData.name2 ||'张三'
        },
        "thing7":{
          "value": msgData.thing7 ||'正门'
        },
        "date4": {
          "value": getCurrentTime()//2019年1月1日 20时01分01秒
        }
      }
    }else if(msgData.tempId=='eEhNuCArAy89drlJJpOm4noDv3EimUUCMB0E_h1DMjI'){
      //校服定位通知
      _data={
        "thing1": {
          "value": msgData.thing1 || "实验小学"
        },
        "thing2":{
          "value": msgData.thing2 ||'张金鹏'
        },
        "thing4": {
          "value": msgData.thing4 ||'浙江省台州市椒江区开发达到东段666号'
        }
      }
    }
    request({
      method: 'POST',
      // url: 'http://api.weixin.qq.com/wxa/msg_sec_check?access_token=TOKEN',
      // url: 'http://api.weixin.qq.com/wxa/msg_sec_check', // 这里就是少了一个token
      url: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?cloudbase_access_token=' + wxinfo.token,

      // url:'http://api.weixin.qq.com/cgi-bin/message/custom/send',
      // body: JSON.stringify({
      //   touser: "olCm55e965oZA_5256GAmSp5TWts",
      //   msgtype: "text",
      //   text: {
      //     content: "Hello World"
      //   }
      // })

      body: JSON.stringify({
        touser: wxinfo.openid || 'olCm55e965oZA_5256GAmSp5TWts',// 可以从请求的header中直接获取 req.headers['x-wx-openid']
        // page: 'index',
        page:'pages/v2/index/index',
        lang: 'zh_CN',
        data: _data,
        // template_id: "Q3egK0TR8xnjPFokCjjQbs5nKqWaFB_DrINOPmjNd08",//消息模版ID
        template_id: msgData.tempId||"l8sv58g0tG1EVD6SfvB3GunFW3zuN28g5LduquKSxos",//消息模版ID，----收到未读消息通知
        miniprogram_state: "developer",//跳转小程序类型：developer为开发版；trial为体验版；formal为正式版；默认为正式版
        // openid: 'olCm55e965oZA_5256GAmSp5TWts', // 可以从请求的header中直接获取 req.headers['x-wx-openid']
        // version: 2,
        // scene: 2,
        // content: '安全检测文本'
      })
    }, function (error, response) {
      if (response) {
        console.log('接口返回内容', response.body)
        resolve(JSON.parse(response.body));
      }
      if (error) {
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
router.post("/api/msgcall", async (ctx) => {
  const { request } = ctx;
  const { header } = request;
  const { tempData } = request.body;
  const {openid}=request.body;
  const token = header['x-wx-cloudbase-access-token'];
  const wx_openid = header['x-wx-openid']||openid;
  const wxinfo = {
    token: token,
    openid: wx_openid
  }
  // const { action } = request.body;
  try {
    const result = await subscribeMessage(wxinfo, tempData||{ thing1: '张三学生卡位置发生变化' });
    // ctx.body=wxinfo;
    if(result){
      result.openid=wx_openid;//
    }
    ctx.body = result;
  } catch (error) {
    ctx.body = error;
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


app.use(async (ctx, next) => {
  const contentType = 'application/json; chartset=utf-8'
  ctx.set('Content-Type', contentType)
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set("Access-Control-Allow-Methods", "OPTIONS, GET, PUT, POST, DELETE");
  // ctx.response.body = '{"success": true}'
  await next()
})

const port = process.env.PORT || 80;
async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}
bootstrap();
