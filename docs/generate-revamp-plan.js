const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, PageBreak,
  TableOfContents, ShadingType, Header, Footer, PageNumber,
  NumberFormat, LevelFormat, Tab, TabStopType, TabStopPosition,
} = require("docx");
const fs = require("fs");

// ── Color palette ──
const C = {
  primary: "1B3A5C",
  accent: "2E86C1",
  dark: "1C1C1C",
  medium: "444444",
  light: "666666",
  muted: "999999",
  white: "FFFFFF",
  bgLight: "F4F7FA",
  bgMedium: "E8EDF2",
  critical: "C0392B",
  high: "E67E22",
  mediumRisk: "F1C40F",
  low: "27AE60",
  tableBorder: "B0BEC5",
  tableHeader: "1B3A5C",
  tableAlt: "F8F9FA",
};

// ── Reusable helpers ──
function txt(text, opts = {}) {
  return new TextRun({
    text,
    font: "Calibri",
    size: opts.size || 22,
    bold: opts.bold || false,
    italics: opts.italics || false,
    color: opts.color || C.dark,
    underline: opts.underline ? {} : undefined,
    break: opts.break,
  });
}

function para(children, opts = {}) {
  if (typeof children === "string") children = [txt(children, opts)];
  return new Paragraph({
    children,
    alignment: opts.alignment || AlignmentType.LEFT,
    heading: opts.heading,
    spacing: { before: opts.spaceBefore || 0, after: opts.spaceAfter || 120 },
    indent: opts.indent,
    bullet: opts.bullet,
    numbering: opts.numbering,
    style: opts.style,
    pageBreakBefore: opts.pageBreakBefore || false,
  });
}

function heading(text, level, opts = {}) {
  return new Paragraph({
    children: [txt(text, { bold: true, color: C.primary, size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 30 : level === HeadingLevel.HEADING_3 ? 26 : 24 })],
    heading: level,
    spacing: { before: opts.spaceBefore || (level === HeadingLevel.HEADING_1 ? 360 : 240), after: opts.spaceAfter || 120 },
    pageBreakBefore: opts.pageBreakBefore || false,
  });
}

function bullet(text, opts = {}) {
  const children = typeof text === "string" ? [txt(text, { size: opts.size || 22 })] : text;
  return new Paragraph({
    children,
    bullet: { level: opts.level || 0 },
    spacing: { before: 40, after: 40 },
  });
}

function emptyLine() {
  return para([txt("")], { spaceAfter: 0 });
}

function boldText(text) { return txt(text, { bold: true }); }
function italicText(text) { return txt(text, { italics: true, color: C.light }); }

function bodyText(text, opts = {}) {
  return para(text, { spaceAfter: opts.spaceAfter || 120, ...opts });
}

// Table helpers
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: C.tableBorder };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function headerCell(text, width) {
  return new TableCell({
    children: [para([txt(text, { bold: true, color: C.white, size: 20 })], { alignment: AlignmentType.CENTER, spaceAfter: 40, spaceBefore: 40 })],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.SOLID, color: C.tableHeader },
    borders: cellBorders,
  });
}

function cell(content, opts = {}) {
  const children = typeof content === "string"
    ? [para([txt(content, { size: 20, color: opts.color || C.dark, bold: opts.bold || false })], { alignment: opts.alignment || AlignmentType.LEFT, spaceAfter: 40, spaceBefore: 40 })]
    : content;
  return new TableCell({
    children,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    borders: cellBorders,
    verticalAlign: opts.verticalAlign,
  });
}

function multiLineCell(lines, opts = {}) {
  return new TableCell({
    children: lines.map(l => para([txt(l, { size: 20, color: opts.color || C.dark })], { spaceAfter: 20, spaceBefore: 20 })),
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    borders: cellBorders,
  });
}

function bulletCell(items, opts = {}) {
  return new TableCell({
    children: items.map(item => new Paragraph({
      children: [txt(item, { size: 20 })],
      bullet: { level: 0 },
      spacing: { before: 20, after: 20 },
    })),
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    borders: cellBorders,
  });
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => headerCell(h, colWidths ? colWidths[i] : undefined)),
    tableHeader: true,
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((c, ci) => {
      if (c instanceof TableCell) return c;
      return cell(String(c), {
        width: colWidths ? colWidths[ci] : undefined,
        shading: ri % 2 === 1 ? C.tableAlt : undefined,
      });
    }),
  }));
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ── Severity badge helpers ──
function severityCell(level, opts = {}) {
  const colors = { CRITICAL: C.critical, HIGH: C.high, MEDIUM: "D4AC0D", LOW: C.low };
  return cell(level, { bold: true, color: C.white, shading: colors[level] || C.muted, ...opts });
}

// ── Build document sections ──
function buildTitlePage() {
  return [
    emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    para([txt("E-Vent Platform", { size: 56, bold: true, color: C.primary })], { alignment: AlignmentType.CENTER, spaceAfter: 60 }),
    para([txt("Comprehensive Revamp & Improvement Plan", { size: 36, color: C.accent })], { alignment: AlignmentType.CENTER, spaceAfter: 200 }),
    para([txt("Test-Driven Development Approach", { size: 28, italics: true, color: C.light })], { alignment: AlignmentType.CENTER, spaceAfter: 400 }),
    para([txt("_____________________________________________", { color: C.accent, size: 24 })], { alignment: AlignmentType.CENTER, spaceAfter: 200 }),
    emptyLine(),
    para([txt("Date: ", { size: 24, color: C.light }), txt("February 25, 2026", { size: 24, bold: true, color: C.dark })], { alignment: AlignmentType.CENTER, spaceAfter: 80 }),
    para([txt("Version: ", { size: 24, color: C.light }), txt("1.0", { size: 24, bold: true, color: C.dark })], { alignment: AlignmentType.CENTER, spaceAfter: 80 }),
    para([txt("Classification: ", { size: 24, color: C.light }), txt("Internal / Confidential", { size: 24, bold: true, color: C.dark })], { alignment: AlignmentType.CENTER, spaceAfter: 80 }),
    emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    para([txt("E-Vent Event Service Booking Marketplace", { size: 20, color: C.muted })], { alignment: AlignmentType.CENTER }),
    para([txt("React Native / Expo + Express.js / MySQL", { size: 20, color: C.muted })], { alignment: AlignmentType.CENTER }),
  ];
}

function buildTOC() {
  return [
    heading("Table of Contents", HeadingLevel.HEADING_1, { pageBreakBefore: true }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-4",
    }),
    emptyLine(),
    para([txt("Note: Update this table of contents after document edits by right-clicking and selecting 'Update Field' in Microsoft Word.", { italics: true, size: 18, color: C.muted })]),
  ];
}

function buildExecutiveSummary() {
  return [
    heading("1. Executive Summary", HeadingLevel.HEADING_1, { pageBreakBefore: true }),
    bodyText([
      txt("E-Vent is a cross-platform event service booking marketplace connecting users with photographers, DJs, venues, caterers, and other event service providers. Built with "),
      boldText("React Native/Expo (frontend)"),
      txt(" and "),
      boldText("Express.js/MySQL (backend)"),
      txt(", the platform supports three user roles: user, provider, and admin."),
    ]),
    bodyText([
      txt("The codebase currently comprises approximately "),
      boldText("75,000 lines of code"),
      txt(" across "),
      boldText("163 frontend files"),
      txt(" and "),
      boldText("80+ API endpoints"),
      txt(". While the platform is a functional minimum viable product (MVP) with core booking, payment, and messaging features operational, a thorough analysis has revealed critical issues across security, architecture, testing, performance, and product completeness that must be addressed before the platform can scale to production use."),
    ]),
    emptyLine(),
    heading("Key Findings at a Glance", HeadingLevel.HEADING_3),
    makeTable(
      ["Area", "Finding", "Severity"],
      [
        ["Security Vulnerabilities", "24 identified (6 critical, including exposed credentials)", "CRITICAL"],
        ["Automated Tests", "Zero test coverage across entire codebase", "CRITICAL"],
        ["CI/CD Pipeline", "No pipeline configured; no automated quality gates", "HIGH"],
        ["Code Quality Tooling", "No linter, formatter, or pre-commit hooks", "HIGH"],
        ["Git Repository Hygiene", "56MB of binaries committed (ngrok, server archives)", "MEDIUM"],
        ["Database Issues", "N+1 query problems, missing transactions", "HIGH"],
        ["Component Complexity", "God components up to 992 lines; style files up to 1,862 lines", "HIGH"],
        ["Trust & Safety", "No disputes, moderation, reporting, or refund systems", "HIGH"],
      ],
      [30, 50, 20]
    ),
    emptyLine(),
    bodyText([
      txt("This document presents a comprehensive, "),
      boldText("phased revamp plan using a Test-Driven Development (TDD) approach"),
      txt(". The plan spans 9 phases over approximately 28 weeks (7 months), progressing from critical emergency fixes through security hardening, architectural improvements, testing infrastructure, performance optimization, product feature completion, and infrastructure hardening."),
    ]),
    bodyText([
      txt("Each phase follows the TDD cycle: "),
      boldText("write tests first"),
      txt(", implement changes to make tests pass, refactor while keeping tests green, and document changes. This approach ensures that the platform remains stable and verifiable throughout the entire transformation."),
    ]),
  ];
}

