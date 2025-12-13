const audioClick = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.m4a'); 
const audioWin = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.m4a'); 

export function playClick() { audioClick.play().catch(()=>{}); }
export function playWin() { audioWin.play().catch(()=>{}); }

export function updateResultUI(prediction) {
    const resultText = document.getElementById('ai-result');
    const confText = document.getElementById('ai-confidence');
    const reasonText = document.getElementById('ai-reason');
    const btnT = document.getElementById('btn-t');

    if (!prediction) {
        resultText.style.color = '#fff';
        resultText.innerText = "?";
        confText.innerText = "0%";
        reasonText.innerText = "READY";
        if(btnT) { btnT.style.border = "none"; btnT.classList.remove("animate-pulse"); }
        return;
    }

    const color = prediction.result === 'B' ? '#ef4444' : '#3b82f6';
    const text = prediction.result === 'B' ? 'BANKER' : 'PLAYER';
    
    resultText.style.opacity = '1'; 
    resultText.style.color = color; 
    resultText.innerText = text;
    confText.innerText = `${prediction.confidence}%`;
    reasonText.innerHTML = prediction.reason;
    
    if (prediction.tieAlert && btnT) { btnT.style.border = "2px solid #fff"; btnT.classList.add("animate-pulse"); }
    else if (btnT) { btnT.style.border = "none"; btnT.classList.remove("animate-pulse"); }

    resultText.style.transform = 'scale(1.2)';
    setTimeout(() => resultText.style.transform = 'scale(1)', 200);
}

export function drawChart(matrix) {
    const canvas = document.getElementById('chart-canvas');
    if (!canvas) return;
    const container = canvas.parentElement; const rect = container.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    const width = canvas.width; const height = canvas.height;
    const cols = 14; const rows = 6;
    const cellWidth = width / cols; const cellHeight = height / rows;
    const radius = Math.min(cellWidth, cellHeight) * 0.4;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) { const p = i * cellWidth; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, height); ctx.stroke(); }
    for (let i = 0; i <= rows; i++) { const q = i * cellHeight; ctx.beginPath(); ctx.moveTo(0, q); ctx.lineTo(width, q); ctx.stroke(); }

    const startCol = Math.max(0, matrix.length - cols);
    for (let c = startCol; c < matrix.length; c++) {
        const matrixCol = matrix[c]; if (!matrixCol) continue;
        for (let r = 0; r < matrixCol.length; r++) {
            if (matrixCol[r]) {
                const type = matrixCol[r];
                const drawCol = c - startCol;
                const centerX = drawCol * cellWidth + cellWidth / 2;
                const centerY = r * cellHeight + cellHeight / 2;
                ctx.shadowBlur = 10;
                if (type === 'P') { ctx.fillStyle = '#3b82f6'; ctx.shadowColor = 'rgba(59, 130, 246, 0.5)'; }
                else if (type === 'T') { ctx.fillStyle = '#10b981'; ctx.shadowColor = 'rgba(16, 185, 129, 0.5)'; }
                else { ctx.fillStyle = '#ef4444'; ctx.shadowColor = 'rgba(239, 68, 68, 0.5)'; }
                ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = `700 ${radius}px Inter, sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(type, centerX, centerY + (radius * 0.1));
            }
        }
    }
}
