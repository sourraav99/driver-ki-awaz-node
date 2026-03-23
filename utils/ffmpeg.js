const { exec } = require("child_process");
const fs = require("fs");

// const ffmpeg = "/home/jrdumdat/ffmpeg-7.0.2-amd64-static/ffmpeg";
const ffmpeg = "ffmpeg";

exports.convertToHLS = (inputVideo, outputFolder) => {

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const command = `
  ${ffmpeg} -i ${inputVideo} \
  -c:v libx264 \
  -c:a aac \
  -hls_time 4 \
  -hls_list_size 0 \
  -f hls ${outputFolder}/index.m3u8
  `;

  exec(command, (err) => {
    if (err) {
      console.log("FFmpeg error:", err);
    } else {
      console.log("HLS conversion complete");
    }
  });
};