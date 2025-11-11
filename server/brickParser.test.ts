import { parseBrickInspection } from "./brickParser";

const SAMPLE_DATA = `BRICKINSPECTION*1
DISPLAYHEADER*92aa2*2025-11-10 18:18:20*123*127: TRUCK
INSPHEADER
INSPID*1236888f-5fbd-44a0-8127-16807e492aa2
COMPANYID*NEC
DRIVER*Alejandro Vazquez*123
INSPSTARTTIME*2025-11-10 18:17:18
INSPSUBTIME*2025-11-10 18:18:20
INSPTIMEOFFSET*-480
INSPTIMEDST*0
ASSETS
ASSET*127*TRUCK*123456
ASSET*131*MIXER*123
INSPTYPE
INSPTYPENAME*pre-trip
FORMFIELDS
FF*Odometer*123
FF*Fuel level*456
FF*Route*
FF*Cost*
FF*Test2*
CHECKS
CHECK*127*1*light left*GOOD*0*2025-11-10 18:17:30*
CHECK*127*1*light right*GOOD*0*2025-11-10 18:17:30*
CHECK*127*2*oil*GOOD*0*2025-11-10 18:17:32*
CHECK*127*3*license*GOOD*0*2025-11-10 18:17:33*
CHECK*127*3*wind shield*GOOD*0*2025-11-10 18:17:33*
CHECK*127*3*seat*GOOD*0*2025-11-10 18:17:33*
CHECK*127*3*wind shield1*GOOD*0*2025-11-10 18:17:33*
CHECK*127*4*cargo*GOOD*0*2025-11-10 18:17:35*
CHECK*127*5*cargo*GOOD*0*2025-11-10 18:17:36*
CHECK*127*6*light left*GOOD*0*2025-11-10 18:17:37*
CHECK*127*6*light right*GOOD*0*2025-11-10 18:17:37*
CHECK*131*1*light left*GOOD*0*2025-11-10 18:17:39*
CHECK*131*1*light right*GOOD*0*2025-11-10 18:17:39*
CHECK*131*4*mixer container*GOOD*0*2025-11-10 18:17:54*
CHECK*131*4*mixer control*GOOD*0*2025-11-10 18:17:54*
CHECK*131*5*light left*GOOD*0*2025-11-10 18:17:56*
CHECK*131*5*light right*GOOD*0*2025-11-10 18:17:56*
CHECK*131*3*wind shield*GOOD*0*2025-11-10 18:17:58*
CHECK*131*3*seat*GOOD*0*2025-11-10 18:17:58*
DEFECTS
DEFECT*131*2*oil*low*10*2025-11-10 18:17:42*
DEFECT*131*2*break fluid*leaking*10*2025-11-10 18:17:47*jhj
DEFECT*131*3*license*missing*1*2025-11-10 18:17:51*
DEFECT*127*2*break fluid*leaking*1*2025-11-10 18:18:17*ggggjj
END***`;

