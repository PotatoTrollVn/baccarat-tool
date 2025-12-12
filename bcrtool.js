import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- STATE VARIABLES ---
let currentUser = null;
let currentTokens = 0;
let chartData = { letters: [], columnCounts: Array(14).fill(0) }; // 14 Cột, 6 Hàng
let aiStats = { correct: 0, total: 0 };
let currentAiPrediction = null; // Lưu dự đoán gần nhất để đối chiếu

// --- AUTH & TOKEN LISTENER ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html'; // Chưa đăng nhập thì đá về Home
    } else {
        currentUser = user;
        // Lắng nghe token realtime
        onSnapshot(doc(db, "users", user.uid), (doc) => {
            currentTokens = doc.data()?.tokens || 0;
            const el = document.getElementById('user-tokens');
            const container = document.getElementById('token-display');
            if(el && container) {
                el.innerText = currentTokens;
                container.classList.remove('hidden');
            }
        });
    }
});

// --- CANVAS LOGIC (VẼ CẦU) ---
function drawChart() {
    const canvas = document.getElementById('chart-canvas');
    if (!canvas) return;

    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Resize canvas theo khung cha
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Cấu hình lưới (14 cột x 6 hàng)
    const cols = 14;
    const rows = 6;
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    const radius = Math.min(cellWidth, cellHeight) * 0.4;

    ctx.clearRect(0, 0, width, height);

    // Vẽ lưới mờ
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= cols; i++) {
        const p = i * cellWidth;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, height); ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
        const q = i * cellHeight;
        ctx.beginPath(); ctx.moveTo(0, q); ctx.lineTo(width, q); ctx.stroke();
    }

    // Vẽ các chấm (Big Road Logic)
    chartData.letters.forEach(l => {
        const centerX = l.column * cellWidth + cellWidth / 2;
        const centerY = l.row * cellHeight + cellHeight / 2;

        ctx.shadowBlur = 10;
        
        // Màu sắc
        if (l.type === 'P') {
            ctx.fillStyle = '#3b82f6'; // Xanh
            ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
        } else if (l.type === 'T') {
            ctx.fillStyle = '#10b981'; // Lá
            ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
        } else {
            ctx.fillStyle = '#ef4444'; // Đỏ
            ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ chữ
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${radius}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(l.type, centerX, centerY + (radius * 0.1));
    });
}

// --- LOGIC PHÂN TÍCH MỚI (CHUYỂN TỪ TEST.JS SANG) ---
function analyzeChartAndPredict() {
    const history = chartData.letters;

    // 1. Kiểm tra dữ liệu trống
    if (history.length === 0) {
        return { result: '?', confidence: 0, reason: "Đang chờ dữ liệu...", advice: "Mời nhập kết quả" };
    }

    const last1 = history[history.length - 1].type;
    const last2 = history.length >= 2 ? history[history.length - 2].type : null;
    
    let scoreB = 0;
    let scoreP = 0;
    let reason = "Matrix AI"; // Lý do mặc định

    // 2. Logic Cầu Bệt (Dragon) - Từ test.js
    if (last1 === last2 && last1 !== 'T') {
        if (last1 === 'B') scoreB += 30;
        else scoreP += 30;
        reason = "Cầu Bệt (Dragon)";
    }

    // 3. Logic Cầu Đảo (Ping Pong) - Từ test.js
    if (history.length >= 3 && last1 !== last2 && last1 !== 'T') {
        if (last1 === 'B') scoreP += 35; // Nếu vừa ra B -> Dự đoán P
        else scoreB += 35;             // Nếu vừa ra P -> Dự đoán B
        reason = "Cầu Đảo (Ping Pong)";
    }

    // 4. Logic Xu hướng (Trend & Random) - Từ test.js
    let countB = 0, countP = 0;
    history.slice(-10).forEach(h => {
        if(h.type === 'B') countB++;
        if(h.type === 'P') countP++;
    });

    // Logic "bắt hồi" của test.js: Nếu B đang áp đảo thì đánh P, và ngược lại
    if (countB > countP + 2) scoreP += 20;
    else if (countP > countB + 2) scoreB += 20;
    else {
        // Random 50/50 nếu không có trend rõ ràng
        if (Math.random() > 0.5) scoreB += 10;
        else scoreP += 10;
    }

    // 5. Tính toán kết quả
    let finalResult = scoreB > scoreP ? 'B' : 'P';
    
    // 6. Tính độ tin cậy (Random 65% - 95%) - Từ test.js
    let confidence = Math.floor(Math.random() * (95 - 65 + 1) + 65);

    // 7. Xử lý trường hợp vừa có Hòa (Risky)
    if (last1 === 'T') {
        confidence -= 15;
        reason = "Vừa có Hòa (Risky)";
    }

    // 8. Tạo lời khuyên (Vì UI bcrtool.js cần trường 'advice', logic test.js không có nên ta tự sinh ra)
    let advice = "";
    if (confidence >= 85) advice = "Tự tin xuống tiền 🔥";
    else if (confidence >= 75) advice = "Đi đều tay";
    else if (confidence >= 65) advice = "Thăm dò nhẹ";
    else advice = "Nên bỏ qua ⚠️";

    return { result: finalResult, confidence, reason, advice };
}

