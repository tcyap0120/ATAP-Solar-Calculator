import JSZip from 'jszip';

export const generateDocument = async (templateFile: Blob | ArrayBuffer, data: Record<string, string | number>) => {
  // Load the zip file (docx is a zip)
  // JSZip.loadAsync accepts Blob, ArrayBuffer, etc.
  const zip = await JSZip.loadAsync(templateFile);
  
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Invalid .docx file: word/document.xml not found");
  
  const docXml = await docFile.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXml, "application/xml");
  
  // Robust search for SDT elements using localName to ignore namespace prefix issues
  const allElements = xmlDoc.getElementsByTagName("*");
  const sdts: Element[] = [];
  for (let i = 0; i < allElements.length; i++) {
    if (allElements[i].localName === "sdt") {
      sdts.push(allElements[i]);
    }
  }
  
  let replacedCount = 0;

  for (const sdt of sdts) {
    // Strategy: Read the text typed INSIDE the content control (sdtContent) 
    // and use that as the key to look up data.

    // 1. Find Content (sdtContent)
    let contentElement: Element | null = null;
    for (let i = 0; i < sdt.childNodes.length; i++) {
        const child = sdt.childNodes[i] as Element;
        if (child.localName === "sdtContent") {
            contentElement = child;
            break;
        }
    }

    if (!contentElement) continue;

    // 2. Extract current text to identify the field key
    // We search for w:t elements to get the text shown in Word
    const textNodes = contentElement.getElementsByTagName("w:t");
    
    let currentText = "";
    for (let k = 0; k < textNodes.length; k++) {
        currentText += textNodes[k].textContent;
    }

    // Normalize: remove all whitespace and convert to lowercase to use as key
    // e.g., "Client Name" -> "clientname"
    const key = currentText.replace(/\s+/g, '').toLowerCase();

    if (!key) continue;
    
    // 3. Check if we have data for this key
    if (data.hasOwnProperty(key)) {
        const val = String(data[key]);
        
        if (textNodes.length > 0) {
            // Strategy: Update the first text node, clear the rest.
            // This preserves the paragraph/run structure of the first piece of text.
            textNodes[0].textContent = val;
            for (let k = 1; k < textNodes.length; k++) {
                textNodes[k].textContent = "";
            }
            replacedCount++;
        } else {
             // Rare case: Content control is empty or has no text runs yet.
             // Try to append a basic Paragraph > Run > Text structure.
             try {
                 const p = xmlDoc.createElement("w:p");
                 const r = xmlDoc.createElement("w:r");
                 const t = xmlDoc.createElement("w:t");
                 t.textContent = val;
                 r.appendChild(t);
                 p.appendChild(r);
                 contentElement.appendChild(p);
                 replacedCount++;
             } catch (e) {
                 console.warn("Could not append new structure to empty content control", e);
             }
        }
    }
  }
  
  console.log(`Replaced ${replacedCount} content controls based on inner text.`);

  const serializer = new XMLSerializer();
  const newXml = serializer.serializeToString(xmlDoc);
  zip.file("word/document.xml", newXml);
  
  return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
};