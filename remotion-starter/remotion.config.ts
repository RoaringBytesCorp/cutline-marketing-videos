// Remotion CLI config. It applies to `npx remotion studio|render|still` only.
// Output quality: H.264 High, CRF 16, yuv420p, BT.709, AAC audio (the h264 default). The scripts in scripts/ use the
// renderer API, which does not read this file, so they pass the same settings explicitly (ENCODE in
// scripts/_common.mjs). Keep the two in step; scripts/check-video.mjs checks the result of either.
import {Config} from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('png'); // lossless intermediate frames: no JPEG banding on soft gradients
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setAudioBitrate('320k');
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer('angle'); // GPU compositing on macOS (blur, 3D transforms)
Config.setDelayRenderTimeoutInMilliseconds(120000); // 4K frames and large images can take a while to decode
Config.setOverwriteOutput(true);
