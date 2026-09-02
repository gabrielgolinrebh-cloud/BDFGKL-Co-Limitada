// App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CalculosPage } from './CalculosPage';
import { ImportarPage } from './ImportarPage';
import { ResultadoPage } from './ResultadoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CalculosPage />} />
        <Route path="/calculos" element={<CalculosPage />} />
        <Route path="/importar" element={<ImportarPage />} />
        <Route path="/resultado" element={<ResultadoPage />} />
      </Routes>
    </BrowserRouter>
  );
}