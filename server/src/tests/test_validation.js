/**
 * Comprehensive Automated Test Suite for Strict Input Validation
 * Tests schema validation, type constraints, length bounds, format enforcement, and unknown-key rejection.
 */

const assert = require('assert');
const Joi = require('joi');
const validate = require('../middleware/validate');
const authValidator = require('../validators/auth.validator');
const adminValidator = require('../validators/admin.validator');
const clearanceValidator = require('../validators/clearance.validator');
const submissionValidator = require('../validators/submission.validator');
const sectionValidator = require('../validators/section.validator');
const taskValidator = require('../validators/task.validator');
const facultyMappingValidator = require('../validators/facultyMapping.validator');
const commonValidator = require('../validators/common.validator');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

function mockMiddlewareExecution(schema, reqPayload, source = 'body') {
  const req = { [source]: { ...reqPayload } };
  let errorResult = null;
  const next = (err) => {
    if (err) errorResult = err;
  };

  const middleware = validate(schema, source);
  middleware(req, {}, next);

  return { req, error: errorResult };
}

console.log('\n=== RUNNING STRICT INPUT VALIDATION TEST SUITE ===\n');

// ─── 1. VALIDATION MIDDLEWARE CORE BEHAVIOR ─────────────────────────────────
console.log('--- Testing Middleware Core & Unknown Field Rejection ---');

runTest('Rejects unknown/injected fields on strict schema', () => {
  const payload = {
    email: 'test@sbjit.edu.in',
    password: 'Password123!',
    injectedField: 'malicious_sql_or_nosql_payload',
  };
  const { error } = mockMiddlewareExecution(authValidator.loginSchema, payload);
  assert(error !== null, 'Should have failed due to unknown field');
  assert(error.statusCode === 422 || error.statusCode === 400 || error.errorCode === 'VALIDATION_ERROR');
  assert(error.message.includes('injectedField') || error.message.includes('not allowed'));
});

runTest('Accepts valid payload on strict schema', () => {
  const payload = {
    email: 'valid.student@sbjit.edu.in',
    password: 'SecurePassword123!',
  };
  const { error, req } = mockMiddlewareExecution(authValidator.loginSchema, payload);
  assert.strictEqual(error, null);
  assert.strictEqual(req.body.email, 'valid.student@sbjit.edu.in');
});

// ─── 2. AUTH SCHEMAS ────────────────────────────────────────────────────────
console.log('\n--- Testing Auth Validation Schemas ---');

runTest('Auth Login: Rejects invalid email format', () => {
  const payload = { email: 'not-an-email', password: 'Password123' };
  const { error } = mockMiddlewareExecution(authValidator.loginSchema, payload);
  assert(error !== null);
  assert(error.message.includes('email') || error.message.includes('valid'));
});

runTest('Auth Register: Rejects non-college domain email', () => {
  const payload = {
    name: 'John Doe',
    email: 'john@gmail.com', // Not @sbjit.edu.in
    password: 'Password123!',
    role: 'student',
  };
  const { error } = mockMiddlewareExecution(authValidator.registerSchema, payload);
  assert(error !== null);
  assert(error.message.includes('@sbjit.edu.in') || error.message.includes('college'));
});

runTest('Auth Register: Rejects short password (< 8 chars)', () => {
  const payload = {
    name: 'John Doe',
    email: 'john@sbjit.edu.in',
    password: 'short',
    role: 'student',
  };
  const { error } = mockMiddlewareExecution(authValidator.registerSchema, payload);
  assert(error !== null);
  assert(error.message.includes('8'));
});

runTest('Auth Reset Password: Requires complex password (upper, lower, digit, special)', () => {
  const payload = {
    password: 'alllowercase123!',
  };
  const { error } = mockMiddlewareExecution(authValidator.resetPasswordSchema, payload);
  assert(error !== null);
  assert(error.message.includes('uppercase') || error.message.includes('pattern'));
});

// ─── 3. ADMIN SCHEMAS ───────────────────────────────────────────────────────
console.log('\n--- Testing Admin Validation Schemas ---');

runTest('Admin Create Program: Rejects unknown properties & requires required fields', () => {
  const invalidPayload = {
    name: 'Computer Science',
    // Missing code & department
    hackedAttr: true,
  };
  const { error } = mockMiddlewareExecution(adminValidator.createProgramSchema, invalidPayload);
  assert(error !== null);
});

runTest('Admin Create Program: Accepts valid program payload', () => {
  const validPayload = {
    name: 'Computer Science & Engineering',
    code: 'CSE',
    department: 'Department of Computer Science',
    totalSemesters: 8,
  };
  const { error } = mockMiddlewareExecution(adminValidator.createProgramSchema, validPayload);
  assert.strictEqual(error, null);
});

