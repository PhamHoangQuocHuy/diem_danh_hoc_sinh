const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 640;
canvas.height = 480;
canvas.style.border = '2px solid #00FFFF';

let knownFaces = [];
let canScan = true;
let lastRecognizedId = null;

// Load thư viện face-api.js
const loadModels = async () => {
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        console.log('Đã tải xong tất cả models!');
    } catch (error) {
        console.error('Lỗi khi tải models:', error);
    }
};

//  Load dữ liệu khuôn mặt từ database
const loadDatabaseFaces = async () => {
    try {
        const lopHocId = document.querySelector('input[name="lop_hoc_id"]').value;
        const ngayDiemDanh = document.querySelector('input[name="ngay_diem_danh"]').value;

        const response = await fetch(`/thuc-hien-diem-danh/lay-du-lieu?lop_hoc_id=${lopHocId}&ngay_diem_danh=${ngayDiemDanh}`);
        const data = await response.json();

        knownFaces = [];

        for (const { hoc_sinh_id, ho_ten, duong_dan_anh } of data) {
            if (!Array.isArray(duong_dan_anh)) continue;

            // Load từng ảnh và tính descriptor
            for (const duongDan of duong_dan_anh) {
                const imageURL = `http://localhost:3001/${duongDan}`;
                const img = await faceapi.fetchImage(imageURL);
                const detections = await faceapi
                    .detectSingleFace(img)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detections) {
                    knownFaces.push({
                        id: hoc_sinh_id,
                        name: ho_ten,
                        descriptor: detections.descriptor
                    });
                } else {
                    console.warn(`Không phát hiện khuôn mặt trong ảnh: ${imageURL}`);
                }
            }
        }

        console.log(`Đã tải ${knownFaces.length} mẫu khuôn mặt từ DB`);
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu khuôn mặt:', error);
    }
};

// Bật camera
const startFaceRecognition = async () => {
    await loadModels();
    await loadDatabaseFaces();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" }
        });
        video.srcObject = stream;
        video.onplaying = () => {
            runFaceDetection();
        };
    } catch (error) {
        console.error('Không thể bật camera:', error);
    }
};


let warningShown = false;

//  Quét và nhận diện
const runFaceDetection = () => {
    setInterval(async () => {
        if (!canScan) return;

        const detections = await faceapi.detectAllFaces(video)
            .withFaceLandmarks()
            .withFaceDescriptors();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Nếu nhiều hơn 1 khuôn mặt
        if (detections.length > 1) {
            ctx.fillStyle = 'red';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Lỗi: Có nhiều hơn 1 khuôn mặt trong khung hình!', 10, 30);

            if (!warningShown) {
                alert(' Vui lòng chỉ để một người trong khung hình để điểm danh!');
                warningShown = true;
            }
            return;
        }

        // Nếu không phải nhiều khuôn mặt → reset cờ
        

        if (detections.length === 1) {
            warningShown = false;

            const detection = detections[0];
            const { bestMatch, accuracy } = findBestMatch(detection.descriptor);
            drawFaceBox(detection.detection.box, bestMatch, accuracy);

            if (bestMatch && bestMatch.id !== lastRecognizedId) {
                markAttendance(bestMatch);
                lastRecognizedId = bestMatch.id;
            }
        }

    }, 100);
};

//  Tìm khuôn mặt gần nhất và tính độ chính xác
const findBestMatch = (descriptor) => {
    let bestMatch = null;
    let bestDistance = 0.4; // Ngưỡng càng nhỏ càng chính xác
    let accuracy = 0;

    knownFaces.forEach(face => {
        const distance = faceapi.euclideanDistance(descriptor, face.descriptor);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = face;
            accuracy = (1 - bestDistance) * 100; //  Công thức tính độ chính xác
        }
    });

    return { bestMatch, accuracy };
};

//  Hiển thị tên học sinh và độ chính xác trên canvas
const drawFaceBox = (box, bestMatch, accuracy) => {
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.width, box.height, 10);
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = 'black';
    ctx.fillRect(box.x, box.y - 30, 220, 25);
    // Hiển thị tên học sinh
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(bestMatch ? bestMatch.name : 'Không xác định', box.x + 10, box.y - 10);

    //  Hiển thị độ chính xác (%)
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Độ chính xác: ${accuracy.toFixed(2)}%`, box.x, box.y + box.height + 20);
};

//  Ghi nhận điểm danh & tiếp tục quét ngay sau khi nhấn OK
const markAttendance = async (student) => {
    //console.log('Điểm danh:', student.name);

    // Chụp ảnh từ video
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = video.videoWidth;
    snapshotCanvas.height = video.videoHeight;
    const snapshotCtx = snapshotCanvas.getContext('2d');
    snapshotCtx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    const base64Image = snapshotCanvas.toDataURL('image/jpeg');

    const activeTab = new URLSearchParams(window.location.search).get('tab') || 'morning';
    await fetch(`/thuc-hien-diem-danh/ghi-nhan-diem-danh?tab=${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            hoc_sinh_id: student.id,
            anh_ghi_nhan: base64Image,
            lop_hoc_id: document.querySelector('input[name="lop_hoc_id"]').value,
            ngay_diem_danh: document.querySelector('input[name="ngay_diem_danh"]').value,
        })
    });
    //console.log('Gửi điểm danh:', student.id, base64Image.slice(0, 50));
    //  PAUSE VIDEO sau khi điểm danh
    video.pause();
    canScan = false;
    alert(`Đã điểm danh thành công: ${student.name}\nNhấn OK để tiếp tục quét`);

    //  Reset trạng thái & tạo độ trễ trước khi quét lại
    setTimeout(() => {
        lastRecognizedId = null; //  Đảm bảo hệ thống nhận diện lại từ đầu
        canScan = true; //  Bật lại chế độ quét
        video.play(); //  Tiếp tục video sau khi delay
        console.log('Đã bật lại chế độ quét sau khi nhấn OK');
    }, 2000);
};

//startFaceRecognition();