import { Outlet } from 'react-router-dom';

export default function RootLayout() {
  return (
    <>
      {/* O Outlet renderiza a rota filha atual */}
      <Outlet />
    </>
  );
}