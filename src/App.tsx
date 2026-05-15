import { Routes, Route, Navigate } from 'react-router-dom';
import Library from './pages/Library';
import Editor from './pages/Editor';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/screenplays/:id" element={<Editor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
