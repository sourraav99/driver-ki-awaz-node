const { exec } = require("child_process");
const fs = require("fs");

const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;

exports.convertToHLS = (inputVideo, outputFolder, callback) => {

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const command = `"${ffmpeg}" -i "${inputVideo}" -c:v libx264 -c:a aac -hls_time 4 -hls_list_size 0 -f hls "${outputFolder}/index.m3u8"`;

  console.log("Running:", command); // debug

  exec(command, (err) => {
    if (err) {
      console.error("FFmpeg error:", err);
      if (callback) callback(err);
    } else {
      console.log("HLS conversion complete");
      if (callback) callback(null);
    }
  });
};