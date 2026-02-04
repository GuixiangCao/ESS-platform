import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Building2, Package, Users, LayoutDashboard, Menu, X, DollarSign } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 自动展开包含当前活动页面的一级菜单
  useEffect(() => {
    const activeParent = menuItems.find(item =>
      item.submenu && item.submenu.some(sub => location.pathname === sub.path)
    );
    if (activeParent && expandedMenu !== activeParent.id) {
      setExpandedMenu(activeParent.id);
    }
  }, [location.pathname]);

  const menuItems = [
    {
      id: 'dashboard',
      label: '看板',
      icon: <LayoutDashboard size={18} />,
      path: '/'
    },
    {
      id: 'reseller-manage',
      label: '经销商管',
      icon: <Building2 size={18} />,
      submenu: [
        { id: 'resellers', label: '经销商管理', path: '/resellers' },
        { id: 'devices', label: '设备管理', path: '/devices' },
        { id: 'staff', label: '运维人员管理', path: '/staff' }
      ]
    },
    {
      id: 'revenue-manage',
      label: '收益管理',
      icon: <DollarSign size={18} />,
      submenu: [
        { id: 'station-list', label: '电站列表', path: '/revenue/stations' },
        { id: 'station-analysis', label: '电站分析', path: '/revenue/station-analysis' },
        { id: 'revenue-view', label: '收益查看本地化', path: '/revenue/view' }
      ]
    }
  ];

  const handleMenuClick = (item) => {
    if (item.submenu) {
      setExpandedMenu(expandedMenu === item.id ? null : item.id);
    } else {
      navigate(item.path);
      // 移动端自动关闭侧边栏
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    }
  };

  const handleSubMenuClick = (path) => {
    navigate(path);
    // 保持一级菜单展开状态，不再关闭
    // 移动端自动关闭侧边栏
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const isMenuActive = (item) => {
    if (item.submenu) {
      return item.submenu.some(sub => location.pathname === sub.path);
    }
    return location.pathname === item.path;
  };

  const isSubMenuActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* 移动端菜单切换按钮 */}
      <button 
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? '关闭侧边栏' : '打开侧边栏'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* 侧边栏背景遮罩（移动端） */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      {/* 侧边栏 */}
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>导航菜单</h2>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <div key={item.id}>
              <button
                className={`nav-item ${isMenuActive(item) ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.submenu && (
                  <ChevronDown 
                    size={16} 
                    className={`submenu-arrow ${expandedMenu === item.id ? 'expanded' : ''}`}
                  />
                )}
              </button>

              {/* 子菜单 */}
              {item.submenu && expandedMenu === item.id && (
                <div className="submenu">
                  {item.submenu.map(subItem => (
                    <button
                      key={subItem.id}
                      className={`submenu-item ${isSubMenuActive(subItem.path) ? 'active' : ''}`}
                      onClick={() => handleSubMenuClick(subItem.path)}
                    >
                      <span className="submenu-dot" />
                      <span>{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
