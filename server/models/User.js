// models/User.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class User extends Model {}
User.init({
  name: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, unique: true },
  password: { type: DataTypes.STRING }
}, {
  sequelize,
  modelName: 'user',
  timestamps: true
});

class Course extends Model {}
Course.init({
  prompt: { type: DataTypes.STRING }, // course prompt/title
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  modelName: 'course',
  timestamps: false // we set createdAt manually (or you can enable timestamps)
});

class Module extends Model {}
Module.init({
  title: { type: DataTypes.STRING },
  content: { type: DataTypes.TEXT('long') }, // allow long markdown
  quiz: { type: DataTypes.TEXT('long') }      // store quiz text/raw
}, {
  sequelize,
  modelName: 'module',
  timestamps: false
});

// Associations
User.hasMany(Course, { as: 'savedCourses', foreignKey: 'userId', onDelete: 'CASCADE' });
Course.belongsTo(User, { foreignKey: 'userId' });

Course.hasMany(Module, { as: 'modules', foreignKey: 'courseId', onDelete: 'CASCADE' });
Module.belongsTo(Course, { foreignKey: 'courseId' });

export { sequelize, User, Course, Module };
