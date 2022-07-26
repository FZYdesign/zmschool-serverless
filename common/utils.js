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

// 导出初始化方法和模型
module.exports = {
  isFunction,
  getSignature,
  };