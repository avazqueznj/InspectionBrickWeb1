import { z } from "zod";

export interface ParsedInspection {
  inspectionId: string;
  companyId: string;
  driverName: string;
  driverId: string;
  inspStartTime: Date;
  inspSubmitTime: Date;
  inspStartTimeUtc: Date;
  inspSubmitTimeUtc: Date;
  inspTimeOffset: number;
  inspTimeDst: number;
  assets: {
    assetId: string;
    layoutId: string;
    tagId: string;
  }[];
  inspectionType: string;
  formFields: Record<string, string>;
  checks: {
    assetId: string;
    zoneId: number;
    componentName: string;
    defectType: string;
    severity: number;
    inspectedAt: Date;
    inspectedAtUtc: Date;
    notes: string;
  }[];
  defects: {
    assetId: string;
    zoneId: number;
    componentName: string;
    defectType: string;
    severity: number;
    inspectedAt: Date;
    inspectedAtUtc: Date;
    notes: string;
  }[];
}

function parseDateTime(dateTimeStr: string): Date {
  const parts = dateTimeStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  
  if (!parts) {
    throw new Error(`Invalid datetime format: ${dateTimeStr}. Expected YYYY-MM-DD HH:mm:ss`);
  }
  
  const year = parseInt(parts[1]);
  const month = parseInt(parts[2]) - 1;
  const day = parseInt(parts[3]);
  const hour = parseInt(parts[4]);
  const minute = parseInt(parts[5]);
  const second = parseInt(parts[6]);
  
  const date = new Date(year, month, day, hour, minute, second);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime values: ${dateTimeStr}`);
  }
  
  return date;
}

function parseDateTimeAndConvertToUtc(dateTimeStr: string, offsetMinutes: number): { local: Date; utc: Date; localStr: string } {
  const parts = dateTimeStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  
  if (!parts) {
    throw new Error(`Invalid datetime format: ${dateTimeStr}. Expected YYYY-MM-DD HH:mm:ss`);
  }
  
  const year = parseInt(parts[1]);
  const month = parseInt(parts[2]) - 1;
  const day = parseInt(parts[3]);
  const hour = parseInt(parts[4]);
  const minute = parseInt(parts[5]);
  const second = parseInt(parts[6]);
  
  const utcMs = Date.UTC(year, month, day, hour, minute, second);
  
  if (isNaN(utcMs)) {
    throw new Error(`Invalid datetime values: ${dateTimeStr}`);
  }
  
  const actualUtcMs = utcMs - (offsetMinutes * 60 * 1000);
  const utcDate = new Date(actualUtcMs);
  
  const localMs = actualUtcMs + (offsetMinutes * 60 * 1000);
  const localDate = new Date(localMs);
  
  return { local: localDate, utc: utcDate, localStr: dateTimeStr };
}

export function parseBrickInspection(data: string): ParsedInspection {
  const lines = data.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error("Empty inspection data");
  }

  let currentLine = 0;
  
  if (lines[currentLine] !== "BRICKINSPECTION*1") {
    throw new Error(`Expected BRICKINSPECTION*1 at start, got: ${lines[currentLine]}`);
  }
  currentLine++;

  while (currentLine < lines.length && lines[currentLine].startsWith("DISPLAYHEADER*")) {
    currentLine++;
  }

  if (currentLine >= lines.length || lines[currentLine] !== "INSPHEADER") {
    throw new Error(`Expected INSPHEADER, got: ${lines[currentLine] || 'EOF'}`);
  }
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("INSPID*")) {
    throw new Error(`Expected INSPID, got: ${lines[currentLine] || 'EOF'}`);
  }
  const inspectionId = lines[currentLine].split('*')[1];
  if (!inspectionId || inspectionId.trim().length === 0) {
    throw new Error("INSPID cannot be empty");
  }
  z.string().uuid().parse(inspectionId);
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("COMPANYID*")) {
    throw new Error(`Expected COMPANYID, got: ${lines[currentLine] || 'EOF'}`);
  }
  const companyId = lines[currentLine].split('*')[1];
  if (!companyId || companyId.trim().length === 0) {
    throw new Error("COMPANYID cannot be empty");
  }
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("DRIVER*")) {
    throw new Error(`Expected DRIVER, got: ${lines[currentLine] || 'EOF'}`);
  }
  const driverParts = lines[currentLine].split('*');
  const driverName = driverParts[1];
  const driverId = driverParts[2];
  if (!driverName || driverName.trim().length === 0) {
    throw new Error("Driver name cannot be empty");
  }
  if (!driverId || driverId.trim().length === 0) {
    throw new Error("Driver ID cannot be empty");
  }
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("INSPSTARTTIME*")) {
    throw new Error(`Expected INSPSTARTTIME, got: ${lines[currentLine] || 'EOF'}`);
  }
  const inspStartTimeStr = lines[currentLine].split('*')[1];
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("INSPSUBTIME*")) {
    throw new Error(`Expected INSPSUBTIME, got: ${lines[currentLine] || 'EOF'}`);
  }
  const inspSubmitTimeStr = lines[currentLine].split('*')[1];
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("INSPTIMEOFFSET*")) {
    throw new Error(`Expected INSPTIMEOFFSET, got: ${lines[currentLine] || 'EOF'}`);
  }
  const inspTimeOffset = parseInt(lines[currentLine].split('*')[1]);
  if (isNaN(inspTimeOffset)) {
    throw new Error("INSPTIMEOFFSET must be a valid integer");
  }
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("INSPTIMEDST*")) {
    throw new Error(`Expected INSPTIMEDST, got: ${lines[currentLine] || 'EOF'}`);
  }
  const inspTimeDst = parseInt(lines[currentLine].split('*')[1]);
  if (isNaN(inspTimeDst) || (inspTimeDst !== 0 && inspTimeDst !== 1)) {
    throw new Error("INSPTIMEDST must be 0 or 1");
  }
  currentLine++;

  const inspStartTimeResult = parseDateTimeAndConvertToUtc(inspStartTimeStr, inspTimeOffset);
  const inspSubmitTimeResult = parseDateTimeAndConvertToUtc(inspSubmitTimeStr, inspTimeOffset);

  if (currentLine >= lines.length || lines[currentLine] !== "ASSETS") {
    throw new Error(`Expected ASSETS, got: ${lines[currentLine] || 'EOF'}`);
  }
  currentLine++;

  const assets: { assetId: string; layoutId: string; tagId: string }[] = [];
  while (currentLine < lines.length && lines[currentLine].startsWith("ASSET*")) {
    const assetParts = lines[currentLine].split('*');
    if (assetParts.length < 4) {
      throw new Error(`Invalid ASSET format: ${lines[currentLine]}`);
    }
    assets.push({
      assetId: assetParts[1],
      layoutId: assetParts[2],
      tagId: assetParts[3],
    });
    currentLine++;
  }

  if (assets.length === 0) {
    throw new Error("At least one ASSET is required");
  }

  if (currentLine >= lines.length || lines[currentLine] !== "INSPTYPE") {
    throw new Error(`Expected INSPTYPE, got: ${lines[currentLine] || 'EOF'}`);
  }
  currentLine++;

  if (currentLine >= lines.length || !lines[currentLine].startsWith("INSPTYPENAME*")) {
    throw new Error(`Expected INSPTYPENAME, got: ${lines[currentLine] || 'EOF'}`);
  }
  const inspectionType = lines[currentLine].split('*')[1];
  if (!inspectionType || inspectionType.trim().length === 0) {
    throw new Error("INSPTYPENAME cannot be empty");
  }
  currentLine++;

  if (currentLine >= lines.length || lines[currentLine] !== "FORMFIELDS") {
    throw new Error(`Expected FORMFIELDS, got: ${lines[currentLine] || 'EOF'}`);
  }
  currentLine++;

  const formFields: Record<string, string> = {};
  while (currentLine < lines.length && lines[currentLine].startsWith("FF*")) {
    const ffParts = lines[currentLine].split('*');
    if (ffParts.length < 3) {
      throw new Error(`Invalid FF format: ${lines[currentLine]}`);
    }
    const fieldName = ffParts[1];
    const fieldValue = ffParts[2] || "";
    formFields[fieldName] = fieldValue;
    currentLine++;
  }

  if (currentLine >= lines.length || lines[currentLine] !== "CHECKS") {
    throw new Error(`Expected CHECKS, got: ${lines[currentLine] || 'EOF'}`);
  }
  currentLine++;

  const checks: ParsedInspection['checks'] = [];
  while (currentLine < lines.length && lines[currentLine].startsWith("CHECK*")) {
    const checkParts = lines[currentLine].split('*');
    if (checkParts.length < 7) {
      throw new Error(`Invalid CHECK format: ${lines[currentLine]}`);
    }
    
    const assetId = checkParts[1];
    const zoneId = parseInt(checkParts[2]);
    const componentName = checkParts[3];
    const defectType = checkParts[4];
    const severity = parseInt(checkParts[5]);
    const inspectedAtResult = parseDateTimeAndConvertToUtc(checkParts[6], inspTimeOffset);
    const notes = checkParts[7] || "";

    if (isNaN(zoneId)) {
      throw new Error(`Invalid zone ID in CHECK: ${checkParts[2]}`);
    }
    if (isNaN(severity)) {
      throw new Error(`Invalid severity in CHECK: ${checkParts[5]}`);
    }

    checks.push({
      assetId,
      zoneId,
      componentName,
      defectType,
      severity,
      inspectedAt: inspectedAtResult.local,
      inspectedAtUtc: inspectedAtResult.utc,
      notes,
    });
    currentLine++;
  }

  if (currentLine >= lines.length || lines[currentLine] !== "DEFECTS") {
    throw new Error(`Expected DEFECTS, got: ${lines[currentLine] || 'EOF'}`);
  }
  currentLine++;

  const defects: ParsedInspection['defects'] = [];
  while (currentLine < lines.length && lines[currentLine].startsWith("DEFECT*")) {
    const defectParts = lines[currentLine].split('*');
    if (defectParts.length < 7) {
      throw new Error(`Invalid DEFECT format: ${lines[currentLine]}`);
    }

    const assetId = defectParts[1];
    const zoneId = parseInt(defectParts[2]);
    const componentName = defectParts[3];
    const defectType = defectParts[4];
    const severity = parseInt(defectParts[5]);
    const inspectedAtResult = parseDateTimeAndConvertToUtc(defectParts[6], inspTimeOffset);
    const notes = defectParts[7] || "";

    if (isNaN(zoneId)) {
      throw new Error(`Invalid zone ID in DEFECT: ${defectParts[2]}`);
    }
    if (isNaN(severity)) {
      throw new Error(`Invalid severity in DEFECT: ${defectParts[5]}`);
    }

    defects.push({
      assetId,
      zoneId,
      componentName,
      defectType,
      severity,
      inspectedAt: inspectedAtResult.local,
      inspectedAtUtc: inspectedAtResult.utc,
      notes,
    });
    currentLine++;
  }

  if (currentLine >= lines.length || lines[currentLine] !== "END***") {
    throw new Error(`Expected END*** marker, got: ${lines[currentLine] || 'EOF'}`);
  }

  return {
    inspectionId,
    companyId,
    driverName,
    driverId,
    inspStartTime: inspStartTimeResult.local,
    inspSubmitTime: inspSubmitTimeResult.local,
    inspStartTimeUtc: inspStartTimeResult.utc,
    inspSubmitTimeUtc: inspSubmitTimeResult.utc,
    inspTimeOffset,
    inspTimeDst,
    assets,
    inspectionType,
    formFields,
    checks,
    defects,
  };
}
