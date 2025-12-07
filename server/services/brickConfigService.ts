import { type IStorage } from "../storage";

/**
 * Sanitizes a value for EDI format by only allowing safe characters.
 * Allowed: A-Z a-z 0-9 space . , : ; / - _ ' " ( ) #
 * All other characters (including * CR LF) are replaced with space.
 * Multiple consecutive spaces are collapsed to single space.
 */
function sanitize(value: string | null | undefined, fieldName: string): string {
  if (!value) return '';
  
  // Replace any character not in the allowed set with a space
  // Allowed: A-Z a-z 0-9 space . , : ; / - _ ' " ( ) #
  const sanitized = value
    .replace(/[^A-Za-z0-9 .,;:\/\-_'"()#]/g, ' ')
    .replace(/\s+/g, ' ')  // Collapse multiple spaces to single space
    .trim();
  
  if (sanitized !== value) {
    console.log(`⚠️  [BrickConfig] Sanitized ${fieldName}: "${value}" -> "${sanitized}"`);
  }
  
  return sanitized;
}

/**
 * Generates BRICKCONFIG EDI format for device download
 * Format sections: ASSETS, LAYOUTS, INSPTYPES, USERS
 */
export async function generateBrickConfig(
  storage: IStorage,
  companyId: string
): Promise<string> {
  console.log(`🔧 [BrickConfig] Generating config for company: ${companyId}`);
  
  const lines: string[] = [];
  
  // Header
  lines.push('BRICKCONFIG*2');
  lines.push('');
  
  // === ASSETS SECTION ===
  lines.push('ASSETS');
  
  // Get all assets for this company (no pagination)
  const assetsResult = await storage.getAssets({ 
    companyId, 
    limit: 10000,
    status: 'ACTIVE'
  });
  
  console.log(`📦 [BrickConfig] Found ${assetsResult.data.length} assets`);
  
  for (const asset of assetsResult.data) {
    // Get layout name from layout UUID
    const layout = await storage.getLayoutByUUID(asset.layout);
    const layoutName = layout ? sanitize(layout.layoutName, 'layoutName') : 'UNKNOWN';
    
    const assetId = sanitize(asset.assetId, 'assetId');
    const assetTag = sanitize(asset.licensePlate || '', 'licensePlate');
    
    // Include all delimiters even when fields are empty
    const assetLine = `AS*${assetId}*${layoutName}*${assetTag}`;
    console.log(`📦 [BrickConfig] Asset line: ${assetLine}`);
    lines.push(assetLine);
  }
  
  lines.push('');
  
  // === LAYOUTS SECTION ===
  lines.push('LAYOUTS');
  lines.push('');
  
  const layouts = await storage.getLayouts(companyId);
  console.log(`📐 [BrickConfig] Found ${layouts.length} layouts`);
  
  for (const layout of layouts) {
    const layoutName = sanitize(layout.layoutName, 'layoutName');
    lines.push(`LAY*${layoutName}`);
    lines.push('');
    
    // Get zones for this layout
    const zones = await storage.getLayoutZones(layout.id);
    console.log(`🔹 [BrickConfig] Layout ${layoutName}: ${zones.length} zones`);
    
    for (const zone of zones) {
      const zoneTag = sanitize(zone.zoneTag || '', 'zoneTag');
      const zoneName = sanitize(zone.zoneName, 'zoneName');
      // Include image UUID at end (always include trailing * even if no image)
      const imageId = zone.imageId || '';
      lines.push(`LAYZONE*${zoneTag}*${zoneName}*${imageId}`);
      
      // Get components for this zone
      const components = await storage.getZoneComponents(zone.id);
      
      for (const component of components) {
        const componentName = sanitize(component.componentName, 'componentName');
        const componentInstructions = sanitize(component.componentInspectionInstructions || '', 'componentInstructions');
        
        // Get defects for this component
        const defects = await storage.getComponentDefects(component.id);
        
        // Build ZONECOMP line: componentName*instructions*defect1*defect2*...
        // Always include instructions field (even if empty) after componentName
        const defectNames = defects.map(d => sanitize(d.defectName, 'defectName'));
        const parts = [componentName, componentInstructions, ...defectNames];
        
        lines.push(`ZONECOMP*${parts.join('*')}`);
      }
      
      lines.push('');
    }
  }
  
  // === INSPECTION TYPES SECTION ===
  lines.push('INSPTYPES');
  lines.push('');
  
  const inspectionTypesResult = await storage.getInspectionTypes({ 
    companyId, 
    limit: 10000,
    status: 'ACTIVE'
  });
  
  console.log(`📋 [BrickConfig] Found ${inspectionTypesResult.data.length} inspection types`);
  
  for (const inspType of inspectionTypesResult.data) {
    const inspTypeName = sanitize(inspType.inspectionTypeName, 'inspectionTypeName');
    
    // Get full inspection type with form fields
    const fullInspType = await storage.getInspectionTypeById(inspType.inspectionTypeName, companyId);
    if (!fullInspType) {
      console.log(`⚠️  [BrickConfig] Could not find full inspection type: ${inspTypeName}`);
      continue;
    }
    
    // Get associated layouts
    const layoutIds = await storage.getInspectionTypeLayouts(fullInspType.id);
    
    let applicableLayouts: string;
    if (layoutIds.length === 0) {
      // Empty junction table = ALL layouts
      applicableLayouts = 'ALL';
      console.log(`📌 [BrickConfig] Inspection type "${inspTypeName}" applies to ALL layouts`);
    } else {
      // Get layout names
      const layoutNames: string[] = [];
      for (const layoutId of layoutIds) {
        const layout = await storage.getLayoutByUUID(layoutId);
        if (layout) {
          layoutNames.push(sanitize(layout.layoutName, 'layoutName'));
        }
      }
      applicableLayouts = layoutNames.join('*');
      console.log(`📌 [BrickConfig] Inspection type "${inspTypeName}" applies to: ${applicableLayouts}`);
    }
    
    lines.push(`INSP*${inspTypeName}*${applicableLayouts}`);
    
    // Use form fields from fullInspType
    for (const field of fullInspType.formFields) {
      const fieldName = sanitize(field.formFieldName, 'formFieldName');
      const fieldType = sanitize(field.formFieldType.toLowerCase(), 'formFieldType');
      const fieldLength = field.formFieldLength.toString();
      
      lines.push(`INSPFF*${fieldName}*${fieldType}*${fieldLength}`);
    }
    
    lines.push('');
  }
  
  // === USERS SECTION ===
  lines.push('USERS');
  lines.push('');
  
  const usersResult = await storage.getUsers({ 
    companyId, 
    limit: 10000,
    status: 'ACTIVE'
  });
  
  console.log(`👥 [BrickConfig] Found ${usersResult.data.length} users`);
  
  for (const user of usersResult.data) {
    // Note: We need to get the user with password for device sync
    const fullUser = await storage.getUserById(user.userId);
    if (fullUser) {
      const fullName = sanitize(fullUser.userFullName, 'userFullName');
      const userId = sanitize(fullUser.userId, 'userId');
      const password = sanitize(fullUser.password, 'password');
      
      lines.push(`USER*${fullName}*${userId}*${password}`);
    }
  }
  
  lines.push('');
  
  // === END MARKER ===
  lines.push('END');
  
  const config = lines.join('\n');
  console.log(`✅ [BrickConfig] Generated config: ${lines.length} lines, ${config.length} bytes`);
  
  return config;
}
