# AGENTS.md — Workspace Guidelines for ClearMate

This document governs the coding standards, rules, and workflows for all AI agents working in this workspace. **Read this before writing any code.**

---

## 1. Coding Standards & Conventions
* **Folder Structure:** Strictly adhere to the **MVC + Services** pattern.
  * Backend: `server/src/controllers/`, `server/src/models/`, `server/src/routes/`, `server/src/services/`, `server/src/validators/`.
  * Frontend: `client/src/components/`, `client/src/pages/`, `client/src/api/`.
* **Naming Conventions:**
  * Routes, Controllers, Services, Validators: Use snake_case with descriptive suffixes (e.g., `admin.routes.js`, `auth.controller.js`, `auth.service.js`).
  * Mongoose Models: Use PascalCase (e.g., `User.js`, `ClearanceRequest.js`).
  * React Components: Use PascalCase (e.g., `StudentDashboard.jsx`, `Button.jsx`).
  * Variables / Functions: Use camelCase (e.g., `verifyPassword`, `studentIds`).
* **Formatting:** Clean JavaScript/ES6 conventions. Keep files concise and modular.

---

## 2. 🚫 "Never Do" List
* **Do NOT** modify `server/.env` or database schemas (`server/src/models/*`) without explicit confirmation from the user.
* **Do NOT** install new dependencies or npm packages without proposing them to the user first.
* **Do NOT** change the tech stack or swap standard libraries (e.g., swapping Tailwind for Bootstrap, or Express for NestJS).
* **Do NOT** log raw credentials, secrets, or API keys in error handlers or Winston log outputs.

---

## 3. Preferred Libraries
* **State Management:** React Context API (no Redux or Zustand).
* **HTTP Client:** Axios (configured with intercepts in `client/src/api/axios.js`).
* **Database Driver:** Mongoose (connected to MongoDB Atlas/In-Memory MongoDB).
* **Styling:** TailwindCSS (utility classes matching the tokens in `tailwind.config.js`).

---

## 4. Testing Requirements
* Every new endpoint or controller method must have passing verification code.
* Before marking a feature complete, test the API route to ensure it returns standard success/error JSON envelopes.

---

## 5. Commit Message Conventions
We strictly follow **Conventional Commits**:
* `feat:` for new features (e.g., `feat: add batch cloning`)
* `fix:` for bug fixes (e.g., `fix: resolve login lockout expiration`)
* `docs:` for documentation updates
* `style:` for styling/format changes
* `test:` for adding or updating tests
* `chore:` for package maintenance or build updates
