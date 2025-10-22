import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions, Content, TableCell } from "pdfmake/interfaces";
import type { InspectionWithDefects, Company } from "@shared/schema";
import * as pdfFonts from "pdfmake/build/vfs_fonts";

function getPrinter(): PdfPrinter {
  // Type assertion for vfs_fonts - the structure varies between versions
  const vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;
  
  const fonts = {
    Roboto: {
      normal: Buffer.from(vfs["Roboto-Regular.ttf"], 'base64'),
      bold: Buffer.from(vfs["Roboto-Medium.ttf"], 'base64'),
      italics: Buffer.from(vfs["Roboto-Italic.ttf"], 'base64'),
      bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], 'base64'),
    },
  };
  
  return new PdfPrinter(fonts);
}

interface GeneratePDFOptions {
  inspections: InspectionWithDefects[];
  company: Company;
}

export function generateInspectionsPDF(options: GeneratePDFOptions): PDFKit.PDFDocument {
  const { inspections, company } = options;
  const printer = getPrinter();

  const docDefinition: TDocumentDefinitions = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 60],
    
    header: (currentPage: number, pageCount: number) => {
      return {
        margin: [40, 20, 40, 0],
        columns: [
          {
            text: company.name,
            style: "companyName",
            width: "*",
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: "right",
            style: "pageNumber",
            width: 100,
          },
        ],
      };
    },

    footer: (currentPage: number) => {
      return {
        margin: [40, 0, 40, 20],
        text: `Inspection Brick - Generated on ${new Date().toLocaleDateString()}`,
        alignment: "center",
        style: "footer",
      };
    },

    content: generateContent(inspections, company),

    styles: {
      companyName: {
        fontSize: 14,
        bold: true,
        color: "#1a1a1a",
      },
      pageNumber: {
        fontSize: 9,
        color: "#666666",
      },
      footer: {
        fontSize: 8,
        color: "#999999",
      },
      reportTitle: {
        fontSize: 20,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 15, 0, 8],
        color: "#FF5722",
      },
      label: {
        fontSize: 9,
        color: "#666666",
        margin: [0, 0, 0, 2],
      },
      value: {
        fontSize: 11,
        margin: [0, 0, 0, 8],
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        fillColor: "#f5f5f5",
        color: "#333333",
      },
      tableCell: {
        fontSize: 9,
      },
      statusBadge: {
        fontSize: 9,
        bold: true,
      },
      noDefects: {
        fontSize: 10,
        italics: true,
        color: "#999999",
        margin: [0, 10, 0, 0],
      },
    },

    defaultStyle: {
      font: "Roboto",
    },
  };

  return printer.createPdfKitDocument(docDefinition);
}

function generateContent(inspections: InspectionWithDefects[], company: Company): Content[] {
  const content: Content[] = [];

  content.push({
    text: "Inspection Report",
    style: "reportTitle",
  });

  content.push({
    text: `Company: ${company.name}`,
    style: "value",
    margin: [0, 0, 0, 5],
  });

  content.push({
    text: `Total Inspections: ${inspections.length}`,
    style: "value",
    margin: [0, 0, 0, 20],
  });

  inspections.forEach((inspection, index) => {
    if (index > 0) {
      content.push({ text: "", pageBreak: "before" });
    }

    content.push({
      text: `Inspection ${index + 1} of ${inspections.length}`,
      style: "sectionHeader",
      color: "#333333",
    });

    const inspectionDetails = [
      [
        { text: "Inspection ID", style: "label" },
        { text: inspection.id, style: "value" },
        { text: "Date & Time", style: "label" },
        { text: new Date(inspection.datetime).toLocaleString(), style: "value" },
      ],
      [
        { text: "Inspection Type", style: "label" },
        { text: inspection.inspectionType, style: "value" },
        { text: "Asset ID", style: "label" },
        { text: inspection.assetId, style: "value" },
      ],
      [
        { text: "Driver Name", style: "label" },
        { text: inspection.driverName, style: "value" },
        { text: "Driver ID", style: "label" },
        { text: inspection.driverId, style: "value" },
      ],
    ];

    content.push({
      table: {
        widths: [80, "*", 80, "*"],
        body: inspectionDetails,
      },
      layout: "noBorders",
      margin: [0, 0, 0, 10],
    });

    content.push({
      text: `Defects (${inspection.defects?.length || 0})`,
      style: "sectionHeader",
    });

    if (inspection.defects && inspection.defects.length > 0) {
      const defectTableBody: TableCell[][] = [
        [
          { text: "Zone", style: "tableHeader" },
          { text: "Component", style: "tableHeader" },
          { text: "Defect", style: "tableHeader" },
          { text: "Severity", style: "tableHeader", alignment: "center" },
          { text: "Status", style: "tableHeader", alignment: "center" },
        ],
      ];

      inspection.defects.forEach((defect) => {
        defectTableBody.push([
          { text: defect.zoneName, style: "tableCell" },
          { text: defect.componentName, style: "tableCell" },
          { text: defect.defect, style: "tableCell" },
          {
            text: defect.severity.toString(),
            style: "tableCell",
            alignment: "center",
            color: getSeverityColor(defect.severity),
            bold: true,
          },
          {
            text: defect.status.toUpperCase(),
            style: "statusBadge",
            alignment: "center",
            color: getStatusColor(defect.status),
          },
        ]);

        if (defect.driverNotes) {
          defectTableBody.push([
            {
              text: "Driver Notes:",
              style: "label",
              colSpan: 2,
            },
            {},
            {
              text: defect.driverNotes,
              style: "tableCell",
              colSpan: 3,
              italics: true,
            },
            {},
            {},
          ]);
        }

        if (defect.repairNotes) {
          defectTableBody.push([
            {
              text: "Repair Notes:",
              style: "label",
              colSpan: 2,
            },
            {},
            {
              text: defect.repairNotes,
              style: "tableCell",
              colSpan: 3,
              italics: true,
            },
            {},
            {},
          ]);
        }
      });

      content.push({
        table: {
          headerRows: 1,
          widths: [70, 80, "*", 50, 60],
          body: defectTableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#e0e0e0",
          vLineColor: () => "#e0e0e0",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      });
    } else {
      content.push({
        text: "No defects found for this inspection.",
        style: "noDefects",
      });
    }

    if (inspection.inspectionFormData) {
      content.push({
        text: "Additional Notes",
        style: "sectionHeader",
      });
      content.push({
        text: inspection.inspectionFormData,
        style: "value",
      });
    }
  });

  return content;
}

function getSeverityColor(severity: number): string {
  if (severity >= 75) return "#d32f2f";
  if (severity >= 50) return "#f57c00";
  if (severity >= 25) return "#fbc02d";
  return "#388e3c";
}

function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "#d32f2f";
    case "pending":
      return "#f57c00";
    case "repaired":
      return "#388e3c";
    default:
      return "#666666";
  }
}
