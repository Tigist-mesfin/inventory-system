// src/config/migrations.js
//
// sequelize-cli's own config format — read only by the `sequelize-cli`
// command-line tool (via .sequelizerc), never by the running app. The app
// itself uses db.js, which builds a live Sequelize connection object;
// sequelize-cli runs standalone outside the app and needs plain
// {username, password, database, host, dialect} data instead, in this
// exact shape. Both ultimately point at the same database via the same
// env vars — that overlap is unavoidable, not a mistake, since sequelize-cli
// has no way to reuse db.js's Sequelize instance directly.
require("dotenv").config();

const common = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: "mysql",
};

module.exports = {
  development: common,
  test: common,
  production: common,
};
