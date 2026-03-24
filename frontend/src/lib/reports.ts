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
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.borderRadius = '0';
          clonedElement.style.border = 'none';
          clonedElement.style.width = '1200px'; // Wider for better aspect ratio in PDF
          clonedElement.style.maxWidth = 'none';
          clonedElement.style.position = 'relative';
          clonedElement.style.display = 'flex';
          clonedElement.style.flexDirection = 'column';
          
          // Force all charts to have a fixed height in the clone to avoid Recharts ResponsiveContainer -1 issue
          const charts = clonedElement.querySelectorAll('.recharts-responsive-container');
          charts.forEach(chart => {
            const chartEl = chart as HTMLElement;
            chartEl.style.height = '400px';
            chartEl.style.width = '1100px';
            chartEl.style.visibility = 'visible';
          });

          // Fix for oklab/oklch: if a color property contains oklab or oklch, fallback to something safe
          const allElements = clonedElement.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            
            // Fix for lab/oklab/oklch: if a color property contains unsupported functions, fallback to something safe
            ['color', 'background-color', 'border-color', 'outline-color'].forEach(prop => {
              const val = window.getComputedStyle(el).getPropertyValue(prop);
              if (val && (val.includes('oklab') || val.includes('oklch') || val.includes('lab('))) {
                // Simplified fallback: if it's a problematic color, we try to force a hex/rgb
                if (prop === 'color') el.style.color = '#E6EDF3';
                if (prop === 'background-color') {
                  // If it's the main container, keep the dark theme bg
                  if (el.id === elementId) el.style.backgroundColor = '#030712';
                  else el.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                }
                if (prop === 'border-color') el.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }
            });
          }
        }
      }
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
