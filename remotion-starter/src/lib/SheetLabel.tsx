// Tool composition: the label strip under each tile of scripts/contact-sheet.mjs (ffmpeg here has no drawtext).
// Registered in Root.tsx as "SheetLabel"; the script overrides its width to the thumbnail width.
import React from 'react';
import {AbsoluteFill} from 'remotion';

export const SheetLabel: React.FC<{text: string}> = ({text}) => (
  <AbsoluteFill
    style={{
      background: '#1f262c',
      justifyContent: 'center',
      paddingLeft: 12,
      fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      fontSize: 18,
      fontWeight: 600,
      color: '#fff',
      whiteSpace: 'pre',
    }}
  >
    {text}
  </AbsoluteFill>
);