// --- CORE HANDLERS ---
function updateWinRateUI() {
    const el = document.getElementById('winrate-text');
    const bar = document.getElementById('winrate-bar');
    
    if (el && bar) {
        let pct = 100;
        if (aiStats.total > 0) {
            pct = Math.round((aiStats.correct / aiStats.total) * 100);
        }
        
        el.innerHTML = `${pct}% (${aiStats.correct}/${aiStats.total})`;
        el.className = pct >= 50 ? 'text-emerald-500 font-bold text-xs' : 'text-red-500 font-bold text-xs';
        
        bar.style.width = `${pct}%`;
        bar.className = `h-full transition-all duration-300 w-full ${pct >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`;
    }
}

async function runPrediction() {
    // Kiểm tra Token trước khi chạy
    if (!currentUser) return;
    
    // TRỪ TIỀN (-1 TOKEN)
    try {
        await updateDoc(doc(db, "users", currentUser.uid), { 
            tokens: increment(-1) 
        });
    } catch (e) {
        console.error("Lỗi trừ tiền:", e);
        // Nếu lỗi mạng vẫn cho chạy dự đoán nhưng không lưu
    }
    
    const resultText = document.getElementById('ai-result');
    const confText = document.getElementById('ai-confidence');
    const reasonText = document.getElementById('ai-reason');
    
    // Hiệu ứng loading
    resultText.style.opacity = '0.3';
    resultText.innerText = "...";
    
    setTimeout(() => {
        const prediction = analyzeChartAndPredict();
        
        // Lưu kết quả dự đoán để check đúng sai ở lượt sau
        currentAiPrediction = prediction.result;
        
        const color = prediction.result === 'B' ? '#ef4444' : '#3b82f6';
        const text = prediction.result === 'B' ? 'BANKER' : 'PLAYER';
        
        resultText.style.opacity = '1';
        resultText.style.color = color;
        resultText.innerText = text;
        
        confText.innerText = `${Math.round(prediction.confidence)}%`;
        reasonText.innerHTML = `${prediction.reason} <br> <span style="color:#fbbf24;font-weight:bold;">${prediction.advice}</span>`;
        
        // Animation
        resultText.style.transform = 'scale(1.2)';
        setTimeout(() => resultText.style.transform = 'scale(1)', 200);
        
    }, 600); // Delay giả lập phân tích
}

window.addLetter = (type) => {
    // 1. Kiểm tra Đúng/Sai so với dự đoán trước đó
    if (currentAiPrediction && type !== 'T') {
        aiStats.total++;
        if (currentAiPrediction === type) {
            aiStats.correct++;
        }
        updateWinRateUI();
    }

    // 2. Logic xếp cột (Da Lu / Big Road cơ bản)
    // Tìm cột thấp nhất để điền vào
    let minC = 0, minV = chartData.columnCounts[0];
    for (let i = 1; i < 14; i++) {
        if (chartData.columnCounts[i] < minV) {
            minV = chartData.columnCounts[i];
            minC = i;
        }
    }
    
    // Nếu bảng đầy -> Reset
    if (minV >= 6) {
        chartData.letters = [];
        chartData.columnCounts.fill(0);
        minC = 0; minV = 0;
        alert("Bảng đã đầy! Tự động làm mới.");
    }

    // Thêm dữ liệu vào mảng
    chartData.letters.push({ type, column: minC, row: minV });
    chartData.columnCounts[minC]++;
    
    // Vẽ lại
    drawChart();
    
    // 3. Xử lý logic hiển thị dự đoán
    const historyCount = chartData.letters.length;
    // Cập nhật: test.js yêu cầu 5 điểm dữ liệu, ta sửa số này từ 4 -> 5 cho đồng bộ
    const MIN_DATA_POINTS = 5; 

    if (historyCount < MIN_DATA_POINTS) {
        // Chưa đủ dữ liệu
        const resultText = document.getElementById('ai-result');
        const reasonText = document.getElementById('ai-reason');
        const confText = document.getElementById('ai-confidence');
        
        resultText.style.color = '#94a3b8';
        resultText.style.fontSize = '32px';
        resultText.innerText = `${historyCount}/${MIN_DATA_POINTS}`;
        reasonText.innerText = `Đang thu thập mẫu: ${historyCount}`;
        confText.innerText = "0%";
        currentAiPrediction = null;
    } else {
        // Đủ dữ liệu -> Kiểm tra tiền -> Chạy dự đoán
        if (currentTokens > 0) {
            runPrediction();
        } else {
            alert("❌ Bạn đã hết Token! Vui lòng nạp thêm để xem dự đoán.");
            // Reset hiển thị về trạng thái chờ
            document.getElementById('ai-result').innerText = "?";
        }
    }
};

// --- DOM EVENTS ---
document.getElementById('btn-p').onclick = () => window.addLetter('P');
document.getElementById('btn-b').onclick = () => window.addLetter('B');
document.getElementById('btn-t').onclick = () => window.addLetter('T');

document.getElementById('btn-reset').onclick = () => {
    if(confirm("Làm mới bảng sẽ xóa hết lịch sử cầu hiện tại?")) {
        chartData.letters = [];
        chartData.columnCounts.fill(0);
        aiStats = { correct: 0, total: 0 };
        currentAiPrediction = null;
        
        updateWinRateUI();
        document.getElementById('ai-result').innerText = '?';
        document.getElementById('ai-reason').innerText = "Sẵn sàng nhận dữ liệu...";
        document.getElementById('ai-result').style.fontSize = '60px';
        document.getElementById('ai-result').style.color = 'white';
        
        drawChart();
    }
};

// Resize listener
window.addEventListener('resize', () => {
    drawChart();
});
