const Router = require("koa-router");
const router = new Router();

const wxAuth = require('./wxAuth');


router.use("/api/wxAuth", wxAuth.routes(), wxAuth.allowedMethods());//合并，融合路由模块

module.exports = router;
