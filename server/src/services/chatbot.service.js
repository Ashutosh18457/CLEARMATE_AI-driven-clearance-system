const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const Submission = require('../models/Submission');
const SubmissionItem = require('../models/SubmissionItem');
const User = require('../models/User');
const Semester = require('../models/Semester');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const env = require('../config/env');

const chatbotService = {
  /**
   * Processes a student's chat message using Claude AI.
   * Enriches the prompt with the student's actual clearance context
   * so responses are personalized and accurate.
   */
  async processMessage(studentId, message, conversationHistory = []) {
    // 1. Gather student context
    const context = await this._buildStudentContext(studentId);

    // 2. Build the system prompt with context
    const systemPrompt = this._buildSystemPrompt(context);

    // 3. Call Claude API (or return a fallback if no API key)
    if (!env.claudeApiKey) {
      return this._handleWithoutAI(message, context);
    }

    try {
      const response = await this._callClaudeAPI(systemPrompt, message, conversationHistory);
      return { reply: response, source: 'ai' };
    } catch (error) {
      logger.error('Claude API call failed, falling back to rule-based', { error: error.message });
      return this._handleWithoutAI(message, context);
    }
  },

  /**
   * Gathers the student's full clearance and submission context.
   */
  async _buildStudentContext(studentId) {
    const student = await User.findById(studentId)
      .select('name enrollmentNo section currentSemester programId')
      .lean();

    if (!student) return { student: null };

    // Find active semester
    const semester = await Semester.findOne({
      programId: student.programId,
      semNumber: student.currentSemester,
      isActive: true,
    })
      .populate('programId', 'name code')
      .lean();

    // Clearance status
    let clearance = null;
    let itemClearances = [];
    let sectionClearances = [];

    if (semester) {
      const cr = await ClearanceRequest.findOne({
        studentId,
        semesterId: semester._id,
      }).lean();

      if (cr) {
        clearance = cr;
        itemClearances = await ItemClearance.find({
          clearanceRequestId: cr._id,
        })
          .select('itemTitle itemType status remarks')
          .lean();

        sectionClearances = await SectionClearance.find({
          clearanceRequestId: cr._id,
        })
          .select('department status remarks')
          .lean();
      }

      // Pending submissions
      const submissionItems = await SubmissionItem.find({
        semesterId: semester._id,
      })
        .select('title type deadline')
        .lean();

      const submissions = await Submission.find({
        studentId,
        submissionItemId: { $in: submissionItems.map((si) => si._id) },
      })
        .select('submissionItemId status')
        .lean();

      const submissionMap = {};
      for (const s of submissions) {
        submissionMap[s.submissionItemId.toString()] = s.status;
      }

      const submissionStatus = submissionItems.map((si) => ({
        title: si.title,
        type: si.type,
        deadline: si.deadline,
        status: submissionMap[si._id.toString()] || 'pending',
        isOverdue: !submissionMap[si._id.toString()] && new Date(si.deadline) < new Date(),
      }));

      return {
        student,
        semester,
        clearance,
        itemClearances,
        sectionClearances,
        submissions: submissionStatus,
      };
    }

    return { student, semester: null };
  },

  /**
   * Builds a system prompt with the student's context.
   */
  _buildSystemPrompt(context) {
    let prompt = `You are ClearMate AI, a helpful assistant for students at ${context.semester?.programId?.name || 'the college'}. You help students understand their clearance status, submission deadlines, and answer questions about the clearance process.

Be friendly, concise, and accurate. Only share information that is relevant to the student asking. Never share other students' data.

STUDENT CONTEXT:
- Name: ${context.student?.name || 'Unknown'}
- Enrollment: ${context.student?.enrollmentNo || 'N/A'}
- Section: ${context.student?.section || 'N/A'}
- Semester: ${context.student?.currentSemester || 'N/A'}`;

    if (context.clearance) {
      prompt += `\n\nCLEARANCE STATUS: ${context.clearance.status}
Stage: ${context.clearance.currentStage || 'N/A'}`;

      if (context.itemClearances.length > 0) {
        prompt += '\n\nITEM CLEARANCES:';
        for (const ic of context.itemClearances) {
          prompt += `\n- ${ic.itemTitle} (${ic.itemType}): ${ic.status}${ic.remarks ? ` — ${ic.remarks}` : ''}`;
        }
      }

      if (context.sectionClearances.length > 0) {
        prompt += '\n\nSECTION CLEARANCES:';
        for (const sc of context.sectionClearances) {
          prompt += `\n- ${sc.department}: ${sc.status}${sc.remarks ? ` — ${sc.remarks}` : ''}`;
        }
      }
    } else {
      prompt += '\n\nCLEARANCE: Not yet initiated for current semester.';
    }

    if (context.submissions && context.submissions.length > 0) {
      prompt += '\n\nSUBMISSIONS:';
      for (const s of context.submissions) {
        const overdueTag = s.isOverdue ? ' ⚠️ OVERDUE' : '';
        prompt += `\n- ${s.title} (${s.type}): ${s.status} — Deadline: ${new Date(s.deadline).toLocaleDateString()}${overdueTag}`;
      }
    }

    return prompt;
  },

  /**
   * Calls the Claude API.
   */
  async _callClaudeAPI(systemPrompt, userMessage, conversationHistory) {
    const messages = [
      ...conversationHistory.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errorText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'I apologize, I could not generate a response.';
  },

  /**
   * Rule-based fallback when Claude API is not configured.
   * Handles common queries using the student's actual data.
   */
  _handleWithoutAI(message, context) {
    const msg = message.toLowerCase();

    // Clearance status
    if (msg.includes('clearance') && (msg.includes('status') || msg.includes('progress') || msg.includes('where'))) {
      if (!context.clearance) {
        return {
          reply: `Hi ${context.student?.name}! You haven't initiated clearance yet for this semester. Go to your dashboard and click "Initiate Clearance" to begin.`,
          source: 'rule',
        };
      }

      const stageNames = {
        items: 'Teacher Review',
        sections: 'Department Review (Library, Accounts, etc.)',
        class_incharge: 'Class Incharge Review',
        hod: 'HOD Final Review',
        completed: 'Completed! 🎉',
      };

      const rejected = context.itemClearances.filter((ic) => ic.status === 'rejected');
      let reply = `Your clearance is currently at: **${stageNames[context.clearance.currentStage] || context.clearance.status}**\n\n`;

      if (rejected.length > 0) {
        reply += `⚠️ ${rejected.length} item(s) rejected:\n`;
        for (const r of rejected) {
          reply += `- ${r.itemTitle}: ${r.remarks || 'No remarks'}\n`;
        }
      }

      const pending = context.itemClearances.filter((ic) => ic.status === 'pending');
      if (pending.length > 0) {
        reply += `\n📋 ${pending.length} item(s) still pending review.`;
      }

      return { reply, source: 'rule' };
    }

    // Submissions
    if (msg.includes('submission') || msg.includes('assignment') || msg.includes('deadline') || msg.includes('pending')) {
      if (!context.submissions || context.submissions.length === 0) {
        return { reply: 'No submission items found for this semester yet.', source: 'rule' };
      }

      const pending = context.submissions.filter((s) => s.status === 'pending');
      const overdue = context.submissions.filter((s) => s.isOverdue);

      let reply = `📝 **Submission Summary:**\n`;
      reply += `- Total items: ${context.submissions.length}\n`;
      reply += `- Pending: ${pending.length}\n`;
      reply += `- Overdue: ${overdue.length}\n\n`;

      if (overdue.length > 0) {
        reply += `⚠️ **Overdue items:**\n`;
        for (const o of overdue) {
          reply += `- ${o.title} (Due: ${new Date(o.deadline).toLocaleDateString()})\n`;
        }
      }

      return { reply, source: 'rule' };
    }

    // Help / general
    return {
      reply: `Hi ${context.student?.name || 'there'}! 👋 I can help you with:\n\n- **"What is my clearance status?"** — Check your current clearance progress\n- **"What are my pending submissions?"** — See upcoming deadlines\n- **"How does clearance work?"** — Learn about the clearance process\n\nWhat would you like to know?`,
      source: 'rule',
    };
  },
};

module.exports = chatbotService;
