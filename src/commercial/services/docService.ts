import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import { renderAsync } from 'docx-preview';

const saveAs = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const loadDefaultTemplate = async (): Promise<ArrayBuffer> => {
    try {
        const response = await fetch('/commercial/quotationtofill.docx');
        if (!response.ok) {
            throw new Error(`Failed to load default template: ${response.statusText}`);
        }
        return await response.arrayBuffer();
    } catch (error) {
        console.error("Error loading default template:", error);
        throw error;
    }
};

const patchContentControls = (zip: PizZip, data: any) => {
    const xmlFile = "word/document.xml";
    if (zip.file(xmlFile)) {
        try {
            const xmlText = zip.file(xmlFile).asText();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");
            
            // w:sdt elements represent Content Controls
            const sdtElements = Array.from(xmlDoc.getElementsByTagName("w:sdt"));
            
            for (const sdt of sdtElements) {
                // Find properties (sdtPr)
                const sdtPr = sdt.getElementsByTagName("w:sdtPr")[0];
                if (!sdtPr) continue;

                // 1. Find the Tag or Alias (Title) inside sdtPr
                const tagNode = sdtPr.getElementsByTagName("w:tag")[0];
                const aliasNode = sdtPr.getElementsByTagName("w:alias")[0];
                
                let key = "";
                // Try w:val from tag first, then alias
                if (tagNode && tagNode.getAttribute("w:val")) {
                    key = tagNode.getAttribute("w:val") || "";
                } else if (aliasNode && aliasNode.getAttribute("w:val")) {
                    key = aliasNode.getAttribute("w:val") || "";
                }
                
                // Normalize key: lowercase and remove spaces to match "Client Name" with "clientname"
                const normalizedKey = key ? key.trim().toLowerCase().replace(/\s+/g, '') : "";

                // Match key against data
                if (normalizedKey && data.hasOwnProperty(normalizedKey)) {
                    const value = String(data[normalizedKey]);
                    
                    // 2. CRITICAL: Remove w:showingPlcHdr
                    // If this element remains, Word treats the text as a placeholder.
                    const showingPlcHdr = sdtPr.getElementsByTagName("w:showingPlcHdr")[0];
                    if (showingPlcHdr && showingPlcHdr.parentNode) {
                        showingPlcHdr.parentNode.removeChild(showingPlcHdr);
                    }

                    // 3. Update Text Content in sdtContent
                    const contentNode = sdt.getElementsByTagName("w:sdtContent")[0];
                    if (contentNode) {
                        const textNodes = contentNode.getElementsByTagName("w:t");
                        if (textNodes.length > 0) {
                            // Update the first text node
                            textNodes[0].textContent = value;
                            textNodes[0].setAttribute("xml:space", "preserve");
                            
                            // Clear subsequent nodes to prevent mixed content
                            for (let j = 1; j < textNodes.length; j++) {
                                textNodes[j].textContent = "";
                            }
                        } else {
                             // If w:t is missing (e.g. empty content control), we might need to inject structure.
                             // For now, simpler implementation assumes structure exists.
                        }
                    }
                }
            }

            const serializer = new XMLSerializer();
            const newXml = serializer.serializeToString(xmlDoc);
            zip.file(xmlFile, newXml);
        } catch (e) {
            console.error("Error patching content controls:", e);
        }
    }
    return zip;
};

export const createFilledDocBlob = (buffer: ArrayBuffer, data: any): Blob => {
    let zip = new PizZip(buffer);

    // Normalize keys to lowercase for matching
    const normalizedData: any = {};
    Object.keys(data).forEach(key => {
        const val = data[key];
        normalizedData[key] = val;
        normalizedData[key.toLowerCase()] = val; 
        normalizedData[key.toLowerCase().replace(/\s+/g, '')] = val; // Handle "Client Name" -> "clientname"
    });

    // 1. Patch Content Controls (XML manipulation)
    zip = patchContentControls(zip, normalizedData);

    // 2. Run Docxtemplater for curly braces {}
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    doc.render(normalizedData);

    return doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
};

export const generateDocument = (buffer: ArrayBuffer, data: any, fileName: string) => {
    try {
        const blob = createFilledDocBlob(buffer, data);
        saveAs(blob, fileName);
    } catch (error) {
        console.error("Doc Generation Error:", error);
        throw error;
    }
};

export const renderDocxToElement = async (blob: Blob, container: HTMLElement) => {
    try {
        await renderAsync(blob, container, undefined, {
             inWrapper: false, 
             ignoreWidth: false,
             ignoreHeight: false,
             ignoreFonts: false,
             breakPages: true,
             useBase64URL: true,
             experimental: true,
             trimXmlDeclaration: true,
             debug: false
        });
    } catch (error) {
        console.error("Docx Preview Error:", error);
        throw error;
    }
}

export const inspectDocument = (buffer: ArrayBuffer) => {
    try {
        const zip = new PizZip(buffer);
        const xml = zip.file("word/document.xml")?.asText() || "";
        
        const hasCurlyBraces = /\{.*?\}/.test(xml);
        const hasContentControls = xml.includes('<w:sdt>');
        
        return { hasCurlyBraces, hasContentControls };
    } catch (e) {
        return { hasCurlyBraces: false, hasContentControls: false };
    }
};

export const generateSampleTemplate = () => {
    alert("Please create a Word document with placeholders like {ClientName}, {SystemSize}, {SystemPrice} etc.");
};