/**
 * Generates a high-quality PDF from a DOM element.
 * @param elementId The ID of the HTML element to capture.
 * @param fileName The name of the PDF file to be saved.
 */
export async function generatePDF(elementId: string, fileName: string) {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  try {
    // Dynamically import to avoid SSR issues with node-specific modules in jspdf/fflate
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf').then(mod => mod.default),
      import('html2canvas').then(mod => mod.default)
    ]);

    // Add a class to the element to apply print-specific styles temporarily
    element.classList.add('printing-mode');

    const canvas = await html2canvas(element, {
      scale: 2, // Increase resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#030712', // Match our dark theme background
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Calculate PDF dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2], // Keep original aspect ratio but at manageable scale
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(`${fileName}.pdf`);

    element.classList.remove('printing-mode');
  } catch (error) {
    console.error('Error generating PDF:', error);
    element.classList.remove('printing-mode');
  }
}