function buildCurrentStateAssessment() {
  const sections = [];

  // 2. Current State Assessment
  sections.push(heading("2. Current State Assessment", HeadingLevel.HEADING_1, { pageBreakBefore: true }));
  sections.push(bodyText([txt("This section provides a detailed analysis of the platform's current state across architecture, UI/UX, software engineering practices, security, product completeness, and DevOps infrastructure.")]));

  // 2.1 Architecture Overview
  sections.push(heading("2.1 Architecture Overview", HeadingLevel.HEADING_2));
  sections.push(bodyText([txt("The E-Vent platform uses a dual-database strategy with Firebase for authentication and real-time features, and MySQL for all business data.")]));

  sections.push(heading("Frontend Stack", HeadingLevel.HEADING_3));
  sections.push(bullet("React 19 + React Native 0.81 + Expo SDK 54"));
  sections.push(bullet("MVC pattern (models, views, controllers, services, components)"));
  sections.push(bullet("TanStack React Query for server state management"));
  sections.push(bullet("Firebase Authentication (email/password + Google OAuth)"));
  sections.push(bullet("Socket.io for real-time messaging and notifications"));
  sections.push(bullet("Expo Router with role-based redirects"));

  sections.push(heading("Backend Stack", HeadingLevel.HEADING_3));
  sections.push(bullet("Express.js 4.21 with 9 route modules (9,577 total lines)"));
  sections.push(bullet("MySQL database with 23 tables"));
  sections.push(bullet("Firebase Admin SDK for token verification"));
  sections.push(bullet("PayMongo and Dragonpay payment integrations"));
  sections.push(bullet("Socket.io server for real-time features"));

  sections.push(heading("Infrastructure", HeadingLevel.HEADING_3));
  sections.push(bullet("Single-server architecture (no load balancing or clustering)"));
  sections.push(bullet("File uploads stored directly on server filesystem"));
  sections.push(bullet("No CDN for media delivery"));
  sections.push(bullet("No caching layer"));

  // 2.2 UI/UX Findings
  sections.push(heading("2.2 UI/UX Findings", HeadingLevel.HEADING_2));

  sections.push(heading("Theme System", HeadingLevel.HEADING_3));
  sections.push(bodyText([
    txt("A theme system foundation exists with defined colors, spacing, typography, and shadows. However, approximately "),
    boldText("30% of color values remain hardcoded"),
    txt(" throughout the codebase, undermining consistency and making theme changes difficult."),
  ]));

  sections.push(heading("Component Complexity", HeadingLevel.HEADING_3));
  sections.push(bodyText([txt("Several components have grown far beyond maintainable sizes:")]));
  sections.push(makeTable(
    ["File", "Lines", "Issue"],
    [
      ["DashboardView.styles.ts", "1,862", "Largest style file; should be decomposed"],
      ["BookingModal.styles.ts", "992", "Monolithic style definitions"],
      ["MessagingView.tsx", "980", "Multiple concerns in single component"],
      ["Admin User.tsx", "929", "Combines list, detail, and action views"],
      ["BookingWeekCalendar.tsx", "873", "Calendar logic and rendering intertwined"],
      ["BookingModal.tsx", "665", "Modal, date selection, slot selection, confirmation"],
      ["PaymentModal.tsx", "627", "Payment method, confirmation, and status combined"],
    ],
    [35, 15, 50]
  ));

  sections.push(heading("Accessibility", HeadingLevel.HEADING_3));
  sections.push(bullet("Accessibility labels are present on interactive elements"));
  sections.push(bullet([boldText("Missing: "), txt("accessibilityHint on all interactive components")]));
  sections.push(bullet([boldText("Missing: "), txt("Error messages not semantically linked to inputs")]));
  sections.push(bullet([boldText("Missing: "), txt("accessibilityState (disabled, invalid) on form elements")]));

  sections.push(heading("Loading & Error States", HeadingLevel.HEADING_3));
  sections.push(bullet("Skeleton loading components exist but are inconsistently applied across views"));
  sections.push(bullet("Error handling uses ad-hoc Alert.alert() pattern with no unified error UI"));
  sections.push(bullet("No ErrorBoundary components wrapping views"));

  sections.push(heading("Responsive Design", HeadingLevel.HEADING_3));
  sections.push(bullet("useBreakpoints hook exists but is not universally adopted"));
  sections.push(bullet("Some views use inline Dimensions.get('window') calculations instead"));
  sections.push(bullet("No image caching, lazy loading, or optimization strategy"));
  sections.push(bullet("Limited animations and transitions between screens"));

  // 2.3 Software Engineering Findings
  sections.push(heading("2.3 Software Engineering Findings", HeadingLevel.HEADING_2));

  sections.push(heading("Code Quality Issues", HeadingLevel.HEADING_3));
  sections.push(makeTable(
    ["Issue", "Count/Detail", "Impact"],
    [
      ["catch (error: any)", "31 occurrences", "Defeats TypeScript type safety"],
      ["console.log statements", "481 across route files", "Noise in production, potential data leaks"],
      ["AuthController.ts", "700+ lines", "Mixed concerns: auth, HTTP, retry, diagnostics, alerts"],
      ["Direct fetch() calls", "Scattered in hooks", "Bypasses centralized apiClient"],
      ["Hardcoded URLs", "VPS IP + tunnel URLs in source", "Environment coupling"],
      ["NODE_ENV", "Set to 'production' in dev .env", "Incorrect environment behavior"],
      ["tsconfig.json", "Missing strict mode", "Permissive type checking"],
    ],
    [30, 25, 45]
  ));

  sections.push(heading("Backend Architecture Issues", HeadingLevel.HEADING_3));
  sections.push(bullet("N+1 query problems in bookings and services routes (loop of individual queries instead of JOINs)"));
  sections.push(bullet("Missing database transactions for multi-step operations (booking + payment + status update)"));
  sections.push(bullet("No request validation middleware; manual validation scattered across all endpoints"));
  sections.push(bullet("Inconsistent API response format across different route modules"));
  sections.push(bullet("No ErrorBoundary wrapping views for graceful degradation"));

  // 2.4 Security Findings
  sections.push(heading("2.4 Security Findings", HeadingLevel.HEADING_2));
  sections.push(bodyText([
    boldText("24 security vulnerabilities"),
    txt(" were identified across the codebase. These are categorized by severity below."),
  ]));

  sections.push(heading("Critical Vulnerabilities (6)", HeadingLevel.HEADING_3));
  sections.push(makeTable(
    ["#", "Vulnerability", "Description"],
    [
      ["C-1", "Firebase service account key committed", "Full private key in e-vent-aa93e-66eb810582bc.json exposed in git"],
      ["C-2", "PayMongo LIVE secret keys in .env", "Live payment credentials committed to repository"],
      ["C-3", "Vercel OIDC token exposed", "Authentication token in .env.local committed to git"],
      ["C-4", "23+ endpoints without authentication", "Booking endpoints have NO auth middleware applied"],
      ["C-5", "Secret key exposure via API", "GET /api/provider/paymongo-credentials returns secrets without auth"],
      ["C-6", "No HTTPS enforcement", "All traffic transmitted in plaintext"],
    ],
    [8, 30, 62]
  ));

  sections.push(heading("High Vulnerabilities (7)", HeadingLevel.HEADING_3));
  sections.push(makeTable(
    ["#", "Vulnerability", "Description"],
    [
      ["H-1", ".gitignore gaps", ".env files not covered (only .env*.local)"],
      ["H-2", "CORS origin: true", "Allows all origins with credentials"],
      ["H-3", "Rate limiter never applied", "Middleware exists but is not attached to any routes"],
      ["H-4", "No role-based authorization", "Auth only verifies token exists, not user role"],
      ["H-5", "Email parameter not validated", "User email not verified against authenticated user"],
      ["H-6", "Webhook verification bypassed", "PayMongo webhook verifyWebhook() always returns true"],
      ["H-7", "Google API key exposed", "API key visible in google-services.json"],
    ],
    [8, 30, 62]
  ));

  sections.push(heading("Medium Vulnerabilities (11)", HeadingLevel.HEADING_3));
  sections.push(makeTable(
    ["#", "Vulnerability", "Description"],
    [
      ["M-1", "50MB body limit", "Denial-of-service vector via oversized payloads"],
      ["M-2", "Weak random ID generation", "Math.random() used for file identifiers"],
      ["M-3", "No CSRF protection", "Cross-site request forgery possible"],
      ["M-4", "No input sanitization", "XSS and injection possible"],
      ["M-5", "SHA1 in DragonPay", "Should use HMAC-SHA256"],
      ["M-6", "Optional auth silently ignores errors", "Authentication failures pass through"],
    ],
    [8, 30, 62]
  ));

  // 2.5 Product Findings
  sections.push(heading("2.5 Product Findings", HeadingLevel.HEADING_2));

  sections.push(heading("Features Complete", HeadingLevel.HEADING_3));
  sections.push(bullet("User authentication (email/password + Google OAuth)"));
  sections.push(bullet("Service discovery with search and filtering"));
  sections.push(bullet("Booking system with calendar-based availability"));
  sections.push(bullet("Payment processing (PayMongo: GCash, InstaPay, cards + cash)"));
  sections.push(bullet("Real-time messaging between users and providers"));
  sections.push(bullet("Provider tools (service management, booking management, analytics)"));
  sections.push(bullet("Admin panel (user management, provider approval, platform analytics)"));
  sections.push(bullet("Service packages and custom pricing"));
  sections.push(bullet("Invoice generation (PDF)"));
  sections.push(bullet("Hiring/proposal system"));

  sections.push(heading("Features Partially Complete", HeadingLevel.HEADING_3));
  sections.push(bullet("Push notifications (registered but inconsistent delivery)"));
  sections.push(bullet("Hiring proposals (basic flow, missing refinements)"));
  sections.push(bullet("Admin messaging tools (limited functionality)"));

  sections.push(heading("Critical Missing Features", HeadingLevel.HEADING_3));
  sections.push(makeTable(
    ["Feature", "Completion", "Priority", "Impact"],
    [
      ["Dispute resolution system", "0%", "CRITICAL", "Users cannot resolve booking conflicts"],
      ["Review moderation", "0%", "HIGH", "No protection against fake/abusive reviews"],
      ["User/service reporting", "0%", "HIGH", "No mechanism to report bad actors"],
      ["Email notifications", "0%", "HIGH", "Users miss critical booking updates"],
      ["Refund processing", "0%", "HIGH", "No refund capability for cancelled bookings"],
      ["User identity verification", "0%", "MEDIUM", "No trust signals for providers"],
      ["Booking reminders", "0%", "MEDIUM", "Users may forget upcoming events"],
      ["Favorites/wishlist", "0%", "LOW", "No way to save services for later"],
      ["Onboarding flow", "0%", "MEDIUM", "New users lack guidance"],
      ["Advanced analytics with charts", "0%", "LOW", "No visual data representation"],
    ],
    [30, 15, 15, 40]
  ));

  // 2.6 DevOps & Infrastructure
  sections.push(heading("2.6 DevOps & Infrastructure Findings", HeadingLevel.HEADING_2));
  sections.push(makeTable(
    ["Area", "Current State", "Impact"],
    [
      ["CI/CD", "No pipeline (no .github/workflows)", "No automated quality gates; manual deploys"],
      ["Repository Size", "56.2MB binaries (ngrok.exe, server.zip, ngrok.zip)", "Slow clones, wasted storage"],
      ["Temp Files", "Build artifacts and shortcuts in root", "Cluttered repository"],
      ["Code Quality", "No ESLint, Prettier, or git hooks", "Inconsistent code style"],
      ["Logging", "481 console.log statements", "No structured logs; difficult debugging"],
      ["Error Tracking", "No Sentry, Rollbar, or equivalent", "Errors go undetected in production"],
      ["APM/Monitoring", "No monitoring or alerting", "No visibility into performance"],
      ["DB Migrations", "Raw SQL files, no versioning/rollback", "Risky schema changes"],
      ["Architecture", "Single server, no load balancing", "Single point of failure"],
      ["DB Pool", "10 connections, unbounded queue", "Connection exhaustion under load"],
      ["Compression", "No compression middleware", "Larger response payloads"],
      ["Caching", "No cache headers on API responses", "Unnecessary repeat requests"],
      ["CDN", "No CDN for media files", "Slow image delivery"],
      ["Socket.io", "Not configured for clustering", "Cannot scale real-time features"],
    ],
    [20, 35, 45]
  ));

  return sections;
}

