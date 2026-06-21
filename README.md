# StellaOps

StellaOps is an autonomous remediation platform for CI/CD pipelines. It integrates with GitHub Actions to diagnose and repair build, test, and deployment failures.

The system uses an evidence-driven pipeline to ensure repairs are based on repository artifacts, manifests, and logs, rather than speculative inference.

## Architecture

The project is built on Next.js, React, Tailwind CSS, and Prisma (PostgreSQL).

```text
stella-ops-saa-s-frontend/
├── app/
│   ├── api/                 # Backend API routes
│   │   ├── issues/[id]/     # Remediation endpoints (generate-fix, generate-diff, verify)
│   │   └── incidents/       # Webhook ingestion and RCA orchestration
│   ├── dashboard/           # UI Dashboard views
│   └── page.tsx             # Landing page
├── components/
│   ├── issue-card.tsx       # Core UI for reviewing extracted issues and patches
│   ├── patch-diff-viewer.tsx# Diff viewer
│   └── standard/            # Reusable UI components
├── lib/                     # Core Remediation Engine
│   ├── failure-localization-engine.ts # Log parsing and confidence scoring
│   ├── failure-evidence-collector.ts  # Extraction of imports, symbols, dependencies
│   ├── root-cause-validator.ts        # Evidence validation
│   ├── patch-validator.ts             # Syntax and safety checks for generated diffs
│   ├── remediation-execution-engine.ts# Sandbox execution and verification
│   └── sandbox.ts                     # Isolated container wrapper
├── services/                # External Integrations
│   ├── ai/                  # Prompt management and AI logic
│   └── github.ts            # GitHub API wrapper
├── prisma/                  # Database Schema
│   └── schema.prisma        # Prisma models
└── tests/                   # Regression and unit tests
```

## Evidence-Driven Workflow

The remediation engine operates in 10 stages:

1. **Failure Localization:** Parses raw logs using deterministic rules to identify the failing file and workspace. Requires a minimum confidence score of 0.85 to proceed.
2. **Evidence Collection:** Gathers repository facts (dependencies, lockfiles, imported modules, exported symbols) from the localized failure context.
3. **Root Cause Validation:** Verifies the initial root cause hypothesis against the collected evidence to prevent hallucinated fixes.
4. **Patch Planning:** Generates a structured remediation plan explaining the required changes based on evidence. No diffs are generated in this stage.
5. **Patch Generation:** Generates a unified git diff from the approved plan and ground-truth evidence.
6. **Patch Validation:** Scans the diff for forbidden patterns (e.g., destructive commands) and validates JSON syntax.
7. **Verification:** Applies the diff in an isolated sandbox and executes build/test commands to verify the fix. Returns structured JSON output.
8. **Remediation Policy:** Restricts automated patching to actionable failures. Warnings and recommendations are logged but not automatically remediated.
9. **Loop Protection:** Prevents infinite retry loops by monitoring failure signatures. Repeated failures trigger a manual review requirement.
10. **Issue-Centric UI:** Surfaced via the dashboard, allowing developers to review plans, inspect diffs, and approve fixes before creating a pull request.

## Technology Stack

* Next.js 15
* React
* Tailwind CSS
* PostgreSQL / Prisma ORM
* SWR
* Google Gemini API
* Zod
