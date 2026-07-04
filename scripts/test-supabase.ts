/**
 * Standalone verification for the Supabase certificate registry adapter.
 *
 * Run with: npm run test:supabase
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to be set
 * (lib/supabase.ts throws fast if they are missing). This script registers a
 * unique throwaway certificate, verifies every adapter method against it, then
 * deletes it so the table is left exactly as it was found.
 */
import { supabase } from "../lib/supabase";
import { supabaseCertificateRegistryRepo } from "../lib/repositories/supabase/certificateRegistryRepo";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function main(): Promise<void> {
  const testId = `TEST-CERT-${Date.now()}`;
  const productName = "Supabase Adapter Smoke Test";
  const merchantId = "merchant@test.com";

  console.log(`\nUsing test certificate id: ${testId}\n`);

  try {
    // 1. Register the test certificate.
    console.log("Step 1 — register()");
    await supabaseCertificateRegistryRepo.register({
      certificateId: testId,
      productName,
      merchantId,
    });
    console.log("  ✓ register() completed");

    // 2. Read it back and assert it matches.
    console.log("Step 2 — get()");
    const fetched = await supabaseCertificateRegistryRepo.get(testId);
    assert(fetched !== null, "get() returned a record");
    assert(fetched!.certificateId === testId, "certificateId round-trips unchanged");
    assert(fetched!.productName === productName, "productName round-trips unchanged");
    assert(fetched!.merchantId === merchantId, "merchantId round-trips unchanged");
    assert(
      typeof fetched!.registeredAt === "string" && fetched!.registeredAt.length > 0,
      "registeredAt is populated"
    );

    // 3. List certificates and assert the test cert is present.
    console.log("Step 3 — list()");
    const all = await supabaseCertificateRegistryRepo.list();
    assert(
      all.some((r) => r.certificateId === testId),
      "list() includes the test certificate"
    );

    // 4. isRegistered(testId) → true.
    console.log("Step 4 — isRegistered(existing)");
    assert(
      (await supabaseCertificateRegistryRepo.isRegistered(testId)) === true,
      "isRegistered() is true for the test certificate"
    );

    // 5. isRegistered(unknown) → false.
    console.log("Step 5 — isRegistered(unknown)");
    assert(
      (await supabaseCertificateRegistryRepo.isRegistered("DOES-NOT-EXIST-xyz")) === false,
      "isRegistered() is false for an unknown certificate"
    );

    console.log("\nAll assertions passed.");
  } finally {
    // 6. Clean up — always remove the test row, even on failure.
    console.log("\nCleanup — deleting test certificate");
    const { error } = await supabase
      .from("certificates")
      .delete()
      .eq("certificate_id", testId);
    if (error) {
      console.error(`  ✗ Cleanup failed: ${error.message}`);
      throw error;
    }
    console.log("  ✓ Test certificate deleted");
  }
}

main()
  .then(() => {
    console.log("\nSUCCESS\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nFAILURE\n", err);
    process.exit(1);
  });
