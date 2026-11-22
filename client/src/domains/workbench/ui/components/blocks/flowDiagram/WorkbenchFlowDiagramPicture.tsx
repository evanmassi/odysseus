import type { CSSProperties } from 'react';

import centrifuge from '../../../../assets/flow-diagram-pictures/centrifuge.webp';
import computer from '../../../../assets/flow-diagram-pictures/computer.webp';
import cytometer from '../../../../assets/flow-diagram-pictures/cytometer.webp';
import dilute from '../../../../assets/flow-diagram-pictures/dilute.webp';
import filter from '../../../../assets/flow-diagram-pictures/filter.webp';
import fridge from '../../../../assets/flow-diagram-pictures/fridge.webp';
import harvest from '../../../../assets/flow-diagram-pictures/harvest.webp';
import hemocytometer from '../../../../assets/flow-diagram-pictures/hemocytometer.webp';
import iceBucket from '../../../../assets/flow-diagram-pictures/ice-bucket.webp';
import incubator from '../../../../assets/flow-diagram-pictures/incubator.webp';
import invert from '../../../../assets/flow-diagram-pictures/invert.webp';
import neutral from '../../../../assets/flow-diagram-pictures/neutral.webp';
import platePipette from '../../../../assets/flow-diagram-pictures/plate-pipette.webp';
import plateReader from '../../../../assets/flow-diagram-pictures/plate-reader.webp';
import resuspend from '../../../../assets/flow-diagram-pictures/resuspend.webp';
import stopwatch from '../../../../assets/flow-diagram-pictures/stopwatch.webp';
import transfer from '../../../../assets/flow-diagram-pictures/transfer.webp';
import tubePipette from '../../../../assets/flow-diagram-pictures/tube-pipette.webp';
import vortex from '../../../../assets/flow-diagram-pictures/vortex.webp';
import wash from '../../../../assets/flow-diagram-pictures/wash.webp';
import waterBath from '../../../../assets/flow-diagram-pictures/water-bath.webp';

import type { StepPicture } from '../../../../utils/flowDiagram/stepKinds';

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

interface WorkbenchFlowDiagramPictureProps {
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

export function WorkbenchFlowDiagramPicture({ picture, color }: WorkbenchFlowDiagramPictureProps) {
  return (
    <span
      aria-hidden
      className="block h-[46px] w-[46px] flex-none"
      style={maskStyle(PICTURE_FILES[picture], color)}
    />
  );
}
