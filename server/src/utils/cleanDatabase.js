const mongoose = require('mongoose');
const env = require('../config/env');

const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const Batch = require('../models/Batch');
const ClearanceItem = require('../models/ClearanceItem');
const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const Submission = require('../models/Submission');
const SubmissionItem = require('../models/SubmissionItem');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

async function cleanDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    console.log('🧹 Clearing all collections...');

    const resClearanceRequests = await ClearanceRequest.deleteMany({});
    const resItemClearance = await ItemClearance.deleteMany({});
    const resSectionClearance = await SectionClearance.deleteMany({});
    const resSubmissions = await Submission.deleteMany({});
    const resSubmissionItems = await SubmissionItem.deleteMany({});
    const resNotifications = await Notification.deleteMany({});
    const resAuditLogs = await AuditLog.deleteMany({});
    const resClearanceItems = await ClearanceItem.deleteMany({});
    const resBatches = await Batch.deleteMany({});
    const resSemesters = await Semester.deleteMany({});
    const resPrograms = await Program.deleteMany({});
    const resUsers = await User.deleteMany({});

    console.log('--------------------------------------------------');
    console.log(`🗑️  Deleted Users:              ${resUsers.deletedCount}`);
    console.log(`🗑️  Deleted Programs:           ${resPrograms.deletedCount}`);
    console.log(`🗑️  Deleted Semesters:          ${resSemesters.deletedCount}`);
    console.log(`🗑️  Deleted Batches:            ${resBatches.deletedCount}`);
    console.log(`🗑️  Deleted Clearance Items:    ${resClearanceItems.deletedCount}`);
    console.log(`🗑️  Deleted Clearance Requests: ${resClearanceRequests.deletedCount}`);
    console.log(`🗑️  Deleted Item Clearances:    ${resItemClearance.deletedCount}`);
    console.log(`🗑️  Deleted Section Clearances: ${resSectionClearance.deletedCount}`);
    console.log(`🗑️  Deleted Submissions:        ${resSubmissions.deletedCount}`);
    console.log(`🗑️  Deleted Submission Items:   ${resSubmissionItems.deletedCount}`);
    console.log(`🗑️  Deleted Notifications:      ${resNotifications.deletedCount}`);
    console.log(`🗑️  Deleted Audit Logs:         ${resAuditLogs.deletedCount}`);
    console.log('--------------------------------------------------');

    // Create fresh default admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sbjit.edu.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Password123!';

    const admin = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });

    console.log('🎉 Database cleaned & fresh Admin account created:');
    console.log(`👤 Email:    ${admin.email}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error cleaning database:', err);
    process.exit(1);
  }
}

cleanDatabase();
