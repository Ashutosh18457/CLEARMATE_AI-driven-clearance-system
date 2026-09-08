const assert = require('assert');
const errorHandler = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');

// Mock response object to inspect output
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

const mockReq = {
  originalUrl: '/api/test',
  method: 'POST',
  ip: '127.0.0.1',
};

console.log('=== RUNNING ERROR HANDLING & INFORMATION LEAKAGE TEST SUITE ===\n');

// Test 1: Unhandled Programming Error (e.g. TypeError, ReferenceError)
{
  const res = createMockRes();
  const rawError = new TypeError("Cannot read property 'name' of undefined at /home/deploy/server/src/controllers/admin.js:42:15");
  errorHandler(rawError, mockReq, res, () => {});

  assert.strictEqual(res.statusCode, 500, 'Programming error must return 500');
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'An unexpected internal server error occurred', 'Must return generic message');
  assert.strictEqual(res.body.error.code, 'INTERNAL_ERROR');
  assert.strictEqual(res.body.stack, undefined, 'Stack trace MUST NOT be present');
  assert.strictEqual(JSON.stringify(res.body).includes('/home/deploy'), false, 'File path MUST NOT leak');
  console.log('  ✓ Unhandled Programming Error (500): Generic message returned, zero stack/path leaked');
}

// Test 2: AppError containing leaked file path or DB internals
{
  const res = createMockRes();
  const leakedAppError = new AppError('Error occurred in C:\\Users\\Administrator\\server\\models\\User.js: failed to connect to mongodb://admin:secret@cluster0.mongodb.net', 400);
  errorHandler(leakedAppError, mockReq, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'An unexpected system error occurred. Please try again or contact support.', 'Leaked path must be sanitized');
  assert.strictEqual(JSON.stringify(res.body).includes('secret'), false, 'DB credentials/paths MUST NOT leak');
  console.log('  ✓ Leaked File Path in Operational Error: Automatically sanitized to safe message');
}

// Test 3: Mongoose Duplicate Key Error (11000)
{
  const res = createMockRes();
  const mongoDupError = {
    code: 11000,
    keyValue: { enrollmentNo: '2024AIDS001' },
    message: 'E11000 duplicate key error collection: test.users index: enrollmentNo_1 dup key: { enrollmentNo: "2024AIDS001" }',
  };
  errorHandler(mongoDupError, mockReq, res, () => {});

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'A record with this enrollment no already exists');
  assert.strictEqual(res.body.error.code, 'DUPLICATE_KEY');
  assert.strictEqual(JSON.stringify(res.body).includes('E11000'), false, 'Raw Mongo error string MUST NOT leak');
  console.log('  ✓ Mongoose Duplicate Key Error: Clean human-readable conflict message returned');
}

// Test 4: Database Connection / Server Selection Error
{
  const res = createMockRes();
  const dbError = {
    name: 'MongooseServerSelectionError',
    message: 'Could not connect to any servers in your MongoDB Atlas cluster at mongodb+srv://admin:pass@cluster.mongodb.net',
  };
  errorHandler(dbError, mockReq, res, () => {});

  assert.strictEqual(res.statusCode, 503);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'Database service is temporarily unavailable. Please try again later.');
  assert.strictEqual(res.body.error.code, 'SERVICE_UNAVAILABLE');
  assert.strictEqual(JSON.stringify(res.body).includes('mongodb+srv'), false, 'Connection string MUST NOT leak');
  console.log('  ✓ Database Connection Error: Safe 503 service unavailable returned without leaking cluster URL');
}

// Test 5: Malformed JSON SyntaxError in Request Body
{
  const res = createMockRes();
  const syntaxErr = new SyntaxError('Unexpected token } in JSON at position 12');
  syntaxErr.status = 400;
  syntaxErr.body = '{"name": }';
  errorHandler(syntaxErr, mockReq, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'Malformed JSON payload in request body');
  assert.strictEqual(res.body.error.code, 'INVALID_JSON');
  console.log('  ✓ Malformed JSON SyntaxError: Safe 400 bad request returned');
}

// Test 6: Mongoose CastError / BSON error
{
  const res = createMockRes();
  const castErr = {
    name: 'CastError',
    message: 'Cast to ObjectId failed for value "123" (type string) at path "_id" for model "User"',
  };
  errorHandler(castErr, mockReq, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'Invalid resource identifier format');
  assert.strictEqual(res.body.error.code, 'INVALID_ID');
  console.log('  ✓ Mongoose CastError: Safe 400 invalid ID returned without internal model path');
}

// Test 7: Valid Operational AppError
{
  const res = createMockRes();
  const appErr = AppError.badRequest('Program code is required and must be 2-10 characters');
  errorHandler(appErr, mockReq, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.message, 'Program code is required and must be 2-10 characters');
  assert.strictEqual(res.body.error.code, 'BAD_REQUEST');
  console.log('  ✓ Operational AppError: Clean operational message returned properly');
}

console.log('\n========================================');
console.log('ALL ERROR HANDLING TESTS PASSED: 7/7 succeeded!');
console.log('========================================\n');
