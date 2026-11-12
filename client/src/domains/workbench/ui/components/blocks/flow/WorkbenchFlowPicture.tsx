import type { CSSProperties } from 'react';

import centrifuge from '../../../../assets/flow-pictures/centrifuge.webp';
import computer from '../../../../assets/flow-pictures/computer.webp';
import cytometer from '../../../../assets/flow-pictures/cytometer.webp';
import dilute from '../../../../assets/flow-pictures/dilute.webp';
import filter from '../../../../assets/flow-pictures/filter.webp';
import fridge from '../../../../assets/flow-pictures/fridge.webp';
import harvest from '../../../../assets/flow-pictures/harvest.webp';
import hemocytometer from '../../../../assets/flow-pictures/hemocytometer.webp';
import iceBucket from '../../../../assets/flow-pictures/ice-bucket.webp';
import incubator from '../../../../assets/flow-pictures/incubator.webp';
import invert from '../../../../assets/flow-pictures/invert.webp';
import neutral from '../../../../assets/flow-pictures/neutral.webp';
import platePipette from '../../../../assets/flow-pictures/plate-pipette.webp';
import plateReader from '../../../../assets/flow-pictures/plate-reader.webp';
import resuspend from '../../../../assets/flow-pictures/resuspend.webp';
import stopwatch from '../../../../assets/flow-pictures/stopwatch.webp';
import transfer from '../../../../assets/flow-pictures/transfer.webp';
import tubePipette from '../../../../assets/flow-pictures/tube-pipette.webp';
import vortex from '../../../../assets/flow-pictures/vortex.webp';
import wash from '../../../../assets/flow-pictures/wash.webp';
import waterBath from '../../../../assets/flow-pictures/water-bath.webp';

import type { StepPicture } from '../../../../utils/flow/stepKinds';

const PICTURE_FILES: Readonly<Record<StepPicture, string>> = {
  tubePipette,
  platePipette,
  resuspend,
  vortex,
  invert,
  transfer,
  dilute,
  harvest,
  centrifuge,
  wash,
  filter,
  incubator,
  stopwatch,
  iceBucket,
  waterBath,
  hemocytometer,
  cytometer,
  plateReader,
  fridge,
  computer,
  neutral,
};

interface WorkbenchFlowPictureProps {
  picture: StepPicture;
  color: string;
}

function maskStyle(file: string, color: string): CSSProperties {
  const image = `url(${file})`;
  return {
    backgroundColor: color,
    maskImage: image,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskImage: image,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
  };
}

export function WorkbenchFlowPicture({ picture, color }: WorkbenchFlowPictureProps) {
  return (
    <span
      aria-hidden
      className="block h-[46px] w-[46px] flex-none"
      style={maskStyle(PICTURE_FILES[picture], color)}
    />
  );
}
