interface WorkbenchPlatePlaceChipProps {
  label: string;
  onShow: () => void;
}

export function WorkbenchPlatePlaceChip({ label, onShow }: WorkbenchPlatePlaceChipProps) {
  return (
    <button
      type="button"
      className="flex-none border border-primary/35 px-1.5 text-caption text-primary transition-colors hover:border-primary/70 hover:bg-primary/10"
      onClick={onShow}
    >
      {label}
    </button>
  );
}
