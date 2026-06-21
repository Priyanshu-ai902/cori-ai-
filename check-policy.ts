import prisma from './lib/prisma';

async function auditActionPolicy() {
  console.log("=== AUDITING ISSUE ACTION POLICY ===\n");

  const issues = await prisma.issue.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${issues.length} recent issues.`);

  for (const issue of issues) {
    console.log(`- [${issue.type}] ${issue.title}`);
    if (issue.type !== 'FAILURE') {
      console.log(`  -> ACTION: Must NOT be actionable.`);
    } else {
      console.log(`  -> ACTION: Must be actionable.`);
    }
  }

  console.log("\nAudit complete.");
}

auditActionPolicy().catch(console.error);
