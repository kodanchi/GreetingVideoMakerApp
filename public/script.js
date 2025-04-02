const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
  log: true,
  corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.1/dist/ffmpeg-core.js',
  wasmOptions: {
    env: {
      FF_USE_PTHREADS: false
    }
  }
});

let selectedVideo = null;
let selectedGreeting = '';

// Thumbnail video selection
const thumbs = document.querySelectorAll('.video-thumb');
thumbs.forEach(img => {
  img.addEventListener('click', () => {
    thumbs.forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');
    selectedVideo = img.getAttribute('data-src');
  });
});

// Greeting button selection
const greetingButtons = document.querySelectorAll('.greeting-btn');
greetingButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    greetingButtons.forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    selectedGreeting = btn.textContent;
  });
});

async function generateVideo() {
  const customGreeting = document.getElementById('customGreeting').value.trim();
  const greeterName = document.getElementById('greeterName').value.trim();
  const greetingText = customGreeting || selectedGreeting;

  if (!selectedVideo || !greetingText || !greeterName) {
    alert('يرجى اختيار الفيديو وكتابة التهنئة واسم المُرسل');
    return;
  }

  const status = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const video = document.getElementById('outputVideo');
  const downloadBtn = document.getElementById('downloadBtn');
  const successMsg = document.getElementById('successMsg');

  status.innerText = 'جاري تجهيز الفيديو...';
  progressBar.style.display = 'block';
  progressBar.value = 0;
  video.style.display = 'none';
  downloadBtn.style.display = 'none';
  successMsg.style.display = 'none';

  if (!ffmpeg.isLoaded()) await ffmpeg.load();
  ffmpeg.setProgress(({ ratio }) => {
    progressBar.value = Math.round(ratio * 100);
  });

  // Load files into FS
  const response = await fetch(selectedVideo);
  const videoData = await response.arrayBuffer();
  ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoData));

  const fontBlob = await fetch('font/HONORSansArabicUI-B.ttf').then(r => r.arrayBuffer());
  ffmpeg.FS('writeFile', 'font.ttf', new Uint8Array(fontBlob));
  const logoBlob = await fetch('logo/logoSky.png').then(r => r.arrayBuffer());
  ffmpeg.FS('writeFile', 'logo.png', new Uint8Array(logoBlob));

  const filter = `
    [1:v]scale=300:-1[logo];
    [0:v][logo]overlay='if(lt(t,1), W, max(W-w-60, W-(t-1)*400))':H-h-60:enable='gte(t,0)'[base];
    [base]drawtext=fontfile=font.ttf:text='${greeterName}':x=90:y=h-180:fontsize=36:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2:alpha='if(lt(t,1),0,if(lt(t,2),(t-1)/1,1))'[withName];
    [withName]drawtext=fontfile=font.ttf:text='${greetingText}':x=(w-tw)/2:y=(h-th)/2:fontsize=72:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3:alpha='if(lt(t,1), 0, if(lt(t,3), (t-1)/2, 1))'
  `.replace(/\n/g, '').trim();

  await ffmpeg.run(
    '-i', 'input.mp4',
    '-i', 'logo.png',
    '-filter_complex', filter,
    '-codec:a', 'copy',
    'output.mp4'
  );

  const data = ffmpeg.FS('readFile', 'output.mp4');
  const videoURL = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

  video.src = videoURL;
  video.style.display = 'block';
  downloadBtn.href = videoURL;
  downloadBtn.style.display = 'inline-block';
  successMsg.style.display = 'block';
  progressBar.style.display = 'none';
  status.innerText = 'تم الانتهاء';

  if (typeof updateWhatsAppLink === 'function') {
    updateWhatsAppLink(videoURL);
  }
}