function buildPhase0() {
  const s = [];
  s.push(heading("3. Revamp Plan -- Phased Approach (TDD)", HeadingLevel.HEADING_1, { pageBreakBefore: true }));
  s.push(bodyText([
    txt("Each phase follows the Test-Driven Development cycle: "),
    boldText("(1) Write tests FIRST"),
    txt(" -- "),
    boldText("(2) Implement changes"),
    txt(" to make tests pass -- "),
    boldText("(3) Refactor"),
    txt(" while keeping tests green -- "),
    boldText("(4) Document changes"),
    txt("."),
  ]));
  s.push(emptyLine());

  // PHASE 0
  s.push(heading("PHASE 0: Foundation & Emergency Fixes (Week 1-2)", HeadingLevel.HEADING_2));
  s.push(para([
    txt("Priority: ", { size: 22 }),
    txt("CRITICAL", { bold: true, color: C.critical, size: 22 }),
    txt(" -- Must complete before any other work", { size: 22 }),
  ]));
  s.push(emptyLine());

  // 0.1
  s.push(heading("0.1 Security Emergency", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("Write tests that verify secrets are not present in source code, .gitignore covers all sensitive file patterns.")]));
  s.push(bodyText([boldText("Actions:")]));
  s.push(bullet("Rotate ALL compromised credentials immediately (Firebase service account, PayMongo live keys, Vercel OIDC token, database credentials)"));
  s.push(bullet("Remove secrets from git history using BFG Repo Cleaner or git filter-repo"));
  s.push(bullet("Update .gitignore to cover: .env, *.exe, *.zip, Firebase JSON, google-services.json"));
  s.push(bullet("Remove binaries from repository (ngrok.exe 25MB, server.zip 22MB, ngrok.zip 9.2MB)"));
  s.push(bullet("Remove temporary files (D:Event* files, .lnk shortcut files)"));
  s.push(bullet("Create .env.example with placeholder values for all required environment variables"));
  s.push(bullet("Set NODE_ENV=development in local .env file"));

  // 0.2
  s.push(heading("0.2 Development Tooling Setup", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Actions:")]));
  s.push(bullet("Install and configure ESLint with TypeScript-specific rules (@typescript-eslint)"));
  s.push(bullet("Install and configure Prettier for consistent code formatting"));
  s.push(bullet("Install Husky + lint-staged for pre-commit hooks (lint and format on commit)"));
  s.push(bullet("Enable TypeScript strict mode in tsconfig.json (strict: true, noImplicitAny, strictNullChecks)"));
  s.push(bullet("Configure Jest + React Testing Library + Supertest as test framework"));
  s.push(bullet("Add npm scripts: test, test:watch, test:coverage, lint, lint:fix, format"));

  // 0.3
  s.push(heading("0.3 CI/CD Pipeline", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("Pipeline itself validates on every push; failed CI blocks merges.")]));
  s.push(bodyText([boldText("Actions:")]));
  s.push(bullet("Create .github/workflows/ci.yml: lint -> type-check -> test -> build"));
  s.push(bullet("Create .github/workflows/deploy.yml: staging and production deployment"));
  s.push(bullet("Configure branch protection rules (require PR reviews, passing CI before merge)"));
  s.push(bullet("Set up environment secrets in GitHub Actions (never hardcode in workflow files)"));

  // 0.4
  s.push(heading("0.4 Structured Logging", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("Verify logger outputs JSON format, respects log levels, includes request ID.")]));
  s.push(bodyText([boldText("Actions:")]));
  s.push(bullet("Install Winston or Pino structured logger"));
  s.push(bullet("Replace all 481 console.log/error statements with structured logger calls"));
  s.push(bullet("Add request ID middleware for distributed tracing"));
  s.push(bullet("Configure log levels (debug/info/warn/error) per environment"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 0 Deliverables: "), txt("Clean repository, CI/CD working, test framework ready, structured logging, all secrets rotated.")]));

  return s;
}

function buildPhase1() {
  const s = [];
  s.push(heading("PHASE 1: Backend Security & Stability (Week 3-4)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("CRITICAL", { bold: true, color: C.critical, size: 22 })]));
  s.push(emptyLine());

  // 1.1
  s.push(heading("1.1 Authentication Middleware", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Unauthenticated requests to protected endpoints return 401"));
  s.push(bullet("Invalid tokens return 403"));
  s.push(bullet("Valid tokens allow access and attach user context"));
  s.push(bullet("Role-based access: user cannot access /admin/*, provider cannot access /admin/*"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Apply authMiddleware to ALL /api/user/*, /api/provider/*, /api/admin/*, /api/bookings/* endpoints"));
  s.push(bullet("Add roleMiddleware('admin') to admin routes, roleMiddleware('provider') to provider routes"));
  s.push(bullet("Validate email parameter matches authenticated user's email on user-specific endpoints"));
  s.push(bullet("Remove PayMongo credentials from GET response (never expose secrets to client)"));

  // 1.2
  s.push(heading("1.2 Input Validation", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Malformed email addresses are rejected with descriptive error"));
  s.push(bullet("SQL special characters in inputs do not cause errors or injection"));
  s.push(bullet("Oversized payloads (>5MB) are rejected with 413 status"));
  s.push(bullet("Required fields are enforced; missing fields return 400 with field names"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Install express-validator or Joi for schema-based validation"));
  s.push(bullet("Create validation schemas for all 80+ endpoints"));
  s.push(bullet("Reduce body limit from 50MB to 5MB (configurable per route for file uploads)"));
  s.push(bullet("Add input sanitization (DOMPurify or sanitize-html) for all user-provided text"));

  // 1.3
  s.push(heading("1.3 Rate Limiting", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Exceeding rate limit returns 429 Too Many Requests with retry-after header"));
  s.push(bullet("Rate limit resets after the configured window period"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Apply rate limiter to: register (5/hour), login (10/hour), payment (3/hour), search (100/min)"));
  s.push(bullet("Use Redis-backed rate limiter for production; in-memory for development"));

  // 1.4
  s.push(heading("1.4 CORS Hardening", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Unknown origins are rejected with appropriate error response"));
  s.push(bullet("Whitelisted origins work correctly with credentials"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Replace origin: true with explicit whitelist of allowed domains"));
  s.push(bullet("Use environment-specific CORS configuration (production-cors.js)"));

  // 1.5
  s.push(heading("1.5 HTTPS & Security Headers", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Configure HTTPS with SSL certificates (Let's Encrypt with auto-renewal)"));
  s.push(bullet("Add Helmet.js for security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)"));
  s.push(bullet("Force HTTPS redirect for all HTTP requests"));

  // 1.6
  s.push(heading("1.6 Webhook Verification", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Invalid webhook signatures are rejected (return 400)"));
  s.push(bullet("Valid webhook signatures are accepted and processed"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Implement HMAC-SHA256 verification for PayMongo webhooks (replace always-true function)"));
  s.push(bullet("Migrate DragonPay from SHA1 to HMAC-SHA256"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 1 Deliverables: "), txt("All endpoints authenticated, input validated, rate limited, CORS restricted, HTTPS enforced, webhooks verified.")]));

  return s;
}

function buildPhase2() {
  const s = [];
  s.push(heading("PHASE 2: Database & API Layer (Week 5-7)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("HIGH", { bold: true, color: C.high, size: 22 })]));
  s.push(emptyLine());

  // 2.1
  s.push(heading("2.1 Database Migration System", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("Verify migrations run forward and rollback correctly; verify idempotency.")]));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Install db-migrate or Knex.js migration system"));
  s.push(bullet("Convert all raw SQL files to versioned, timestamped migrations"));
  s.push(bullet("Add migration CLI commands: migrate:up, migrate:down, migrate:status"));
  s.push(bullet("Create seed data for development and testing environments"));

  // 2.2
  s.push(heading("2.2 Fix N+1 Queries", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Performance tests measuring query count for list endpoints"));
  s.push(bullet("GET /bookings executes 3 or fewer queries (not N+1)"));
  s.push(bullet("GET /services executes 3 or fewer queries"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Replace query loops with JOIN queries in bookings.js, services.js, hiring.js"));
  s.push(bullet("Remove runtime INFORMATION_SCHEMA column checks (cache schema at startup)"));
  s.push(bullet("Replace correlated subqueries with LEFT JOINs"));

  // 2.3
  s.push(heading("2.3 Transaction Safety", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Partial booking creation rolls back completely (booking + services + payment in single transaction)"));
  s.push(bullet("Firebase + MySQL user creation handles failures atomically"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Wrap multi-step operations in BEGIN/COMMIT/ROLLBACK blocks"));
  s.push(bullet("Key areas: booking creation, payment processing, user registration"));
  s.push(bullet("Implement connection.beginTransaction() pattern consistently"));

  // 2.4
  s.push(heading("2.4 API Response Standardization", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("All endpoints return consistent { ok, data, error, code } format"));
  s.push(bullet("Error responses include machine-readable error codes for i18n"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Create response helpers: sendSuccess(res, data), sendError(res, code, message, status)"));
  s.push(bullet("Refactor all 80+ endpoints to use standardized helpers"));
  s.push(bullet("Document response format in OpenAPI specification"));

  // 2.5
  s.push(heading("2.5 Database Connection Pool Optimization", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Increase connectionLimit from 10 to 50 (configurable via environment variable)"));
  s.push(bullet("Set queueLimit to 100 (bounded queue to prevent memory exhaustion)"));
  s.push(bullet("Add connection timeout: 5000ms"));
  s.push(bullet("Add idle timeout configuration to release unused connections"));

  // 2.6
  s.push(heading("2.6 Pagination", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("List endpoints respect page/limit query parameters"));
  s.push(bullet("Limit is capped at 100 to prevent oversized responses"));
  s.push(bullet("Response includes total count and pagination metadata"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Add pagination to all list endpoints (services, bookings, users, notifications, conversations)"));
  s.push(bullet("Cap page size at 100; default to 20"));
  s.push(bullet("Return { data, pagination: { page, limit, total, totalPages } }"));

  // 2.7
  s.push(heading("2.7 Backend Architecture Refactor", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("All existing endpoint tests continue to pass after refactoring.")]));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Extract route files into Controller + Service layers"));
  s.push(bullet("routes/bookings.js -> controllers/bookingController.js + services/bookingService.js"));
  s.push(bullet("Same pattern for: users, hiring, messaging, notifications, packages, admin, analytics"));
  s.push(bullet("Move business logic from routes to services; move validation to middleware"));
  s.push(bullet("Target: max 100 lines per route file, max 300 lines per service file"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 2 Deliverables: "), txt("Versioned migrations, no N+1 queries, transaction safety, consistent API responses, pagination, clean backend architecture.")]));

  return s;
}

function buildPhase3() {
  const s = [];
  s.push(heading("PHASE 3: Frontend Architecture & TypeScript (Week 8-10)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("HIGH", { bold: true, color: C.high, size: 22 })]));
  s.push(emptyLine());

  // 3.1
  s.push(heading("3.1 TypeScript Strict Mode", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("npm run type-check passes with zero errors.")]));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Enable strict: true, noImplicitAny, strictNullChecks, noUnusedLocals, noUnusedParameters"));
  s.push(bullet("Replace all 31 catch (error: any) instances with catch (error: unknown) and proper type narrowing"));
  s.push(bullet("Fix all resulting type errors (estimated 200-400 errors)"));
  s.push(bullet("Replace [key: string]: any in ApiResponse with explicit typed fields"));
  s.push(bullet("Add proper TypeScript types for all API request and response shapes"));

  // 3.2
  s.push(heading("3.2 Error Boundary System", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("ErrorBoundary catches render errors and displays fallback UI"));
  s.push(bullet("Error is reported to tracking service (Sentry)"));
  s.push(bullet("Retry/reload functionality works from error fallback"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Create reusable ErrorBoundary component with configurable fallback UI"));
  s.push(bullet("Wrap all view components in ErrorBoundary"));
  s.push(bullet("Integrate with Sentry for automated error reporting with source maps"));

  // 3.3
  s.push(heading("3.3 AuthController Refactor", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Login flow (Firebase + MySQL sync) succeeds and fails gracefully"));
  s.push(bullet("Registration flow creates user in both systems"));
  s.push(bullet("Google OAuth flow completes successfully"));
  s.push(bullet("Error handling: network failure, MySQL failure, Firebase failure each handled"));
  s.push(bullet("Cleanup on partial failure (orphaned Firebase user deleted on MySQL failure)"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Split AuthController.ts (700+ lines) into:"));
  s.push(bullet("AuthController.ts -- state management only (~150 lines)", { level: 1 }));
  s.push(bullet("AuthService.ts -- API calls (~200 lines)", { level: 1 }));
  s.push(bullet("NetworkDiagnosticsService.ts -- error diagnosis (~100 lines)", { level: 1 }));
  s.push(bullet("RetryService.ts -- retry logic with backoff (~50 lines)", { level: 1 }));
  s.push(bullet("Fix Firebase+MySQL race condition: create MySQL entry FIRST, then Firebase"));

  // 3.4
  s.push(heading("3.4 API Client Centralization", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("apiClient adds auth headers automatically to all requests"));
  s.push(bullet("Retry on 5xx errors with exponential backoff (3 retries)"));
  s.push(bullet("401 handling triggers auto-logout and redirect to login"));
  s.push(bullet("Request/response interceptors fire correctly"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Add auth token interceptor to apiClient.ts"));
  s.push(bullet("Add retry logic: 3 retries with exponential backoff for 5xx errors"));
  s.push(bullet("Add global 401 handler (redirect to login)"));
  s.push(bullet("Replace all direct fetch() calls in hooks with apiClient"));
  s.push(bullet("Add request/response logging in development mode"));

  // 3.5
  s.push(heading("3.5 Component Decomposition", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST: "), txt("Each extracted component renders correctly; each extracted hook returns expected data.")]));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(makeTable(
    ["Current Component", "Lines", "Decomposed Into"],
    [
      ["BookingModal.tsx", "665", "BookingModalLayout + BookingDateSelector + BookingSlotSelector + BookingConfirmation"],
      ["BookingWeekCalendar.tsx", "873", "Extract slot logic to useBookingWeekCalendar hook"],
      ["PaymentModal.tsx", "627", "PaymentMethodSelector + PaymentConfirmation + PaymentStatus"],
      ["MessagingView.tsx", "980", "ConversationList + MessageThread + MessageInput + MessageBubble"],
      ["Admin User.tsx", "929", "UserList + UserDetail + UserActions"],
    ],
    [25, 10, 65]
  ));

  // 3.6
  s.push(heading("3.6 Style System Enforcement", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("Lint rules catch hardcoded color values and spacing constants.")]));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Audit all .styles.ts files for hardcoded values; replace remaining ~30% with theme tokens"));
  s.push(bullet("Add missing theme tokens (Google blue, category colors, featured gold, divider colors)"));
  s.push(bullet("Refactor DashboardView.styles.ts (1,862 lines -> target 600 lines)"));
  s.push(bullet("Standardize responsive design: use useBreakpoints everywhere; remove inline Dimensions calculations"));
  s.push(bullet("Create style utility functions for common patterns (card, list item, form field)"));

  // 3.7
  s.push(heading("3.7 Navigation & State Management", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Replace prop drilling (20+ handler props in DashboardView) with NavigationContext"));
  s.push(bullet("Add proper deep linking support for all routes"));
  s.push(bullet("Ensure consistent back navigation in nested flows"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 3 Deliverables: "), txt("Strict TypeScript, error boundaries, clean controllers, centralized API client, decomposed components, enforced theme system.")]));

  return s;
}

function buildPhase4() {
  const s = [];
  s.push(heading("PHASE 4: Testing Infrastructure (Week 11-13)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("HIGH", { bold: true, color: C.high, size: 22 }), txt(" -- This phase runs partly in parallel with Phase 3.", { size: 22 })]));
  s.push(emptyLine());

  // 4.1
  s.push(heading("4.1 Unit Tests (Target: 80% Coverage on Business Logic)", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Backend:")]));
  s.push(bullet("Test all service functions (bookingService, paymentService, userService, etc.)"));
  s.push(bullet("Test all middleware (auth, validation, rate limiting, error handler)"));
  s.push(bullet("Test database queries with dedicated test database"));
  s.push(bullet("Test payment webhook processing logic"));
  s.push(bullet("Test invoice generation output"));
  s.push(bodyText([boldText("Frontend:")]));
  s.push(bullet("Test all custom hooks (useBookingCost, useBookingSlots, useDashboardData, etc.)"));
  s.push(bullet("Test all controllers (AuthController, HiringController, MessagingController)"));
  s.push(bullet("Test all models (AuthState, User, Service, FormData, etc.)"));
  s.push(bullet("Test utility functions"));

  // 4.2
  s.push(heading("4.2 Integration Tests", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Backend (using Supertest with test database):")]));
  s.push(bullet("Complete booking flow: create -> confirm -> pay -> complete -> rate"));
  s.push(bullet("Authentication flow: register -> login -> access protected endpoint"));
  s.push(bullet("Provider flow: apply -> approve -> create service -> receive booking"));
  s.push(bullet("Messaging flow: create conversation -> send message -> mark read"));
  s.push(bullet("Payment flow: create payment -> webhook -> update status"));

  // 4.3
  s.push(heading("4.3 Component Tests", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Frontend (using React Testing Library with mock API responses):")]));
  s.push(bullet("Test all UI components (Button, Input, Card, Badge, Avatar, Skeleton, etc.)"));
  s.push(bullet("Test all modal components (BookingModal, PaymentModal, RatingModal, etc.)"));
  s.push(bullet("Test all view components (DashboardView, BookingView, ProfileView, etc.)"));

  // 4.4
  s.push(heading("4.4 End-to-End Tests", HeadingLevel.HEADING_3));
  s.push(bodyText([txt("Set up Detox (mobile) or Playwright (web) for critical user flows:")]));
  s.push(bullet("User registration and login"));
  s.push(bullet("Browse services and complete a booking"));
  s.push(bullet("Payment completion (full flow)"));
  s.push(bullet("Messaging between user and provider"));
  s.push(bullet("Provider creates and manages a service listing"));
  s.push(bullet("Admin approves a provider application"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 4 Deliverables: "), txt("80%+ unit test coverage, integration test suite, component test suite, E2E tests for all critical paths.")]));

  return s;
}

function buildPhase5() {
  const s = [];
  s.push(heading("PHASE 5: Performance & Scalability (Week 14-16)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("HIGH", { bold: true, color: C.high, size: 22 })]));
  s.push(emptyLine());

  // 5.1
  s.push(heading("5.1 Backend Performance", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Load test: 500 concurrent users, < 200ms p95 response time"));
  s.push(bullet("Compression reduces response sizes by at least 60%"));
  s.push(bullet("Cache-Control headers present on appropriate responses"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Add compression middleware (gzip/brotli)"));
  s.push(bullet("Add Cache-Control headers (services: 1hr, images: 24hr, user-specific: no-cache)"));
  s.push(bullet("Add ETag support for conditional requests"));
  s.push(bullet("Configure PM2 or Node.js cluster mode for multi-core utilization"));
  s.push(bullet("Optimize database indexes based on EXPLAIN analysis of slow queries"));

  // 5.2
  s.push(heading("5.2 Frontend Performance", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("Measure bundle size, initial load time, and time to interactive.")]));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Analyze and reduce bundle size (target: < 2MB compressed)"));
  s.push(bullet("Implement image caching strategy using expo-image or FastImage"));
  s.push(bullet("Add lazy loading for off-screen images"));
  s.push(bullet("Add React.memo, useMemo, useCallback to prevent unnecessary re-renders"));
  s.push(bullet("Implement code splitting for role-based views (user/provider/admin)"));
  s.push(bullet("Apply skeleton loading consistently across all data-fetching views"));

  // 5.3
  s.push(heading("5.3 Caching Layer", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Cache hit returns data without database query"));
  s.push(bullet("Cache invalidation on create/update/delete refreshes cached data"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Add Redis for server-side caching"));
  s.push(bullet("Cache frequently accessed data: service listings, provider profiles, categories"));
  s.push(bullet("Implement cache invalidation on mutation operations"));
  s.push(bullet("Configure TanStack React Query stale times per query type"));

  // 5.4
  s.push(heading("5.4 CDN & Media Optimization", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Set up Cloudflare or CloudFront for static assets and uploaded images"));
  s.push(bullet("Implement image resizing on upload (thumbnail 150px, medium 600px, full 1200px)"));
  s.push(bullet("Add WebP format support with fallback to JPEG"));
  s.push(bullet("Configure proper CORS headers for CDN origin"));

  // 5.5
  s.push(heading("5.5 Database Scalability", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Configure MySQL replication (primary for writes + read replica for queries)"));
  s.push(bullet("Increase connection pool based on load testing results"));
  s.push(bullet("Add connection monitoring and alerting (pool exhaustion, slow queries)"));
  s.push(bullet("Implement slow query logging and periodic analysis"));

  // 5.6
  s.push(heading("5.6 Socket.io Scaling", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests: "), txt("Test real-time messaging with 100+ concurrent users.")]));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Add Redis adapter for Socket.io (enable multi-server broadcasts)"));
  s.push(bullet("Configure namespace segregation: /bookings, /messaging, /notifications"));
  s.push(bullet("Load test WebSocket connections and message throughput"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 5 Deliverables: "), txt("< 200ms API p95, < 2MB bundle, Redis caching, CDN for media, database replication, Socket.io clustering.")]));

  return s;
}

function buildPhase6() {
  const s = [];
  s.push(heading("PHASE 6: Product Features -- Trust & Safety (Week 17-20)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("HIGH", { bold: true, color: C.high, size: 22 }), txt(" -- Critical for marketplace trust and user safety.", { size: 22 })]));
  s.push(emptyLine());

  // 6.1
  s.push(heading("6.1 Dispute Resolution System", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Dispute creation flow creates record with correct status"));
  s.push(bullet("Admin review and resolution updates dispute status"));
  s.push(bullet("Refund processing triggers on dispute resolution"));
  s.push(bullet("Notifications sent to both parties on status changes"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Database: Create dispute table (id, booking_id, reporter_id, reported_id, reason, evidence, status, resolution, admin_notes, created_at, resolved_at)"));
  s.push(bullet("Backend: CRUD endpoints for disputes + admin resolution endpoints"));
  s.push(bullet("Frontend (User): 'Report Issue' button on completed/confirmed bookings, dispute filing form with evidence upload"));
  s.push(bullet("Frontend (Admin): Dispute queue, review interface, resolution actions (refund, warning, ban)"));
  s.push(bullet("Notifications: Email + in-app notifications for dispute status changes"));

  // 6.2
  s.push(heading("6.2 Review Moderation", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Flagging a review increments flag_count and triggers moderation queue"));
  s.push(bullet("Admin moderation queue shows flagged reviews"));
  s.push(bullet("Provider can respond to reviews (response appears under review)"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Add flag_count, is_hidden, admin_reviewed fields to service_review table"));
  s.push(bullet("Backend: Flag review endpoint, admin moderation endpoints (approve, hide, delete)"));
  s.push(bullet("Frontend: Flag button on reviews, provider response form, admin moderation queue"));
  s.push(bullet("Auto-flag reviews with excessive negative keywords for admin review"));

  // 6.3
  s.push(heading("6.3 User & Service Reporting", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Reporting a user/service creates report record"));
  s.push(bullet("Admin report queue displays pending reports"));
  s.push(bullet("Auto-suspension triggers after configurable report threshold"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Database: Create report table (id, reporter_id, reported_type, reported_id, reason, details, status, admin_action)"));
  s.push(bullet("Backend: Report creation + admin review endpoints"));
  s.push(bullet("Frontend: Report button on user profiles and service pages with reason selection"));
  s.push(bullet("Auto-suspend after N reports threshold (configurable per report type)"));

  // 6.4
  s.push(heading("6.4 Refund Processing", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Full refund flow processes correctly via PayMongo API"));
  s.push(bullet("Partial refund calculates correctly based on cancellation policy"));
  s.push(bullet("Refund status updates are reflected in booking record"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Backend: Refund endpoint with PayMongo API integration"));
  s.push(bullet("Configurable cancellation policies per service (percentage refund vs. days before event)"));
  s.push(bullet("Automatic refund calculation based on policy"));
  s.push(bullet("Frontend: Request refund (user), approve/deny (provider), override (admin)"));

  // 6.5
  s.push(heading("6.5 Email Notification System", HeadingLevel.HEADING_3));
  s.push(bodyText([boldText("Tests FIRST:")]));
  s.push(bullet("Email sends on booking confirmation with correct template"));
  s.push(bullet("Payment receipt email contains accurate amounts"));
  s.push(bullet("Email templates render correctly with dynamic data"));
  s.push(bodyText([boldText("Implementation:")]));
  s.push(bullet("Integrate SendGrid or Nodemailer for transactional email"));
  s.push(bullet("Create templates: booking confirmation, payment receipt, cancellation, provider approval/rejection, message notification, booking reminder (24hr before)"));
  s.push(bullet("Add notification preferences (users can toggle email/push per event type)"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 6 Deliverables: "), txt("Dispute resolution, review moderation, reporting system, refund processing, email notifications.")]));

  return s;
}

function buildPhase7() {
  const s = [];
  s.push(heading("PHASE 7: Product Features -- Engagement & Polish (Week 21-24)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("MEDIUM", { bold: true, color: "D4AC0D", size: 22 })]));
  s.push(emptyLine());

  const features = [
    { title: "7.1 User Identity Verification", items: [
      "Phone number verification via OTP (SMS gateway integration)",
      "ID document upload and admin verification workflow",
      "Verified badge displayed on user profiles",
      "Trust score/reputation system based on completed bookings and reviews",
    ]},
    { title: "7.2 Onboarding Flow", items: [
      "Guided walkthrough for first-time users (3-5 screens covering key features)",
      "Provider setup wizard (step-by-step service creation with validation)",
      "Contextual tooltips on first use of major features",
    ]},
    { title: "7.3 Favorites & Wishlist", items: [
      "Database: Create favorites table (user_id, service_id, created_at)",
      "Save services for later with single-tap heart icon",
      "Favorites page with quick book action and availability indicator",
    ]},
    { title: "7.4 Booking Reminders", items: [
      "Automated 24-hour reminder before event (push notification + email)",
      "Post-completion rating prompt (24 hours after event ends)",
      "Follow-up for cancelled bookings (suggest alternative services)",
    ]},
    { title: "7.5 Advanced Analytics", items: [
      "Charts and visualizations using react-native-chart-kit or Victory Native",
      "Revenue breakdown by service category, time period, and payment method",
      "Booking trends and conversion funnel visualization",
      "Provider performance dashboard with comparison metrics",
      "CSV and PDF export of analytical reports",
    ]},
    { title: "7.6 Search & Discovery Enhancements", items: [
      "Sort by: rating, price (ascending/descending), newest, popularity",
      "Saved searches with optional email alerts for new matches",
      "\"Recently viewed\" section on dashboard for quick access",
      "Map-based service browsing using react-native-maps",
      "Recommendation engine (\"people who booked this also booked...\")",
    ]},
    { title: "7.7 Accessibility Completion", items: [
      "Add accessibilityHint to all interactive components",
      "Link error messages to inputs semantically (accessibilityDescribedBy)",
      "Add accessibilityState (disabled, invalid) to all form elements",
      "Screen reader testing on iOS VoiceOver and Android TalkBack",
      "Keyboard navigation for web version (tab order, focus management)",
      "Color contrast audit for WCAG 2.1 AA compliance",
    ]},
    { title: "7.8 UI Polish", items: [
      "Page transition animations (shared element transitions between screens)",
      "Pull-to-refresh with haptic feedback on supported devices",
      "Smooth list animations using LayoutAnimation",
      "Image loading states with blur-up progressive effect",
      "Toast notifications to replace Alert.alert() calls",
      "Consistent empty states across all list views with illustrations",
    ]},
  ];

  for (const f of features) {
    s.push(heading(f.title, HeadingLevel.HEADING_3));
    for (const item of f.items) {
      s.push(bullet(item));
    }
  }

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 7 Deliverables: "), txt("Identity verification, onboarding, favorites, reminders, analytics charts, search improvements, full accessibility, UI polish.")]));

  return s;
}

function buildPhase8() {
  const s = [];
  s.push(heading("PHASE 8: Infrastructure Hardening & Documentation (Week 25-28)", HeadingLevel.HEADING_2, { pageBreakBefore: true }));
  s.push(para([txt("Priority: ", { size: 22 }), txt("MEDIUM", { bold: true, color: "D4AC0D", size: 22 })]));
  s.push(emptyLine());

  // 8.1
  s.push(heading("8.1 Production Infrastructure", HeadingLevel.HEADING_3));
  s.push(bullet("Set up load balancer (nginx or Traefik) with health check routing"));
  s.push(bullet("Configure Docker Compose for local development (app + MySQL + Redis)"));
  s.push(bullet("Create Kubernetes manifests for production deployment"));
  s.push(bullet("Configure automated database backups (daily, with 30-day retention)"));
  s.push(bullet("Create disaster recovery plan and operational runbook"));

  // 8.2
  s.push(heading("8.2 Monitoring & Observability", HeadingLevel.HEADING_3));
  s.push(bullet("Integrate Sentry for error tracking (frontend + backend, with source maps)"));
  s.push(bullet("Set up APM using New Relic or Datadog for performance monitoring"));
  s.push(bullet("Create Grafana monitoring dashboards (request rate, latency, error rate, DB health)"));
  s.push(bullet("Configure alerts: error rate > 1%, p95 > 500ms, DB connections > 80% pool"));
  s.push(bullet("Add health check endpoints (/health, /ready) for all services"));

  // 8.3
  s.push(heading("8.3 API Documentation", HeadingLevel.HEADING_3));
  s.push(bullet("Generate OpenAPI/Swagger specification for all 80+ endpoints"));
  s.push(bullet("Deploy interactive API documentation (Swagger UI)"));
  s.push(bullet("Include request/response examples for every endpoint"));
  s.push(bullet("Document authentication requirements and rate limiting per endpoint"));

  // 8.4
  s.push(heading("8.4 Developer Documentation", HeadingLevel.HEADING_3));
  s.push(bullet("Architecture Decision Records (ADRs) for all major technical decisions"));
  s.push(bullet("Development setup guide (step-by-step, including prerequisites)"));
  s.push(bullet("Deployment procedures for staging and production environments"));
  s.push(bullet("Database schema documentation with entity-relationship diagrams"));
  s.push(bullet("Troubleshooting guide for common development and production issues"));
  s.push(bullet("Contributing guidelines and code review checklist"));

  // 8.5
  s.push(heading("8.5 Security Audit & Compliance", HeadingLevel.HEADING_3));
  s.push(bullet("Run OWASP ZAP automated security scan"));
  s.push(bullet("npm audit on all dependencies; resolve all critical and high vulnerabilities"));
  s.push(bullet("Penetration testing on critical flows (auth, payment, admin)"));
  s.push(bullet("GDPR compliance review (data retention policies, user deletion, data export)"));
  s.push(bullet("Create security incident response plan"));

  s.push(emptyLine());
  s.push(bodyText([boldText("Phase 8 Deliverables: "), txt("Production infrastructure, monitoring and alerting, full API documentation, developer documentation, security audit passed.")]));

  return s;
}

function buildSuccessMetrics() {
  const s = [];
  s.push(heading("4. Success Metrics", HeadingLevel.HEADING_1, { pageBreakBefore: true }));
  s.push(bodyText([txt("The following metrics define measurable targets for each major phase checkpoint. These should be tracked continuously and reviewed at the end of each phase.")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["Metric", "Current", "Phase 2 Target", "Phase 4 Target", "Phase 8 Target"],
    [
      ["Test Coverage", "0%", "30%", "80%", "90%"],
      ["Security Vulnerabilities", "24 (6 critical)", "0 critical", "0 high", "0 medium"],
      ["API Response Time (p95)", "Unknown", "< 500ms", "< 200ms", "< 100ms"],
      ["Bundle Size (compressed)", "Unknown", "< 5MB", "< 3MB", "< 2MB"],
      ["Lighthouse Score (web)", "Unknown", "> 60", "> 80", "> 90"],
      ["Uptime SLA", "Unknown", "99%", "99.5%", "99.9%"],
      ["Max File Length (lines)", "1,862", "< 800", "< 500", "< 300"],
      ["CI/CD Pipeline", "None", "Working", "Full", "Full + canary"],
    ],
    [22, 18, 20, 20, 20]
  ));

  return s;
}

function buildRiskAssessment() {
  const s = [];
  s.push(heading("5. Risk Assessment", HeadingLevel.HEADING_1, { pageBreakBefore: true }));
  s.push(bodyText([txt("The following risks have been identified for the revamp initiative. Each risk includes probability, impact, and mitigation strategies.")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["Risk", "Probability", "Impact", "Mitigation Strategy"],
    [
      ["Breaking existing functionality during refactor", "HIGH", "HIGH", "TDD approach; comprehensive test suite written before any changes"],
      ["Credential compromise before rotation completes", "HIGH", "CRITICAL", "Immediate rotation in Phase 0 as absolute first action"],
      ["Team resistance to strict TypeScript adoption", "MEDIUM", "MEDIUM", "Incremental adoption; training sessions; lint rules phased in"],
      ["Database migration failures in production", "MEDIUM", "HIGH", "Test all migrations on staging; always have rollback scripts"],
      ["Payment flow disruption during refactor", "LOW", "CRITICAL", "Feature flags; A/B testing; canary deployments for payment changes"],
      ["Scope creep in product feature phases", "HIGH", "MEDIUM", "Strict phase boundaries; MVP scope for each feature; defer nice-to-haves"],
    ],
    [25, 12, 12, 51]
  ));

  return s;
}

function buildTechRecommendations() {
  const s = [];
  s.push(heading("6. Technology Recommendations", HeadingLevel.HEADING_1, { pageBreakBefore: true }));
  s.push(bodyText([txt("The following technology recommendations address gaps identified in the current state assessment. Each recommendation includes rationale for selection.")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["Area", "Current", "Recommended", "Rationale"],
    [
      ["Testing", "None", "Jest + RTL + Supertest + Detox", "Industry standard; excellent Expo/React Native support"],
      ["Linting", "None", "ESLint + Prettier + Husky", "Automated code quality; pre-commit enforcement"],
      ["Logging", "console.log", "Winston or Pino", "Structured JSON output; log levels; production-ready"],
      ["Validation", "Manual per-route", "Zod or Joi", "Schema validation with TypeScript type inference"],
      ["Error Tracking", "None", "Sentry", "Real-time error monitoring with source maps"],
      ["Caching", "None", "Redis", "Fast in-memory cache; Socket.io adapter; rate limiter store"],
      ["CI/CD", "None", "GitHub Actions", "Integrated with repository; free tier sufficient"],
      ["API Docs", "None", "OpenAPI / Swagger", "Interactive docs; auto-generated; client SDK generation"],
      ["Migrations", "Raw SQL files", "Knex.js", "Versioned; rollback support; seeding; TypeScript types"],
      ["Email", "None", "SendGrid or Nodemailer", "Transactional emails; templates; delivery tracking"],
      ["Monitoring", "None", "Grafana + Prometheus", "Open source; comprehensive dashboards; alerting"],
    ],
    [15, 18, 27, 40]
  ));

  return s;
}

function buildTimelineSummary() {
  const s = [];
  s.push(heading("7. Timeline Summary", HeadingLevel.HEADING_1, { pageBreakBefore: true }));
  s.push(bodyText([txt("The full revamp spans approximately 28 weeks (7 months). Phases are generally sequential, with Phase 4 (Testing) running partly in parallel with Phase 3 (Frontend Architecture).")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["Phase", "Duration", "Focus Area", "Key Outcome"],
    [
      ["Phase 0", "Week 1-2", "Foundation & Emergency Fixes", "Clean repo, CI/CD, test framework, secrets rotated"],
      ["Phase 1", "Week 3-4", "Backend Security & Stability", "All endpoints secured, validated, rate limited"],
      ["Phase 2", "Week 5-7", "Database & API Layer", "Clean queries, transactions, pagination, standard API"],
      ["Phase 3", "Week 8-10", "Frontend Architecture", "Strict TS, small components, clean state management"],
      ["Phase 4", "Week 11-13", "Testing Infrastructure", "80%+ coverage, integration + E2E test suites"],
      ["Phase 5", "Week 14-16", "Performance & Scalability", "< 200ms API, < 2MB bundle, caching, CDN"],
      ["Phase 6", "Week 17-20", "Trust & Safety Features", "Disputes, moderation, reporting, refunds, email"],
      ["Phase 7", "Week 21-24", "Engagement & Polish", "Verification, onboarding, favorites, analytics, a11y"],
      ["Phase 8", "Week 25-28", "Infrastructure & Docs", "Load balancing, monitoring, docs, security audit"],
    ],
    [12, 14, 30, 44]
  ));

  s.push(emptyLine());
  s.push(bodyText([boldText("Total estimated duration: "), txt("28 weeks (approximately 7 months)")]));
  s.push(bodyText([txt("This timeline assumes a development team of 2-3 full-time engineers. Phases 0 and 1 are strictly sequential due to security criticality. Later phases may overlap by 1-2 weeks where dependencies allow.")]));

  return s;
}

function buildAppendices() {
  const s = [];
  s.push(heading("8. Appendices", HeadingLevel.HEADING_1, { pageBreakBefore: true }));

  // Appendix A
  s.push(heading("Appendix A: API Endpoints & Authentication Status", HeadingLevel.HEADING_2));
  s.push(bodyText([txt("The following table summarizes the 9 route modules and their authentication status as of the current assessment.")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["Route Module", "File", "Lines", "Endpoints", "Auth Status"],
    [
      ["Authentication", "routes/auth.js", "~450", "6", "Partial (login/register exempt)"],
      ["Users", "routes/users.js", "~800", "12", "MISSING on most endpoints"],
      ["Services", "routes/services.js", "~1,200", "15", "MISSING on most endpoints"],
      ["Bookings", "routes/bookings.js", "~1,500", "23+", "MISSING on all endpoints"],
      ["Payments", "routes/payments.js", "~600", "8", "Partial"],
      ["Messaging", "routes/messaging.js", "~700", "10", "Applied"],
      ["Hiring", "routes/hiring.js", "~900", "12", "MISSING on most endpoints"],
      ["Admin", "routes/admin.js", "~1,800", "18", "MISSING role check"],
      ["Analytics", "routes/analytics.js", "~500", "6", "MISSING role check"],
    ],
    [18, 22, 10, 12, 38]
  ));

  // Appendix B
  s.push(heading("Appendix B: Database Schema (23 Tables)", HeadingLevel.HEADING_2));
  s.push(bodyText([txt("Core database tables and their purposes:")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["Table", "Purpose", "Key Relations"],
    [
      ["users", "User accounts and profiles", "Primary entity"],
      ["services", "Service listings by providers", "FK: users.id (provider)"],
      ["service_images", "Images for service listings", "FK: services.id"],
      ["service_packages", "Pricing packages per service", "FK: services.id"],
      ["service_reviews", "User reviews of services", "FK: services.id, users.id"],
      ["bookings", "Booking records", "FK: services.id, users.id"],
      ["booking_services", "Services within a booking", "FK: bookings.id, services.id"],
      ["payments", "Payment transactions", "FK: bookings.id"],
      ["conversations", "Messaging conversations", "FK: users.id (both parties)"],
      ["messages", "Individual messages", "FK: conversations.id"],
      ["notifications", "User notifications", "FK: users.id"],
      ["hiring_requests", "Hiring/proposal requests", "FK: users.id"],
      ["hiring_proposals", "Provider proposals to hiring", "FK: hiring_requests.id"],
      ["provider_applications", "Provider role applications", "FK: users.id"],
      ["categories", "Service categories", "Referenced by services"],
      ["unavailable_dates", "Provider unavailability", "FK: users.id (provider)"],
      ["invoices", "Generated invoices (PDF)", "FK: bookings.id"],
      ["admin_settings", "Platform configuration", "Standalone"],
    ],
    [22, 35, 43]
  ));

  // Appendix C
  s.push(heading("Appendix C: File-Level Issues by Severity", HeadingLevel.HEADING_2));
  s.push(bodyText([txt("Files with the highest concentration of identified issues:")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["File", "Lines", "Severity", "Issues"],
    [
      ["server/routes/bookings.js", "~1,500", "CRITICAL", "No auth middleware, N+1 queries, no transactions, no validation"],
      ["server/routes/admin.js", "~1,800", "CRITICAL", "No role authorization, exposes sensitive data"],
      ["mvc/controllers/AuthController.ts", "700+", "HIGH", "God class, mixed concerns, race conditions"],
      ["mvc/views/user/MessagingView.tsx", "980", "HIGH", "God component, needs decomposition"],
      ["mvc/views/admin/User.tsx", "929", "HIGH", "Multiple views combined, no separation"],
      ["DashboardView.styles.ts", "1,862", "MEDIUM", "Monolithic style file, hardcoded values"],
      ["BookingModal.styles.ts", "992", "MEDIUM", "Excessive size, duplication"],
      ["server/routes/services.js", "~1,200", "HIGH", "N+1 queries, missing auth on some endpoints"],
      ["server/index.js", "Entry point", "MEDIUM", "No compression, no security headers"],
    ],
    [30, 10, 12, 48]
  ));

  // Appendix D
  s.push(heading("Appendix D: Dependency Audit Summary", HeadingLevel.HEADING_2));
  s.push(bodyText([txt("Key dependencies and their audit status:")]));
  s.push(emptyLine());

  s.push(makeTable(
    ["Package", "Version", "Status", "Notes"],
    [
      ["react", "19.0.x", "Current", "Latest major version"],
      ["react-native", "0.81.x", "Current", "Latest stable"],
      ["expo", "SDK 54", "Current", "Latest SDK"],
      ["express", "4.21.x", "Current", "Consider migration path to v5"],
      ["mysql2", "Latest", "OK", "Connection pool needs configuration"],
      ["firebase", "Latest", "OK", "Service account key must be rotated"],
      ["socket.io", "Latest", "OK", "Needs Redis adapter for scaling"],
      ["paymongo", "N/A", "Manual", "Direct API integration; webhook verification broken"],
    ],
    [20, 15, 15, 50]
  ));

  s.push(emptyLine());
  s.push(para([txt("--- End of Document ---", { italics: true, color: C.muted, size: 20 })], { alignment: AlignmentType.CENTER }));

  return s;
}

// ── Assemble the full document ──
async function main() {
  const doc = new Document({
    creator: "E-Vent Development Team",
    title: "E-Vent Platform - Comprehensive Revamp & Improvement Plan",
    description: "Test-Driven Development Approach",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: C.dark },
        },
        heading1: {
          run: { font: "Calibri", size: 36, bold: true, color: C.primary },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        heading2: {
          run: { font: "Calibri", size: 30, bold: true, color: C.primary },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading3: {
          run: { font: "Calibri", size: 26, bold: true, color: C.accent },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
        heading4: {
          run: { font: "Calibri", size: 24, bold: true, color: C.medium },
          paragraph: { spacing: { before: 160, after: 80 } },
        },
      },
    },
    numbering: {
      config: [{
        reference: "default-bullet",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      }],
    },
    features: {
      updateFields: true,
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 },
          size: { width: 12240, height: 15840 },
        },
      },
      headers: {
        default: new Header({
          children: [
            para([
              txt("E-Vent Platform -- Comprehensive Revamp Plan", { size: 16, color: C.muted, italics: true }),
            ], { alignment: AlignmentType.RIGHT, spaceAfter: 0 }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            para([
              txt("Version 1.0 | February 2026 | Confidential", { size: 16, color: C.muted }),
              txt("        Page ", { size: 16, color: C.muted }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: C.muted }),
              txt(" of ", { size: 16, color: C.muted }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 16, color: C.muted }),
            ], { alignment: AlignmentType.CENTER, spaceAfter: 0 }),
          ],
        }),
      },
      children: [
        ...buildTitlePage(),
        ...buildTOC(),
        ...buildExecutiveSummary(),
        ...buildCurrentStateAssessment(),
        ...buildPhase0(),
        ...buildPhase1(),
        ...buildPhase2(),
        ...buildPhase3(),
        ...buildPhase4(),
        ...buildPhase5(),
        ...buildPhase6(),
        ...buildPhase7(),
        ...buildPhase8(),
        ...buildSuccessMetrics(),
        ...buildRiskAssessment(),
        ...buildTechRecommendations(),
        ...buildTimelineSummary(),
        ...buildAppendices(),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("D:/Event/docs/E-VENT_REVAMP_PLAN.docx", buffer);
  console.log("Document generated: D:/Event/docs/E-VENT_REVAMP_PLAN.docx");
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
}

main().catch(err => { console.error(err); process.exit(1); });
