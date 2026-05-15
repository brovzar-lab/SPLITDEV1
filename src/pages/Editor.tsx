import { useParams } from 'react-router-dom';
import { RD } from '../tokens';

export default function Editor() {
  const { id } = useParams();
  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: RD.display, fontStyle: 'italic', color: RD.inkFade, fontSize: 18,
      background: RD.paper,
    }}>
      Editor placeholder — screenplay {id} (wired in next task)
    </div>
  );
}
