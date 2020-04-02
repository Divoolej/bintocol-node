const lz4 = require('lz4');
const { getSchema, types } = require('./registry');
const { BINARY: { MASKS } } = require('./constants');
const { MASK_1, MASK_6 } = MASKS;
const { OBJECT, BOOL, INT, UINT, STRING, ARRAY, NOTHING } = types;

const encode = (payload, options = { compress: 'auto', json: true }) => {
  const { event, data } = payload;
  let encodedData, encodedHeader;
  if (options.compress === 'auto') {
    uncompressed = encodeData(payload, { ...options, compress: false });
    compressed = lz4.encode(uncompressed);
    if (uncompressed.length > compressed.length) {
      options.compress = true;
      encodedData = compressed;
    } else {
      options.compress = false;
      encodedData = uncompressed;
    }
    encodedHeader = encodeHeader(event, options);
  } else {
    encodedHeader = encodeHeader(event, options);
    encodedData = encodeData(payload, options);
  }
  return Buffer.concat([encodedHeader, encodedData]);
};

const encodeHeader = (event, options) => {
  let headerByte = 0;
  headerByte |= (event & MASK_6) << 2;
  headerByte |= (options.compress & MASK_1) << 1;
  headerByte |= (options.json & MASK_1);
  return Buffer.from([headerByte]);
};

const encodeData = ({ event, data }, options) => {
  if (options.json) {
    const encoded = Buffer.from(JSON.stringify(data));
    return options.compress ? lz4.encode(encoded) : encoded;
  }
  const schema = getSchema(event);
  if (!schema) throw `Unregistered event: ${event}`;
  const state = { bytes: [], currentByte: 0, currentBit: 0 };
  const encoded = Buffer.from(encodeType(data, schema, state).bytes);
  return options.compress ? lz4.encode(encoded) : encoded;
};

const encodeType = (data, schema, state) => {
  switch (schema.type) {
    case BOOL:
      return encodeBool(data, state);
    case INT:
      return encodeSignedInt(data, schema.size, state);
    case UINT:
      return encodeUnsignedInt(data, schema.size, state);
    case STRING:
      return encodeString(data, schema.lengthSize, state);
    case OBJECT:
      return encodeObject(data, schema.schema, state);
    case ARRAY:
      return encodeArray(data, schema.lengthSize, schema.content, state);
    case NOTHING:
      return state;
    default:
      throw `Unknown type: ${schema.type}`
  }
};

const encodeBool = (value, state) => {
  let { bytes, currentByte, currentBit } = state;

  let byte = bytes[currentByte] || 0;
  byte = byte | ((value & MASK_1) << (7 - currentBit));
  bytes[currentByte] = byte;

  currentBit = (currentBit + 1) % 8;
  if (currentBit === 0)
    currentByte += 1;

  return { ...state, bytes, currentByte, currentBit };
};

const encodeUnsignedInt = (value, size = 32, state) => {
  let { bytes, currentByte, currentBit } = state;

  let byte = bytes[currentByte] || 0;
  let offset = size - (8 - currentBit);
  let remaining = size;
  while (remaining > 0) {
    const mask = MASKS[8 - currentBit];
    byte = byte | ((offset >= 0 ? value >> offset : value << -offset) & mask);
    bytes[currentByte] = byte;
    if (remaining >= 8 - currentBit) {
      remaining -= (8 - currentBit);
      currentBit = 0;
      currentByte += 1;
      offset -= (8 - currentBit);
      byte = 0;
    } else {
      currentBit += remaining;
      remaining = 0;
    }
  }
  return { ...state, bytes, currentByte, currentBit };
};

const encodeSignedInt = (value, size = 32, state) => {
  state = encodeBool(value < 0, state);
  return encodeUnsignedInt(Math.abs(value), size, state);
};

const encodeString = (value, lengthSize = 8, state) => {
  const buffer = Buffer.from(value);
  state = encodeUnsignedInt(buffer.length, lengthSize, state);
  for (let i = 0; i < buffer.length; i++) {
    state = encodeUnsignedInt(buffer[i], 8, state);
  }
  return state;
};

const encodeArray = (data, lengthSize = 8, contentSchema, state) => {
  state = encodeUnsignedInt(data.length, lengthSize, state);
  return data.reduce((prevState, el) => encodeType(el, contentSchema, prevState), state);
};

const encodeObject = (data, schema, state) => (
  Object
    .keys(schema)
    .reduce((prevState, key) => encodeType(data[key], schema[key], prevState), state)
);

module.exports = encode;
