const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/db');
const DataTypes = require('sequelize').DataTypes;
const models = {};

const loadModels = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) loadModels(fullPath);
    else if (file.endsWith('.model.js')) {
      const model = require(fullPath)(sequelize, DataTypes);
      models[model.name] = model;
    }
  });
};

loadModels(__dirname);

Object.values(models).forEach(model => {
  if (model.associate) model.associate(models);
});

module.exports = models;