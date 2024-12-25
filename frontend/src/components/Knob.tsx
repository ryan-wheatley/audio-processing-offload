import React from 'react';
import { motion } from 'framer-motion';

interface FrequencyKnobProps {
  frequency: number;
}

const FrequencyKnob: React.FC<FrequencyKnobProps> = ({ frequency }) => {
  const logTransform = (freq: number) => {
    const minFreq = 20;
    const maxFreq = 20000;
    const minAngle = -140;
    const maxAngle = 140;

    // Normalize the frequency within the range
    const logFreq = Math.log(freq / minFreq) / Math.log(maxFreq / minFreq); // Logarithmic scale
    const angle = minAngle + logFreq * (maxAngle - minAngle); // Map to angle range
    return angle;
  };

  // Helper function to format the frequency
  const formatFrequency = (freq: number) => {
    return freq >= 1000 ? `${(freq / 1000).toFixed(1)} kHz` : `${freq} Hz`;
  };

  return (
    <div className={'flex items-center w-full flex-col gap-[8px]'}>
      Freq
      <motion.div
        className="w-[30px] flex justify-center rounded-full h-[30px] bg-neutral-600"
        style={{
          transformOrigin: 'center center',
        }}
        animate={{
          rotate: logTransform(frequency),
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        <div className={'w-[4px] h-[10px] bg-blue-400'} />
      </motion.div>
      <div>{formatFrequency(frequency)}</div>
    </div>
  );
};

export default FrequencyKnob;
