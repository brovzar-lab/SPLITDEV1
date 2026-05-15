import { useState } from 'react';
import { RD } from '../tokens';

interface Props {
  direction: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
}

export function Divider({ direction, onResize }: Props) {
  const [dragging, setDragging] = useState(false);
  const isVert = direction === 'vertical';

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
    const startPos = isVert ? e.clientX : e.clientY;
    const move = (e2: MouseEvent) =>
      onResize((isVert ? e2.clientX : e2.clientY) - startPos);
    const up = () => {
      setDragging(false);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.body.style.cursor = isVert ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: isVert ? 6 : '100%',
        height: isVert ? '100%' : 6,
        cursor: isVert ? 'col-resize' : 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        background: dragging ? RD.copperSoft : RD.lineDeep + '30',
        borderLeft:   isVert ? `1px solid ${RD.line}` : 'none',
        borderRight:  isVert ? `1px solid ${RD.line}` : 'none',
        borderTop:    !isVert ? `1px solid ${RD.line}` : 'none',
        borderBottom: !isVert ? `1px solid ${RD.line}` : 'none',
      }}
    >
      <div
        style={{
          width: isVert ? 2 : 20,
          height: isVert ? 20 : 2,
          borderRadius: 1,
          background: dragging ? RD.copper : RD.lineDeep,
        }}
      />
    </div>
  );
}