function runTests() {
  console.log("\n🧪 Running BRICKINSPECTION Parser Tests\n");

  let passedTests = 0;
  let failedTests = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      failedTests++;
    }
  }

  test("Should parse valid BRICKINSPECTION data", () => {
    const result = parseBrickInspection(SAMPLE_DATA);
    
    if (result.inspectionId !== "1236888f-5fbd-44a0-8127-16807e492aa2") {
      throw new Error(`Expected inspectionId to be '1236888f-5fbd-44a0-8127-16807e492aa2', got '${result.inspectionId}'`);
    }
    
    if (result.companyId !== "NEC") {
      throw new Error(`Expected companyId to be 'NEC', got '${result.companyId}'`);
    }
    
    if (result.driverName !== "Alejandro Vazquez") {
      throw new Error(`Expected driverName to be 'Alejandro Vazquez', got '${result.driverName}'`);
    }
    
    if (result.driverId !== "123") {
      throw new Error(`Expected driverId to be '123', got '${result.driverId}'`);
    }
  });

  test("Should parse inspection times correctly", () => {
    const result = parseBrickInspection(SAMPLE_DATA);
    
    if (result.inspTimeOffset !== -480) {
      throw new Error(`Expected inspTimeOffset to be -480, got ${result.inspTimeOffset}`);
    }
    
    if (result.inspTimeDst !== 0) {
      throw new Error(`Expected inspTimeDst to be 0, got ${result.inspTimeDst}`);
    }
    
    if (!(result.inspStartTimeUtc instanceof Date)) {
      throw new Error("inspStartTimeUtc should be a Date object");
    }
    
    if (!(result.inspSubmitTimeUtc instanceof Date)) {
      throw new Error("inspSubmitTimeUtc should be a Date object");
    }
  });

  test("Should parse assets correctly", () => {
    const result = parseBrickInspection(SAMPLE_DATA);
    
    if (result.assets.length !== 2) {
      throw new Error(`Expected 2 assets, got ${result.assets.length}`);
    }
    
    if (result.assets[0].assetId !== "127") {
      throw new Error(`Expected first asset ID to be '127', got '${result.assets[0].assetId}'`);
    }
    
    if (result.assets[0].layoutId !== "TRUCK") {
      throw new Error(`Expected first asset layout to be 'TRUCK', got '${result.assets[0].layoutId}'`);
    }
    
    if (result.assets[1].assetId !== "131") {
      throw new Error(`Expected second asset ID to be '131', got '${result.assets[1].assetId}'`);
    }
  });

  test("Should parse inspection type", () => {
    const result = parseBrickInspection(SAMPLE_DATA);
    
    if (result.inspectionType !== "pre-trip") {
      throw new Error(`Expected inspectionType to be 'pre-trip', got '${result.inspectionType}'`);
    }
  });

  test("Should parse form fields correctly", () => {
    const result = parseBrickInspection(SAMPLE_DATA);
    
    if (result.formFields["Odometer"] !== "123") {
      throw new Error(`Expected Odometer to be '123', got '${result.formFields["Odometer"]}'`);
    }
    
    if (result.formFields["Fuel level"] !== "456") {
      throw new Error(`Expected Fuel level to be '456', got '${result.formFields["Fuel level"]}'`);
    }
    
    if (result.formFields["Route"] !== "") {
      throw new Error(`Expected Route to be empty, got '${result.formFields["Route"]}'`);
    }
  });

  test("Should parse checks correctly", () => {
    const result = parseBrickInspection(SAMPLE_DATA);
    
    if (result.checks.length !== 19) {
      throw new Error(`Expected 19 checks, got ${result.checks.length}`);
    }
    
    const firstCheck = result.checks[0];
    if (firstCheck.assetId !== "127") {
      throw new Error(`Expected first check asset to be '127', got '${firstCheck.assetId}'`);
    }
    
    if (firstCheck.zoneId !== 1) {
      throw new Error(`Expected first check zone to be 1, got ${firstCheck.zoneId}`);
    }
    
    if (firstCheck.componentName !== "light left") {
      throw new Error(`Expected first check component to be 'light left', got '${firstCheck.componentName}'`);
    }
    
    if (firstCheck.severity !== 0) {
      throw new Error(`Expected check severity to be 0, got ${firstCheck.severity}`);
    }
  });

  test("Should parse defects correctly", () => {
    const result = parseBrickInspection(SAMPLE_DATA);
    
    if (result.defects.length !== 4) {
      throw new Error(`Expected 4 defects, got ${result.defects.length}`);
    }
    
    const firstDefect = result.defects[0];
    if (firstDefect.assetId !== "131") {
      throw new Error(`Expected first defect asset to be '131', got '${firstDefect.assetId}'`);
    }
    
    if (firstDefect.zoneId !== 2) {
      throw new Error(`Expected first defect zone to be 2, got ${firstDefect.zoneId}`);
    }
    
    if (firstDefect.componentName !== "oil") {
      throw new Error(`Expected first defect component to be 'oil', got '${firstDefect.componentName}'`);
    }
    
    if (firstDefect.severity !== 10) {
      throw new Error(`Expected first defect severity to be 10, got ${firstDefect.severity}`);
    }
    
    if (firstDefect.notes !== "") {
      throw new Error(`Expected first defect notes to be empty, got '${firstDefect.notes}'`);
    }
    
    const secondDefect = result.defects[1];
    if (secondDefect.notes !== "jhj") {
      throw new Error(`Expected second defect notes to be 'jhj', got '${secondDefect.notes}'`);
    }
  });

  test("Should throw error when missing END marker", () => {
    const invalidData = SAMPLE_DATA.replace("END***", "");
    
    try {
      parseBrickInspection(invalidData);
      throw new Error("Should have thrown an error");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Expected END***")) {
        throw new Error(`Expected error about missing END marker, got: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  test("Should throw error when missing INSPHEADER", () => {
    const invalidData = SAMPLE_DATA.replace("INSPHEADER", "");
    
    try {
      parseBrickInspection(invalidData);
      throw new Error("Should have thrown an error");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Expected INSPHEADER")) {
        throw new Error(`Expected error about missing INSPHEADER, got: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  test("Should throw error when missing assets", () => {
    const invalidData = SAMPLE_DATA
      .replace("ASSET*127*TRUCK*123456\n", "")
      .replace("ASSET*131*MIXER*123\n", "");
    
    try {
      parseBrickInspection(invalidData);
      throw new Error("Should have thrown an error");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("At least one ASSET is required")) {
        throw new Error(`Expected error about missing assets, got: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  test("Should throw error for invalid UUID", () => {
    const invalidData = SAMPLE_DATA.replace("1236888f-5fbd-44a0-8127-16807e492aa2", "invalid-uuid");
    
    try {
      parseBrickInspection(invalidData);
      throw new Error("Should have thrown an error");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error("Expected an Error object");
      }
    }
  });

  console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);
  
  if (failedTests > 0) {
    throw new Error(`${failedTests} test(s) failed`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