runTest('Admin Create Semester: Rejects invalid semNumber (> 12)', () => {
  const invalidPayload = {
    programId: '507f1f77bcf86cd799439011',
    name: 'Semester 15',
    semNumber: 15,
    academicYear: '2025-26',
    type: 'ODD',
    clearanceDeadline: '2026-12-31T23:59:59.000Z',
  };
  const { error } = mockMiddlewareExecution(adminValidator.createSemesterSchema, invalidPayload);
  assert(error !== null);
  assert(error.message.includes('semNumber') || error.message.includes('12'));
});

runTest('Admin Create Clearance Item: Rejects elective without electiveOptions', () => {
  const invalidPayload = {
    semesterId: '507f1f77bcf86cd799439011',
    srNo: 1,
    title: 'Elective 1',
    type: 'elective',
    // Missing electiveOptions
  };
  const { error } = mockMiddlewareExecution(adminValidator.createClearanceItemSchema, invalidPayload);
  assert(error !== null);
});

// ─── 4. SECTION SCHEMAS ─────────────────────────────────────────────────────
console.log('\n--- Testing Section Validation Schemas ---');

runTest('Account Section: Rejects invalid fee status value', () => {
  const invalidPayload = {
    status: 'partially_paid', // Invalid enum
  };
  const { error } = mockMiddlewareExecution(sectionValidator.updateAccountFeesSchema, invalidPayload);
  assert(error !== null);
  assert(error.message.includes('status') || error.message.includes('paid'));
});

runTest('Account Section: Accepts valid paid status', () => {
  const validPayload = {
    status: 'paid',
    remark_text: 'Fee paid in full',
  };
  const { error } = mockMiddlewareExecution(sectionValidator.updateAccountFeesSchema, validPayload);
  assert.strictEqual(error, null);
});

runTest('Bus Section: Rejects bulk update with empty body', () => {
  const invalidPayload = {};
  const { error } = mockMiddlewareExecution(sectionValidator.bulkUpdateBusFeesSchema, invalidPayload);
  assert(error !== null);
});

// ─── 5. CLEARANCE & SUBMISSION SCHEMAS ──────────────────────────────────────
console.log('\n--- Testing Clearance & Submission Schemas ---');

runTest('Clearance Review: Rejects status other than approved / rejected', () => {
  const invalidPayload = {
    status: 'in_progress', // invalid
    remarks: 'looks good',
  };
  const { error } = mockMiddlewareExecution(clearanceValidator.reviewItemSchema, invalidPayload);
  assert(error !== null);
  assert(error.message.includes('status') || error.message.includes('approved'));
});

runTest('Submission Verify: Bulk verify rejects array > 50 items', () => {
  const tooManyIds = Array(55).fill('507f1f77bcf86cd799439011');
  const invalidPayload = {
    submissionIds: tooManyIds,
    status: 'verified',
  };
  const { error } = mockMiddlewareExecution(submissionValidator.bulkVerifySubmissionSchema, invalidPayload);
  assert(error !== null);
  assert(error.message.includes('50') || error.message.includes('max'));
});

// ─── 6. TASK SCHEMAS ────────────────────────────────────────────────────────
console.log('\n--- Testing Task Schemas ---');

runTest('Task Create: Rejects task with empty title', () => {
  const invalidPayload = {
    title: '   ',
    description: 'Some task',
  };
  const { error } = mockMiddlewareExecution(taskValidator.createTaskSchema, invalidPayload);
  assert(error !== null);
  assert(error.message.includes('title'));
});

runTest('Task Create: Rejects unknown properties in task', () => {
  const invalidPayload = {
    title: 'Submit Lab Journal',
    description: 'Submit by Friday',
    unexpectedField: 12345,
  };
  const { error } = mockMiddlewareExecution(taskValidator.createTaskSchema, invalidPayload);
  assert(error !== null);
  assert(error.message.includes('unexpectedField') || error.message.includes('not allowed'));
});

// ─── 7. COMMON PARAMETER SCHEMAS ────────────────────────────────────────────
console.log('\n--- Testing Common Param Schemas ---');

runTest('ObjectId Param: Rejects malformed 123 ID', () => {
  const { error } = mockMiddlewareExecution(commonValidator.idParamSchema, { id: '123' }, 'params');
  assert(error !== null);
  assert(error.message.includes('ID') || error.message.includes('Invalid'));
});

runTest('ObjectId Param: Accepts valid 24-hex ObjectId', () => {
  const { error } = mockMiddlewareExecution(commonValidator.idParamSchema, { id: '507f1f77bcf86cd799439011' }, 'params');
  assert.strictEqual(error, null);
});

console.log(`\n========================================`);
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} test cases succeeded!`);
console.log(`========================================\n`);
