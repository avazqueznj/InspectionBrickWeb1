import { db, pool } from "./db";
import { sql } from "drizzle-orm";

/**
 * Migration script to support multiple assets per inspection
 * 
 * Changes:
 * 1. Add assetId column to defects table
 * 2. Create inspection_assets junction table
 * 3. Backfill defects.assetId from inspections.assetId
 * 4. Backfill inspection_assets from inspections.assetId
 */
async function migrate() {
  console.log("🔄 Starting multi-asset migration...");

  try {
    // Step 1: Add assetId column to defects table (nullable initially)
    console.log("📝 Adding assetId column to defects table...");
    await db.execute(sql`
      ALTER TABLE defects 
      ADD COLUMN IF NOT EXISTS asset_id TEXT;
    `);
    console.log("✅ Added assetId column to defects");

    // Step 2: Create inspection_assets junction table
    console.log("📝 Creating inspection_assets junction table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inspection_assets (
        inspection_id VARCHAR NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL,
        PRIMARY KEY (inspection_id, asset_id)
      );
    `);
    console.log("✅ Created inspection_assets table");

    // Step 3: Backfill defects.assetId from inspections.assetId
    console.log("📝 Backfilling defects.assetId from inspections...");
    const defectsUpdated = await db.execute(sql`
      UPDATE defects
      SET asset_id = inspections.asset_id
      FROM inspections
      WHERE defects.inspection_id = inspections.id
      AND defects.asset_id IS NULL;
    `);
    console.log(`✅ Updated ${defectsUpdated.rowCount || 0} defect records with assetId`);

    // Step 4: Backfill inspection_assets from inspections.assetId
    console.log("📝 Backfilling inspection_assets from inspections...");
    const inspectionAssetsInserted = await db.execute(sql`
      INSERT INTO inspection_assets (inspection_id, asset_id)
      SELECT id, asset_id
      FROM inspections
      ON CONFLICT (inspection_id, asset_id) DO NOTHING;
    `);
    console.log(`✅ Inserted ${inspectionAssetsInserted.rowCount || 0} inspection-asset associations`);

    // Step 5: Make defects.assetId NOT NULL
    console.log("📝 Making defects.assetId NOT NULL...");
    await db.execute(sql`
      ALTER TABLE defects 
      ALTER COLUMN asset_id SET NOT NULL;
    `);
    console.log("✅ Made defects.assetId NOT NULL");

    console.log("✅ Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - Defects updated: ${defectsUpdated.rowCount || 0}`);
    console.log(`  - Inspection-asset associations created: ${inspectionAssetsInserted.rowCount || 0}`);
    console.log("\n⚠️  Note: inspections.assetId column still exists for backward compatibility");
    console.log("   It can be removed in a future migration after verification.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("❌ Fatal error during migration:", error);
  process.exit(1);
});
