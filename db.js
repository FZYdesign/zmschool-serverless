const { Sequelize, DataTypes } = require("sequelize");

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = "sh-cynosdbmysql-grp-o8me80pg.sql.tencentcdb.com:24759" } = process.env;

const [host, port] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize("nodejs_demo", MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql" /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,
  timezone: "+8:00",
  // dialectOptions: {
  //   useUTC: false
  // },
});


// 定义数据模型
const Counter = sequelize.define("Counter", {
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
});

const Wxauth = sequelize.define("Wxauth", {
  accesstoken: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  },
  expiresin:{
    type:DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 7200,
  },
//   createdAt: {
//     type: DataTypes.DATE,
//     get() {
//         return moment(this.getDataValue('createdAt')).format('YYYY-MM-DD HH:mm:ss');
//     }
// },
// updatedAt: {
//     type: DataTypes.DATE,
//     get() {
//         return moment(this.getDataValue('updatedAt')).format('YYYY-MM-DD HH:mm:ss');
//     }
// },
// timestamp: { //我们自己定义的时间戳字段
//   type: DataTypes.DATE,
//   defaultValue: Date.now()
// }
});

// 数据库初始化方法
async function init() {
  await Counter.sync({ alter: true });
  await Wxauth.sync({ alter: true });
}

// 导出初始化方法和模型
module.exports = {
  init,
  Counter,
  Wxauth,
};
