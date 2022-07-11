const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Counter, Wxauth } = require("./db");

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");


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


/*判断是否是函数*/
function isFunction(fn) {
  return Object.prototype.toString.call(fn) === '[object Function]';
}
/*****************生成签名方法Signature*****************/
function getSignature(dataObj) {
  var newDataObj = objKeySort(dataObj);//按字典顺序排序。
  var parmasUrl = encodeSearchParams(newDataObj);//拼接成 a=1&d=2&=3参数的字符串
  var signature = sha1(parmasUrl);
  // console.log('signature:', newDataObj,parmasUrl,signature);
  return signature;
}
//js 把对象按照属性名的字母顺序进行排列
function objKeySort(obj) {//排序的函数
  var newkey = Object.keys(obj).sort();
  //先用Object内置类的keys方法获取要排序对象的属性名，再利用Array原型上的sort方法对获取的属性名进行排序，newkey是一个数组
  var newObj = {};//创建一个新的对象，用于存放排好序的键值对
  for (var i = 0; i < newkey.length; i++) {//遍历newkey数组
      newObj[newkey[i]] = obj[newkey[i]];//向新创建的对象中按照排好的顺序依次增加键值对
  }
  return newObj;//返回排好序的新对象
};
/**
* 拼接对象为请求字符串
* @param {Object} obj - 待拼接的对象
* @returns {string} - 拼接成的请求字符串
*/
function encodeSearchParams(obj) {
  const params = []
  Object.keys(obj).forEach((key) => {
      let value = obj[key]
      // 如果值为undefined我们将其置空
      if (typeof value === 'undefined') {
          value = ''
      }
      // 对于需要编码的文本（比如说中文）我们要进行编码
      // params.push([key, encodeURIComponent(value)].join('='))
      params.push([key, value].join('='))
  })

  return params.join('&')
}
//sha1 实现密码加密
function encodeUTF8(s) {
  var i, r = [],
      c, x;
  for (i = 0; i < s.length; i++)
      if ((c = s.charCodeAt(i)) < 0x80) r.push(c);
      else if (c < 0x800) r.push(0xC0 + (c >> 6 & 0x1F), 0x80 + (c & 0x3F));
      else {
          if ((x = c ^ 0xD800) >> 10 == 0) //对四字节UTF-16转换为Unicode
              c = (x << 10) + (s.charCodeAt(++i) ^ 0xDC00) + 0x10000,
                  r.push(0xF0 + (c >> 18 & 0x7), 0x80 + (c >> 12 & 0x3F));
          else r.push(0xE0 + (c >> 12 & 0xF));
          r.push(0x80 + (c >> 6 & 0x3F), 0x80 + (c & 0x3F));
      };
  return r;
};

// 字符串加密成 hex 字符串
function sha1(s) {
  var data = new Uint8Array(encodeUTF8(s))
  var i, j, t;
  var l = ((data.length + 8) >>> 6 << 4) + 16,
      s = new Uint8Array(l << 2);
  s.set(new Uint8Array(data.buffer)), s = new Uint32Array(s.buffer);
  for (t = new DataView(s.buffer), i = 0; i < l; i++) s[i] = t.getUint32(i << 2);
  s[data.length >> 2] |= 0x80 << (24 - (data.length & 3) * 8);
  s[l - 1] = data.length << 3;
  var w = [],
      f = [
          function() {
              return m[1] & m[2] | ~m[1] & m[3];
          },
          function() {
              return m[1] ^ m[2] ^ m[3];
          },
          function() {
              return m[1] & m[2] | m[1] & m[3] | m[2] & m[3];
          },
          function() {
              return m[1] ^ m[2] ^ m[3];
          }
      ],
      rol = function(n, c) {
          return n << c | n >>> (32 - c);
      },
      k = [1518500249, 1859775393, -1894007588, -899497514],
      m = [1732584193, -271733879, null, null, -1009589776];
  m[2] = ~m[0], m[3] = ~m[1];
  for (i = 0; i < s.length; i += 16) {
      var o = m.slice(0);
      for (j = 0; j < 80; j++)
          w[j] = j < 16 ? s[i + j] : rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1),
              t = rol(m[0], 5) + f[j / 20 | 0]() + m[4] + w[j] + k[j / 20 | 0] | 0,
              m[1] = rol(m[1], 30), m.pop(), m.unshift(t);
      for (j = 0; j < 5; j++) m[j] = m[j] + o[j] | 0;
  };
  t = new DataView(new Uint32Array(m).buffer);
  for (var i = 0; i < 5; i++) m[i] = t.getUint32(i << 2);

  var hex = Array.prototype.map.call(new Uint8Array(new Uint32Array(m).buffer), function(e) {
      return (e < 16 ? "0" : "") + e.toString(16);
  }).join("");

  return hex;
};
/*****************生成签名方法Signature-end*****************/

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
        page: 'index',
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
  const token = header['x-wx-cloudbase-access-token'];
  const openid = header['x-wx-openid'];
  const wxinfo = {
    token: token,
    openid: openid
  }
  // const { action } = request.body;
  try {
    const result = await subscribeMessage(wxinfo, tempData||{ thing1: '张三学生卡位置发生变化' });
    // ctx.body=wxinfo;
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
