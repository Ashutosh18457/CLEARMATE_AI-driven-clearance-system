const adminService = require('../services/admin.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const adminController = {
  // ──────────────────────────────────────────────
  // PROGRAMS
  // ──────────────────────────────────────────────

  /** @route POST /api/admin/programs */
  async createProgram(req, res, next) {
    try {
      const program = await adminService.createProgram(req.body);
      sendCreated(res, { data: { program }, message: 'Program created successfully' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/programs */
  async getPrograms(req, res, next) {
    try {
      const programs = await adminService.getAllPrograms();
      sendSuccess(res, { data: programs, message: 'Programs retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/programs/:id */
  async getProgramById(req, res, next) {
    try {
      const program = await adminService.getProgramById(req.params.id);
      sendSuccess(res, { data: { program } });
    } catch (error) { next(error); }
  },

  /** @route PUT /api/admin/programs/:id */
  async updateProgram(req, res, next) {
    try {
      const program = await adminService.updateProgram(req.params.id, req.body);
      sendSuccess(res, { data: { program }, message: 'Program updated successfully' });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // SEMESTERS
  // ──────────────────────────────────────────────

  /** @route POST /api/admin/semesters */
  async createSemester(req, res, next) {
    try {
      const semester = await adminService.createSemester(req.body);
      sendCreated(res, { data: { semester }, message: 'Semester created successfully' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/semesters */
  async getSemesters(req, res, next) {
    try {
      const semesters = await adminService.getSemesters(req.query);
      sendSuccess(res, { data: semesters, message: 'Semesters retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/semesters/:id */
  async getSemesterById(req, res, next) {
    try {
      const semester = await adminService.getSemesterById(req.params.id);
      sendSuccess(res, { data: { semester } });
    } catch (error) { next(error); }
  },

  /** @route PUT /api/admin/semesters/:id */
  async updateSemester(req, res, next) {
    try {
      const semester = await adminService.updateSemester(req.params.id, req.body);
      sendSuccess(res, { data: { semester }, message: 'Semester updated successfully' });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // BATCHES
  // ──────────────────────────────────────────────

  /** @route POST /api/admin/batches */
  async createBatch(req, res, next) {
    try {
      const batch = await adminService.createBatch(req.body);
      sendCreated(res, { data: { batch }, message: 'Batch created successfully' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/batches */
  async getBatches(req, res, next) {
    try {
      const batches = await adminService.getBatches(req.query);
      sendSuccess(res, { data: batches, message: 'Batches retrieved' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/admin/batches/:id/students */
  async addStudentsToBatch(req, res, next) {
    try {
      const batch = await adminService.addStudentsToBatch(req.params.id, req.body.studentIds);
      sendSuccess(res, { data: { batch }, message: 'Students added to batch successfully' });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────

  /** @route POST /api/admin/users */
  async createUser(req, res, next) {
    try {
      const user = await adminService.createUser(req.body, req.user);
      sendCreated(res, { data: { user }, message: 'User created successfully' });
    } catch (error) { next(error); }
  },

  /** @route POST /api/admin/users/bulk */
  async bulkCreateStudents(req, res, next) {
    try {
      const results = await adminService.bulkCreateStudents(req.body, req.user);
      sendCreated(res, {
        data: { results },
        message: `Bulk creation complete. Created: ${results.created.length}, Failed: ${results.failed.length}`,
      });
    } catch (error) { next(error); }
  },

  /** @route POST /api/admin/students/bulk-upload */
  async bulkUploadStudentsCsv(req, res, next) {
    try {
      const result = await adminService.bulkUploadStudentsCsv(req.body, req.user);
      sendCreated(res, {
        data: result,
        message: `Bulk CSV upload completed. Processed: ${result.totalRows}, Created: ${result.createdCount}, Failed: ${result.failedCount}`,
      });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/students/sample-csv */
  async downloadSampleCsv(req, res, next) {
    try {
      const csv = adminService.getSampleCsvTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sample_students_template.csv"');
      res.status(200).send(csv);
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/users */
  async getUsers(req, res, next) {
    try {
      const { users, pagination } = await adminService.getUsers(req.query, req.user);
      sendSuccess(res, { data: { users, pagination }, message: 'Users retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/users/:id */
  async getUserById(req, res, next) {
    try {
      const user = await adminService.getUserById(req.params.id, req.user);
      sendSuccess(res, { data: { user } });
    } catch (error) { next(error); }
  },

  /** @route PUT /api/admin/users/:id */
  async updateUser(req, res, next) {
    try {
      const user = await adminService.updateUser(req.params.id, req.body, req.user);
      sendSuccess(res, { data: { user }, message: 'User updated successfully' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/admin/users/:id/deactivate */
  async deactivateUser(req, res, next) {
    try {
      const user = await adminService.deactivateUser(req.params.id, req.user);
      sendSuccess(res, { data: { user }, message: 'User deactivated successfully' });
    } catch (error) { next(error); }
  },

  // ──────────────────────────────────────────────
  // CLEARANCE ITEMS
  // ──────────────────────────────────────────────

  /** @route POST /api/admin/clearance-items */
  async createClearanceItem(req, res, next) {
    try {
      const item = await adminService.createClearanceItem(req.body);
      sendCreated(res, { data: { item }, message: 'Clearance item created successfully' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/admin/clearance-items */
  async getClearanceItems(req, res, next) {
    try {
      const items = await adminService.getClearanceItems(req.query);
      sendSuccess(res, { data: items, message: 'Clearance items retrieved' });
    } catch (error) { next(error); }
  },

  /** @route PUT /api/admin/clearance-items/:id */
  async updateClearanceItem(req, res, next) {
    try {
      const item = await adminService.updateClearanceItem(req.params.id, req.body);
      sendSuccess(res, { data: { item }, message: 'Clearance item updated' });
    } catch (error) { next(error); }
  },

  /** @route DELETE /api/admin/clearance-items/:id */
  async deleteClearanceItem(req, res, next) {
    try {
      await adminService.deleteClearanceItem(req.params.id);
      sendSuccess(res, { message: 'Clearance item deleted successfully' });
    } catch (error) { next(error); }
  },
};

module.exports = adminController;
