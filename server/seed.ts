import { runSeed } from "./services/seedService";

async function seed() {
  console.log("🌱 Seeding database with plain text passwords (pilot configuration)...");

  try {
    await runSeed();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
