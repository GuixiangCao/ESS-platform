import Sidebar from './Sidebar';

export default function SidebarLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="content-with-sidebar" style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
