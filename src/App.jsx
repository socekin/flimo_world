import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import StoryIntro from './pages/StoryIntro';
import StoryIntroDynamic from './pages/StoryIntroDynamic';
import Preview from './pages/Preview';
import Play from './pages/Play';
import CreateDemo from './pages/CreateDemo';
import GamePlay from './game/GamePlay';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/story" element={<StoryIntro />} />
        <Route path="/story/:id" element={<StoryIntroDynamic />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/play" element={<Play />} />
        <Route path="/create" element={<CreateDemo />} />
        <Route path="/game/:id" element={<GamePlay />} />
      </Routes>
    </Router>
  );
}

export default App;
