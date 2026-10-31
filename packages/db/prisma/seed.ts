/**
 * Phase 0 seed — a small, realistic (and entirely fake) dataset so the walking
 * slice has data: ~20 employees, two login-ready users with PINs, and a sample
 * policy corpus with citable clauses in en/hi/as.
 *
 * The full 1,100-employee / 3-year-history / CLMS seed arrives in Phase 1.
 */
import { PrismaClient, EmployeeStatus } from '@prisma/client';
import { hashPin } from '@saathi/auth';

const prisma = new PrismaClient();

const UNITS = ['Hydrocracker', 'CDU', 'DHDT', 'Utilities', 'Marketing-Terminal-Siliguri', 'HQ-Guwahati'];
const GRADES = ['E-0', 'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'S-1', 'W-3', 'W-4'];
const PAY_SCALES = ['IDA 24900-50500', 'IDA 29100-54500', 'IDA 40000-140000', 'IDA 50000-160000'];

// Realistic Assamese and pan-Indian names (fake people).
const FIRST_NAMES = [
  'Priya', 'Arnab', 'Bhaskar', 'Nayan', 'Rituparna', 'Dipankar', 'Hiranya', 'Jahnabi',
  'Pranab', 'Munmi', 'Rupam', 'Gautam', 'Anindita', 'Kaushik', 'Simanta', 'Bhargav',
  'Lakhinandan', 'Parismita', 'Ranjit', 'Trishna',
];
const LAST_NAMES = [
  'Borah', 'Saikia', 'Das', 'Gogoi', 'Bora', 'Hazarika', 'Phukan', 'Bhuyan',
  'Kalita', 'Deka', 'Baruah', 'Nath', 'Sarma', 'Choudhury', 'Mahanta', 'Dutta',
  'Rajkhowa', 'Konwar', 'Barman', 'Pegu',
];

async function main() {
  console.log('→ clearing existing rows…');
  await prisma.policyChunk.deleteMany();
  await prisma.policyDoc.deleteMany();
  await prisma.pinCredential.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();

  console.log('→ seeding employees…');
  for (let i = 0; i < 20; i++) {
    const empCode = `E-${(10001 + i).toString()}`;
    await prisma.employee.create({
      data: {
        empCode,
        firstName: FIRST_NAMES[i]!,
        lastName: LAST_NAMES[i]!,
        grade: GRADES[i % GRADES.length]!,
        payScale: PAY_SCALES[i % PAY_SCALES.length]!,
        unit: UNITS[i % UNITS.length]!,
        dept: i % 3 === 0 ? 'HR' : i % 3 === 1 ? 'Operations' : 'Finance',
        designation: i % 5 === 0 ? 'Manager' : 'Officer',
        status: EmployeeStatus.ACTIVE,
        dateOfJoining: new Date(2010 + (i % 12), i % 12, 1 + (i % 27)),
        // PII stored masked + token only — never plaintext.
        panMasked: `XXXXX${(1000 + i).toString()}X`,
        panToken: `tok_pan_${empCode}`,
        bankMasked: `XXXXXX${(4000 + i).toString()}`,
        bankToken: `tok_bank_${empCode}`,
      },
    });
  }

  console.log('→ seeding login-ready users (OTP + PIN demo)…');
  // Priya (E-10001): HR officer. Arnab (E-10002): plain employee.
  // keycloakSub is left null; the console provisions it on first OIDC login.
  await prisma.user.create({
    data: {
      mobile: '9435000001',
      roles: ['employee', 'hr_officer'],
      unit: 'HQ-Guwahati',
      dept: 'HR',
      empCode: 'E-10001',
      pin: { create: { pinHash: hashPin('1234') } },
    },
  });
  await prisma.user.create({
    data: {
      mobile: '9435000002',
      roles: ['employee'],
      unit: 'CDU',
      dept: 'Operations',
      empCode: 'E-10002',
      pin: { create: { pinHash: hashPin('1234') } },
    },
  });

  console.log('→ seeding sample policy corpus (en/hi/as)…');
  await seedPolicy(
    'leave',
    'Leave Rules',
    [
      {
        clauseRef: 'LEAVE-3.2',
        heading: { en: 'Casual Leave', hi: 'आकस्मिक अवकाश', as: 'নৈমিত্তিক ছুটী' },
        content: {
          en: 'An employee is entitled to 12 days of Casual Leave (CL) per calendar year. CL cannot be combined with Earned Leave and lapses at year end.',
          hi: 'प्रत्येक कर्मचारी को प्रति कैलेंडर वर्ष 12 दिन का आकस्मिक अवकाश (CL) मिलता है। CL को अर्जित अवकाश के साथ नहीं जोड़ा जा सकता और वर्षांत में समाप्त हो जाता है।',
          as: 'এজন কৰ্মচাৰীয়ে প্ৰতি কেলেণ্ডাৰ বছৰত ১২ দিন নৈমিত্তিক ছুটী (CL) পাব। CL অৰ্জিত ছুটীৰ লগত সংযুক্ত কৰিব নোৱাৰি আৰু বছৰৰ শেষত বাতিল হয়।',
        },
      },
      {
        clauseRef: 'LEAVE-4.1',
        heading: { en: 'Earned Leave', hi: 'अर्जित अवकाश', as: 'অৰ্জিত ছুটী' },
        content: {
          en: 'Earned Leave (EL) accrues at 2.5 days per completed month of service, up to a maximum accumulation of 300 days. EL is encashable on superannuation.',
          hi: 'अर्जित अवकाश (EL) सेवा के प्रत्येक पूर्ण माह पर 2.5 दिन की दर से अर्जित होता है, अधिकतम 300 दिन तक। सेवानिवृत्ति पर EL नकदीकरण योग्य है।',
          as: 'অৰ্জিত ছুটী (EL) সেৱাৰ প্ৰতিটো সম্পূৰ্ণ মাহত ২.৫ দিন হাৰত জমা হয়, সৰ্বাধিক ৩০০ দিনলৈ। অৱসৰৰ সময়ত EL নগদীকৰণযোগ্য।',
        },
      },
    ],
  );

  const count = await prisma.employee.count();
  console.log(`✓ seed complete — ${count} employees, 2 login users, policy corpus loaded.`);
}

type Lang = 'en' | 'hi' | 'as';
async function seedPolicy(
  key: string,
  title: string,
  clauses: { clauseRef: string; heading: Record<Lang, string>; content: Record<Lang, string> }[],
) {
  for (const lang of ['en', 'hi', 'as'] as const) {
    const doc = await prisma.policyDoc.create({
      data: { key, title, lang, version: 'v1' },
    });
    for (const c of clauses) {
      await prisma.policyChunk.create({
        data: {
          docId: doc.id,
          clauseRef: c.clauseRef,
          heading: c.heading[lang],
          content: c.content[lang],
          lang,
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
