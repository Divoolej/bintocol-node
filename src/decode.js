const lz4 = require('lz4');
const { getSchema, types } = require('./registry');
const { BINARY: { MASKS } } = require('./constants');
const { MASK_1, MASK_6 } = MASKS;
const { OBJECT, BOOL, INT, UINT, STRING, ARRAY } = types;

const decode = (message) => {
  const { event, options } = decodeHeader(message[0]);
  return { event, data: decodeData({ event, data: message.slice(1) }, options) };
};

const decodeHeader = headerByte => ({
  event: (headerByte >> 2) & MASK_6,
  options: {
    compress: Boolean((headerByte >> 1) & MASK_1),
    json: Boolean(headerByte & MASK_1),
  },
});

const decodeData = ({ event, data }, options) => {
  const decompressed = options.compress ? lz4.decode(data) : data;
  if (options.json) {
    return JSON.parse(decompressed.toString());
  }
  const schema = getSchema(event);
  if (!schema) throw `Unregistered event: ${event}`;
  const state = { bytes: decompressed, currentByte: 0, currentBit: 0 };
  return decodeType(schema, state).value;
};

const decodeType = (schema, state) => {
  switch (schema.type) {
    case BOOL:
      return decodeBool(state);
    case INT:
      return decodeSignedInt(schema.size, state);
    case UINT:
      return decodeUnsignedInt(schema.size, state);
    case STRING:
      return decodeString(schema.lengthSize, state);
    case OBJECT:
      return decodeObject(schema.schema, state);
    case ARRAY:
      return decodeArray(schema.lengthSize, schema.content, state);
    case NOTHING:
      return state;
    default:
      throw `Unknown type: ${schema.type}`
  }
};

const decodeBool = (state) => {
  let { bytes, currentByte, currentBit } = state;

  let byte = bytes[currentByte] || 0;
  let value = Boolean((byte >> (7 - currentBit)) & MASK_1);

  currentBit = (currentBit + 1) % 8;
  if (currentBit === 0)
    currentByte += 1;

  return { value, state: { ...state, currentByte, currentBit } };
};

const decodeUnsignedInt = (size, state) => {
  let { bytes, currentByte, currentBit } = state;

  let value = 0;
  let remaining = size;
  while (remaining > 0) {
    const byte = bytes[currentByte];
    const bitsInByte = 8 - currentBit;
    if (remaining >= bitsInByte) {
      const mask = MASKS[bitsInByte];
      value |= byte & mask;
      remaining -= bitsInByte;
      value <<= Math.min(remaining, 8);
      currentByte += 1;
      currentBit = 0;
    } else {
      const mask = MASKS[remaining];
      value |= ((byte >> (bitsInByte - remaining)) & mask);
      currentBit += remaining;
      remaining = 0;
    }
  }

  return { value, state: { ...state, currentByte, currentBit } };
};

const decodeSignedInt = (size, state) => {
  let { value: isNegative, state: signState } = decodeBool(state);
  let { value: number, state: numberState } = decodeUnsignedInt(size, signState);
  return { value: (isNegative ? -number : number), state: numberState }
};

const decodeString = (lengthSize, state) => {
  const { value: length, state: lengthState } = decodeUnsignedInt(lengthSize, state);
  const bytes = [];
  state = lengthState;
  for (let i = 0; i < length; i++) {
    let { value: byte, state: nextState } = decodeUnsignedInt(8, state);
    bytes.push(byte);
    state = nextState;
  }
  return { value: Buffer.from(bytes).toString(), state };
};

const decodeArray = (lengthSize, contentSchema, state) => {
  const { value: length, state: lengthState } = decodeUnsignedInt(lengthSize, state);
  const result = [];
  state = lengthState;
  for (let i = 0; i < length; i++) {
    let { value: el, state: nextState } = decodeType(contentSchema, state);
    result.push(el);
    state = nextState;
  }
  return { value: result, state };
};

const decodeObject = (schema, state) => {
  const result = {};
  Object.keys(schema).forEach(key => {
    const { value, state: nextState } = decodeType(schema[key], state);
    result[key] = value;
    state = nextState;
  });
  return { value: result, state };
};

module.exports = decode;
