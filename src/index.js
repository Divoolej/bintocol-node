const encode = require('./encode');
const decode = require('./decode');
const { register, types } = require('./registry');

module.exports = {
  encode,
  decode,
  types,
  register,
};
