const ideaEl = document.getElementById('idea');
const apiUrlEl = document.getElementById('apiUrl');
const apiKeyEl = document.getElementById('apiKey');
const analyzeBtn = document.getElementById('analyzeBtn');
const spinner = document.getElementById('spinner');
const statusEl = document.getElementById('status');
const resultCardEl = document.getElementById('resultCard');
const resultEl = document.getElementById('result');
const downloadBtn = document.getElementById('downloadBtn');
const credentialsPanel = document.getElementById('credentialsPanel');
const credentialsNotice = document.getElementById('credentialsNotice');

const storedApiUrl = localStorage.getItem('nvidiaApiUrl');
const storedApiKey = localStorage.getItem('nvidiaApiKey');
if (storedApiUrl) apiUrlEl.value = storedApiUrl;
if (storedApiKey) apiKeyEl.value = storedApiKey;

let hasServerConfig = false;


async function initCredentialDisplay() {
  try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        hasServerConfig = data.hasNvidiaConfig;
      }
    } catch (err) {
      console.warn('Unable to fetch config status', err);
    }

    const storedValuesExist = Boolean(storedApiKey || storedApiUrl);
    if (storedValuesExist || hasServerConfig) {
      credentialsPanel?.classList.add('hidden');
      credentialsNotice?.classList.remove('hidden');
    } else {
      credentialsPanel?.classList.remove('hidden');
      credentialsNotice?.classList.add('hidden');
    }
  }

  initCredentialDisplay();

  analyzeBtn.addEventListener('click', async () => {
    const idea = ideaEl.value.trim();
    const apiKey = apiKeyEl.value.trim() || localStorage.getItem('nvidiaApiKey');
    const apiUrl = apiUrlEl.value.trim() || localStorage.getItem('nvidiaApiUrl');

    if (apiKey) localStorage.setItem('nvidiaApiKey', apiKey);
    if (apiUrl) localStorage.setItem('nvidiaApiUrl', apiUrl);

    if (!idea) {
      statusEl.textContent = 'Please enter an idea to analyze.';
      return;
    }

    resultCardEl.classList.add('hidden');
    downloadBtn.classList.add('hidden');
    resultEl.textContent = '';
    analyzeBtn.classList.add('loading');
    spinner.classList.remove('hidden');
    analyzeBtn.disabled = true;
    statusEl.textContent = 'Analyzing...';

    try {
      const requestBody = { idea };
      if (apiKey) requestBody.apiKey = apiKey;
      if (apiUrl) requestBody.apiUrl = apiUrl;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      let data = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          if (response.ok) {
            throw new Error(`Server returned non-JSON response: ${responseText.slice(0, 240)}`);
          }
        }
      }

      if (!response.ok) {
        const message = data?.error || responseText || `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      statusEl.textContent = 'Analysis complete.';
      resultEl.innerHTML = renderResultHtml(data.result || 'No analysis received.');
      resultCardEl.classList.remove('hidden');
      downloadBtn.classList.remove('hidden');
    } catch (error) {
      statusEl.textContent = `Error: ${error.message}`;
    } finally {
      analyzeBtn.classList.remove('loading');
      spinner.classList.add('hidden');
      analyzeBtn.disabled = false;
    }
  });

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInlineText(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function renderResultHtml(rawText) {
  const lines = rawText.split(/\r?\n/);
  let html = '';
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html += '</ul>';
      listOpen = false;
    }
  };

  const addParagraph = (line) => {
    closeList();
    html += `<p>${formatInlineText(line)}</p>`;
  };

  const addLabeledParagraph = (label, value) => {
    closeList();
    html += `<p><strong>${escapeHtml(label)}:</strong> ${formatInlineText(value)}</p>`;
  };

  const addHeading = (text, level = 4) => {
    closeList();
    const tag = level === 3 ? 'h3' : 'h4';
    html += `<${tag}>${escapeHtml(text)}</${tag}>`;
  };

  const addBlockquote = (line) => {
    closeList();
    const quoteText = line.replace(/^>\s+/, '').trim();
    html += `<blockquote>${formatInlineText(quoteText)}</blockquote>`;
  };

  const openList = () => {
    if (!listOpen) {
      html += '<ul class="result-list">';
      listOpen = true;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      html += '<div class="result-spacer"></div>';
      return;
    }

    if (/^>\s+/.test(trimmed)) {
      addBlockquote(trimmed);
      return;
    }

    if (/^".+"\s*[—-]/.test(trimmed)) {
      addBlockquote(trimmed);
      return;
    }

    const boldHeadingMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldHeadingMatch) {
      addHeading(boldHeadingMatch[1], 3);
      return;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#{1,6}\s+/, '');
      addHeading(headingText, 3);
      return;
    }

    if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      openList();
      const item = trimmed.replace(/^[-*•]\s+|^\d+[.)]\s+/, '');
      html += `<li>${formatInlineText(item)}</li>`;
      return;
    }

    if (/^[A-Z][A-Z0-9 \-\/&]{4,}$/.test(trimmed) && trimmed === trimmed.toUpperCase()) {
      addHeading(trimmed, 3);
      return;
    }

    const labelMatch = trimmed.match(/^([^:]{2,50}):\s*(.+)$/);
    if (labelMatch && trimmed.length < 120) {
      addLabeledParagraph(labelMatch[1], labelMatch[2]);
      return;
    }

    if (/^(.+):$/.test(trimmed) && trimmed.length < 80) {
      addHeading(trimmed.replace(/:$/, ''), 4);
      return;
    }

    addParagraph(trimmed);
  });

  closeList();
  return html;
}

function getJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
  if (window.jsPDF) return window.jsPDF;
  return null;
}

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    const existing = getJsPDF();
    if (existing) return resolve(existing);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    script.onload = () => {
      const loaded = getJsPDF();
      if (loaded) return resolve(loaded);
      reject(new Error('jsPDF loaded but is unavailable.'));
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF from CDN.'));
    document.body.appendChild(script);
  });
}

async function downloadPdf() {
  if (!resultEl.textContent) return;
  const jsPDF = getJsPDF() || await loadJsPDF().catch((err) => {
    console.error(err);
    alert('PDF generation failed: jsPDF library could not be loaded. Please refresh or check your network.');
    return null;
  });
  if (!jsPDF) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const pageWidth = 210 - margin * 2;
  const lineHeight = 8.2;
  const headerHeight = 38;
  let y = margin;

  const newPage = () => {
    doc.addPage();
    drawPageBackground();
    y = margin + headerHeight;
  };

  const drawPageBackground = () => {
    doc.setFillColor(245, 240, 232);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin - 2, margin - 2, pageWidth + 4, 297 - margin * 2 + 4, 8, 8, 'F');
    doc.setFillColor(255, 107, 0);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('Dhandha.ai Report', margin, 8);
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 210 - margin, 8, { align: 'right' });
    doc.setDrawColor(255, 107, 0);
    doc.setLineWidth(0.4);
    doc.line(margin, 14, 210 - margin, 14);
  };

  const addSectionHeader = (text, level = 3) => {
    if (y > 278) newPage();
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 107, 0);
    doc.setFontSize(level === 3 ? 13 : 11);
    doc.text(text, margin, y);
    y += level === 3 ? 8 : 7;
    doc.setDrawColor(255, 107, 0);
    doc.setLineWidth(0.45);
    doc.line(margin, y - 2, 210 - margin, y - 2);
    y += 5;
  };

  const addParagraph = (text, opts = {}) => {
    if (y > 278) newPage();
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size || 10);
    doc.setTextColor(35, 35, 35);
    const wrapped = doc.splitTextToSize(text, pageWidth - (opts.indent || 0));
    wrapped.forEach((line) => {
      if (y > 278) newPage();
      doc.text(line, margin + (opts.indent || 0), y);
      y += lineHeight;
    });
    y += opts.spacingAfter || 0;
  };

  const addBullet = (text) => {
    if (y > 278) newPage();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(45, 45, 45);
    const wrapped = doc.splitTextToSize(text, pageWidth - 20);
    wrapped.forEach((line, index) => {
      if (y > 278) newPage();
      if (index === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 107, 0);
        doc.text('•', margin + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(45, 45, 45);
      }
      doc.text(line, margin + 8, y);
      y += lineHeight;
    });
    y += 1;
  };

  const addBlockquote = (text) => {
    const quoteLines = doc.splitTextToSize(text, pageWidth - 20);
    const blockHeight = quoteLines.length * lineHeight + 12;
    if (y + blockHeight > 278) newPage();
    doc.setFillColor(255, 244, 230);
    doc.roundedRect(margin, y, pageWidth, blockHeight, 4, 4, 'F');
    doc.setDrawColor(255, 178, 89);
    doc.setLineWidth(0.5);
    doc.line(margin + 4, y + 4, margin + 4, y + blockHeight - 6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(95, 60, 35);
    quoteLines.forEach((line) => {
      doc.text(line, margin + 10, y + 9);
      y += lineHeight;
    });
    doc.setFont('helvetica', 'normal');
    y += 10;
  };

  const renderElement = (element) => {
    if (element.tagName === 'H3') {
      addSectionHeader(element.textContent.trim(), 3);
      return;
    }
    if (element.tagName === 'H4') {
      addSectionHeader(element.textContent.trim(), 4);
      return;
    }
    if (element.tagName === 'P') {
      addParagraph(element.textContent.trim(), { spacingAfter: 2 });
      return;
    }
    if (element.tagName === 'UL') {
      element.querySelectorAll('li').forEach((li) => addBullet(li.textContent.trim()));
      return;
    }
    if (element.tagName === 'BLOCKQUOTE') {
      addBlockquote(element.textContent.trim());
      return;
    }
    if (element.classList && element.classList.contains('result-spacer')) {
      y += 6;
      return;
    }
    if (element.childNodes && element.childNodes.length) {
      element.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          addParagraph(child.textContent.trim(), { spacingAfter: 2 });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          renderElement(child);
        }
      });
    }
  };

  drawPageBackground();
  y = margin + headerHeight;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(13, 13, 13);
  doc.text('Startup Idea Validation', margin, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(95, 95, 95);
  doc.text('Investor-grade report styled for Dhandha.ai', margin, y);
  y += 11;
  doc.setDrawColor(238, 140, 45);
  doc.setLineWidth(0.8);
  doc.line(margin, y, 210 - margin, y);
  y += 10;

  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(resultEl.innerHTML, 'text/html');
  htmlDoc.body.childNodes.forEach(renderElement);

  const idea = ideaEl.value.trim() || 'startup-idea';
  const fileName = `dhandha-report-${idea.replace(/[^a-zA-Z0-9]+/g, '-').substring(0, 30) || 'report'}.pdf`;
  doc.save(fileName);
}

downloadBtn.addEventListener('click', downloadPdf);
