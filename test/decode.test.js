const { decode, register, types } = require('../src');
const { OBJECT, UINT, INT, STRING, BOOL, ARRAY } = types;

describe("decode", () => {
  const TEST_EVENT = parseInt('110011', 2);
  register({
    event: TEST_EVENT,
    body: {
      type: OBJECT,
      schema: {
        number: { type: INT, size: 12 },
        string: { type: STRING, lengthSize: 7 },
        object: {
          type: OBJECT,
          schema: {
            ping: { type: STRING, lengthSize: 6 },
          },
        },
        array: {
          type: ARRAY,
          lengthSize: 7,
          content: { type: UINT, size: 17 },
        },
        nothing: { type: UINT, size: 1 },
        bool: { type: BOOL },
      },
    },
  });

  test("imports correctly", () => {
    expect(decode).toBeDefined();
    expect(typeof decode).toBe('function');
    expect(decode).toBeInstanceOf(Function);
  });

  describe('without compression', () => {
    describe('with json payload', () => {
      const expectedPayload = {
        number: -999,
        string: 'test 😀😁test',
        object: { ping: 'pong' },
        array: [1, 3, 17, 1234],
        nothing: null,
        bool: true,
      };

      test('decodes message properly', () => {
        const message = Buffer.from([
          0xcd, 0x7b, 0x22, 0x6e, 0x75, 0x6d, 0x62, 0x65,
          0x72, 0x22, 0x3a, 0x2d, 0x39, 0x39, 0x39, 0x2c,
          0x22, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x22,
          0x3a, 0x22, 0x74, 0x65, 0x73, 0x74, 0x20, 0xf0,
          0x9f, 0x98, 0x80, 0xf0, 0x9f, 0x98, 0x81, 0x74,
          0x65, 0x73, 0x74, 0x22, 0x2c, 0x22, 0x6f, 0x62,
          0x6a, 0x65, 0x63, 0x74, 0x22, 0x3a, 0x7b, 0x22,
          0x70, 0x69, 0x6e, 0x67, 0x22, 0x3a, 0x22, 0x70,
          0x6f, 0x6e, 0x67, 0x22, 0x7d, 0x2c, 0x22, 0x61,
          0x72, 0x72, 0x61, 0x79, 0x22, 0x3a, 0x5b, 0x31,
          0x2c, 0x33, 0x2c, 0x31, 0x37, 0x2c, 0x31, 0x32,
          0x33, 0x34, 0x5d, 0x2c, 0x22, 0x6e, 0x6f, 0x74,
          0x68, 0x69, 0x6e, 0x67, 0x22, 0x3a, 0x6e, 0x75,
          0x6c, 0x6c, 0x2c, 0x22, 0x62, 0x6f, 0x6f, 0x6c,
          0x22, 0x3a, 0x74, 0x72, 0x75, 0x65, 0x7d,
        ]);
        expect(decode(message)).toEqual({ event: TEST_EVENT, data: expectedPayload });
      });
    });

    describe('with binary payload', () => {
      const expectedPayload = {
        number: -999,
        string: 'test 😀😁test',
        object: { ping: 'pong' },
        array: [1, 3, 17, 1234],
        nothing: 0,
        bool: true,
      };

      test('decodes message properly', () => {
        const message = Buffer.from([
          0xcc, 0x9f, 0x39, 0x17, 0x46, 0x57, 0x37, 0x42,
          0x0f, 0x09, 0xf9, 0x88, 0x0f, 0x09, 0xf9, 0x88,
          0x17, 0x46, 0x57, 0x37, 0x41, 0x1c, 0x1b, 0xdb,
          0x99, 0xc2, 0x00, 0x00, 0x40, 0x00, 0x60, 0x01,
          0x10, 0x26, 0x92,
        ]);
        expect(decode(message)).toEqual({ event: TEST_EVENT, data: expectedPayload });
      });
    });
  });

  describe('with compression', () => {
    describe('with json payload', () => {
      const expectedPayload = {
        number: -999,
        string: 'test 😀😁test',
        object: { ping: 'pong' },
        array: [1, 3, 17, 1234],
        nothing: null,
        bool: true,
      };

      test('decodes message properly', () => {
        const message = Buffer.from([
          0xcf, 0x04, 0x22, 0x4d, 0x18, 0x64, 0x70, 0xb9,
          0x74, 0x00, 0x00, 0x00, 0xf0, 0x17, 0x7b, 0x22,
          0x6e, 0x75, 0x6d, 0x62, 0x65, 0x72, 0x22, 0x3a,
          0x2d, 0x39, 0x39, 0x39, 0x2c, 0x22, 0x73, 0x74,
          0x72, 0x69, 0x6e, 0x67, 0x22, 0x3a, 0x22, 0x74,
          0x65, 0x73, 0x74, 0x20, 0xf0, 0x9f, 0x98, 0x80,
          0xf0, 0x9f, 0x98, 0x81, 0x0d, 0x00, 0xe2, 0x22,
          0x2c, 0x22, 0x6f, 0x62, 0x6a, 0x65, 0x63, 0x74,
          0x22, 0x3a, 0x7b, 0x22, 0x70, 0x25, 0x00, 0xf1,
          0x13, 0x70, 0x6f, 0x6e, 0x67, 0x22, 0x7d, 0x2c,
          0x22, 0x61, 0x72, 0x72, 0x61, 0x79, 0x22, 0x3a,
          0x5b, 0x31, 0x2c, 0x33, 0x2c, 0x31, 0x37, 0x2c,
          0x31, 0x32, 0x33, 0x34, 0x5d, 0x2c, 0x22, 0x6e,
          0x6f, 0x74, 0x68, 0x28, 0x00, 0xf0, 0x02, 0x6e,
          0x75, 0x6c, 0x6c, 0x2c, 0x22, 0x62, 0x6f, 0x6f,
          0x6c, 0x22, 0x3a, 0x74, 0x72, 0x75, 0x65, 0x7d,
          0x00, 0x00, 0x00, 0x00, 0x10, 0xf1, 0xd0, 0xd9,
        ]);
        expect(decode(message)).toEqual({ event: TEST_EVENT, data: expectedPayload });
      });
    });

    describe('with binary payload', () => {
      const expectedPayload = {
        number: -999,
        string: 'test 😀😁test',
        object: { ping: 'pong' },
        array: [1, 3, 17, 1234],
        nothing: 0,
        bool: true,
      };

      test('decodes message properly', () => {
        const message = Buffer.from([
          0xce, 0x04, 0x22, 0x4d, 0x18, 0x64, 0x70, 0xb9,
          0x22, 0x00, 0x00, 0x00, 0xb0, 0x9f, 0x39, 0x17,
          0x46, 0x57, 0x37, 0x42, 0x0f, 0x09, 0xf9, 0x88,
          0x04, 0x00, 0x00, 0x0d, 0x00, 0xf0, 0x00, 0x41,
          0x1c, 0x1b, 0xdb, 0x99, 0xc2, 0x00, 0x00, 0x40,
          0x00, 0x60, 0x01, 0x10, 0x26, 0x92, 0x00, 0x00,
          0x00, 0x00, 0x1f, 0x03, 0x00, 0xa0,
        ]);
        expect(decode(message)).toEqual({ event: TEST_EVENT, data: expectedPayload });
      });
    });
  });
});
