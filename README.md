# WorkSphere  – Collaborative Project Management Platform

A full-stack collaboration app built with React, TypeScript, Node.js, Express, MongoDB and Socket.IO.

## Features
- JWT registration and login
- Workspaces and owner/member roles
- Projects and assigned tasks with status, priority and due dates
- Task comments
- Activity feed
- In-app notifications
- Real-time task and comment events via Socket.IO
- Responsive React UI

## Requirements
Node.js 20+, npm, MongoDB local or MongoDB Atlas.

## Run locally
Backend terminal:
```bash
cd server
npm install
```
Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`) and configure MongoDB/JWT secret.
```bash
npm run dev
```
Frontend terminal:
```bash
cd client
npm install
```
Copy `.env.example` to `.env`, then:
```bash
npm run dev
```
Open the Vite URL, normally http://localhost:5173. API and Socket.IO run on http://localhost:5001.

## Demo
1. Register an account and create a workspace.
2. Create projects and tasks.
3. Assign tasks to workspace members.
4. Add comments and update task status.
5. Use another browser/session to test live updates.

## Security
Never commit `.env` files or credentials. Member invitation currently adds an already-registered user by email; it does not send email. This is a portfolio starter and needs testing, rate limiting, and production hardening before deployment.
