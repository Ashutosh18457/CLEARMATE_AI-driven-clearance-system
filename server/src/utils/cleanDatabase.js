const mongoose = require('mongoose');
const dns = require('dns');
const env = require('../config/env');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

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
const FacultyMapping = require('../models/FacultyMapping');
const Task = require('../models/Task');

async function cleanDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    console.log('🧹 Clearing all collections for clean production deployment...');

    const resClearanceRequests = await ClearanceRequest.deleteMany({});
    const resItemClearance = await ItemClearance.deleteMany({});
    const resSectionClearance = await SectionClearance.deleteMany({});
    const resSubmissions = await Submission.deleteMany({});
    const resSubmissionItems = await SubmissionItem.deleteMany({});
    const resNotifications = await Notification.deleteMany({});
    const resAuditLogs = await AuditLog.deleteMany({});
    const resTasks = await Task.deleteMany({});
    const resFacultyMappings = await FacultyMapping.deleteMany({});
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
    console.log(`🗑️  Deleted Faculty Mappings:   ${resFacultyMappings.deletedCount}`);
    console.log(`🗑️  Deleted Tasks:              ${resTasks.deletedCount}`);
    console.log(`🗑️  Deleted Clearance Requests: ${resClearanceRequests.deletedCount}`);
    console.log(`🗑️  Deleted Item Clearances:    ${resItemClearance.deletedCount}`);
    console.log(`🗑️  Deleted Section Clearances: ${resSectionClearance.deletedCount}`);
    console.log(`🗑️  Deleted Submissions:        ${resSubmissions.deletedCount}`);
    console.log(`🗑️  Deleted Submission Items:   ${resSubmissionItems.deletedCount}`);
    console.log(`🗑️  Deleted Notifications:      ${resNotifications.deletedCount}`);
    console.log(`🗑️  Deleted Audit Logs:         ${resAuditLogs.deletedCount}`);
    console.log('--------------------------------------------------');

    const shouldCreateAdmin = process.env.CREATE_ADMIN !== 'false';
    if (shouldCreateAdmin) {
      const adminName = process.env.ADMIN_NAME || 'Super Admin';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@sbjit.edu.in';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

      const admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'super_admin',
        isActive: true,
      });

      // Create core programs
      const defaultPrograms = [
        { name: 'B.Tech Artificial Intelligence & Data Science', code: 'AIDS', department: 'Emerging Technologies' },
        { name: 'B.Tech Artificial Intelligence & Machine Learning', code: 'AIML', department: 'Emerging Technologies' },
        { name: 'B.Tech Computer Science & Engineering', code: 'CSE', department: 'Computer Science' },
        { name: 'B.Tech Information Technology', code: 'IT', department: 'Information Technology' },
      ];

      for (const p of defaultPrograms) {
        await Program.create(p);
      }

      console.log('🎉 Production Super Admin account created:');
      console.log(`👤 Name:     ${admin.name}`);
      console.log(`📧 Email:    ${admin.email}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log(`🛡️ Role:     super_admin`);
      console.log(`🎓 Programs: Created ${defaultPrograms.map((p) => p.code).join(', ')}`);
    } else {
      console.log('✨ All collections wiped to 0 documents.');
    }
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error cleaning database:', err);
    process.exit(1);
  }
}

cleanDatabase();
