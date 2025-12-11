// File: user-core.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Xử lý Đăng xuất
const btnLogout = document.getElementById('btn-logout');
if(btnLogout) btnLogout.onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. Hiển thị thông tin cơ bản (Có check null để tránh lỗi màn hình trắng)
        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = user.email;

        // 2. Lắng nghe số dư Token theo thời gian thực
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const tokenEl = document.getElementById('user-tokens');
                if (tokenEl) tokenEl.textContent = docSnap.data().tokens || 0;
            }
        });

        // 3. Lấy lịch sử giao dịch (Lấy 20 dòng mới nhất)
        const listContainer = document.getElementById('history-list');
        const loadingMsg = document.getElementById('loading-msg');
        
        try {
            const q = query(collection(db, "users", user.uid, "history"), orderBy("createdAt", "desc"), limit(20));
            const querySnapshot = await getDocs(q);
            
            if (listContainer) listContainer.innerHTML = '';
            if (loadingMsg) loadingMsg.style.display = 'none';

            if (querySnapshot.empty && listContainer) {
                listContainer.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center">Chưa có giao dịch nào.</td></tr>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString('vi-VN') : '...';
                
                // Tô màu: Dương là màu xanh, Âm là màu đỏ
                const isPositive = data.tokens > 0;
                const tokenColor = isPositive ? 'text-green-400' : 'text-red-400';
                const sign = isPositive ? '+' : '';

                if (listContainer) {
                    listContainer.innerHTML += `
                        <tr class="hover:bg-white/5 transition">
                            <td class="px-6 py-4 font-medium text-white">${data.packageName || 'Game Play'}</td>
                            <td class="px-6 py-4 ${tokenColor} font-bold">${sign}${data.tokens}</td>
                            <td class="px-6 py-4">${date}</td>
                            <td class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">${data.status || 'Done'}</td>
                        </tr>`;
                }
            });
        } catch (error) {
            console.error("Lỗi tải lịch sử:", error);
            if (loadingMsg) loadingMsg.textContent = "Lỗi tải dữ liệu.";
        }

    } else {
        // Chưa đăng nhập thì đá về trang chủ
        window.location.href = 'index.html';
    }
});