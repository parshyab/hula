import '../env';
import { verifyChain } from '../audit';
import { prisma } from '@saathi/db';

/** CLI: `pnpm audit:verify` — confirm the audit hash chain is intact. */
async function main() {
  const result = await verifyChain();
  if (result.ok) {
    console.log(`✓ audit chain intact — ${result.count} events verified.`);
  } else {
    console.error(
      `✗ audit chain BROKEN at seq ${result.brokenAtSeq}: ${result.reason} (${result.count} events).`,
    );
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main();
