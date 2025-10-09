// videoModal.js
document.addEventListener("DOMContentLoaded", () => {
    // === ① YouTube埋め込みURL → プレビュー画像を設定 ===
    // document.querySelectorAll(".reel").forEach((reel) => {
    //     const url = reel.dataset.video;
    //     const match = url.match(/embed\/([^?]+)/); // YouTube動画IDを抽出
    //     if (match) {
    //         const id = match[1];
    //         const preview = reel.querySelector(".preview");
    //         preview.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    //      }
    // });
    

    // 1️⃣ プレビューをクリック → モーダル表示
    document.querySelectorAll(".preview").forEach((img) => {
        img.addEventListener("click", () => {
        const modal = img.closest(".reel").querySelector(".modal");
        modal.classList.add("active");
        document.body.style.overflow = "hidden"; // 背景スクロール防止
        });
    });

    // 2️⃣ モーダル背景クリック → 閉じる
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("active");
            document.body.style.overflow = ""; // 背景スクロール解除
        }
        });
    });

    // 3️⃣ CREDITボタン → クレジット展開
    document.querySelectorAll(".credit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
        e.stopPropagation(); // 背景クリック扱いにならないように
        const modalContent = btn.closest(".modal-content");
        modalContent.classList.toggle("active");
        });
        
    });
});