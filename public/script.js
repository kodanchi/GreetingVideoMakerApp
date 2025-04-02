let selectedGreeting = '';
let selectedVideoUrl = '';

// Handle greeting buttons
const greetingButtons = document.querySelectorAll('.greeting-btn');
greetingButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    greetingButtons.forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    selectedGreeting = btn.textContent;
    document.getElementById('customGreeting').value = '';
  });
});

// Handle custom greeting input
const customGreetingInput = document.getElementById('customGreeting');
customGreetingInput.addEventListener('input', (e) => {
  selectedGreeting = e.target.value;
  greetingButtons.forEach(b => b.classList.remove('btn-primary'));
});

// Handle video thumbnail selection
const thumbs = document.querySelectorAll('.video-thumb');
thumbs.forEach(img => {
  img.addEventListener('click', () => {
    thumbs.forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');
    selectedVideoUrl = img.getAttribute('data-src');
  });
});

async function generateVideo() {
  const greeter = document.getElementById('greeter').value.trim();
  const status = document.getElementById('status');
  const progress = document.getElementById('progressBar');
  const video = document.getElementById('outputVideo');
  const link = document.getElementById('downloadLink');
  const successMsg = document.getElementById('successMsg');

  if (!selectedGreeting || !selectedVideoUrl || !greeter) {
    alert("يرجى اختيار الفيديو، وكتابة التهنئة واسم المُرسل");
    return;
  }

  status.innerText = '⏳ جاري تجهيز الفيديو...';
  progress.style.display = 'block';
  progress.value = 0;
  video.style.display = 'none';
  link.style.display = 'none';
  successMsg.style.display = 'none';

  try {
    const res = await fetch("https://ffmpeg-render-backend.onrender.com/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl: location.origin + '/' + selectedVideoUrl,
        greeting: selectedGreeting,
        greeter
      })
    });

    const { jobId } = await res.json();
    if (!jobId) throw new Error("فشل في بدء إنشاء الفيديو");

    // Poll progress
    const interval = setInterval(async () => {
      const p = await fetch(`https://ffmpeg-render-backend.onrender.com/progress/${jobId}`);
      const result = await p.json();
      if (result.progress >= 1) {
        clearInterval(interval);
        progress.value = 100;
        status.innerText = '✅ تم تجهيز الفيديو، جاري التحميل...';

        const videoRes = await fetch(`https://ffmpeg-render-backend.onrender.com/output/${jobId}`);
        const blob = await videoRes.blob();
        const url = URL.createObjectURL(blob);
        video.src = url;
        video.style.display = 'block';
        link.href = url;
        link.download = 'greeting.mp4';
        link.style.display = 'inline-block';
        successMsg.style.display = 'block';
        progress.style.display = 'none';
        status.innerText = '✅ تم إنشاء الفيديو بنجاح';
      } else {
        progress.value = result.progress * 100;
      }
    }, 1000);
  } catch (err) {
    console.error(err);
    status.innerText = '❌ حدث خطأ أثناء المعالجة.';
    progress.style.display = 'none';
  }
}
