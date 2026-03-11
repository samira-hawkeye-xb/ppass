/**
 * ppass Design System
 * 设计系统统一管理
 */

const ppassDesignSystem = {
  // ===== Colors =====
  colors: {
    // Primary - 主色调 (蓝色)
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',  // 主色
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    // Accent - 强调色 (蓝紫渐变)
    accent: {
      blue: '#5E9EFF',
      purple: '#A855F7',
      gradient: 'linear-gradient(135deg, #5E9EFF, #A855F7)',
    },
    // Neutral - 中性色
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    // Semantic - 语义色
    success: '#30D158',
    warning: '#FFD60A',
    danger: '#FF453A',
    info: '#5E9EFF',
  },

  // ===== Typography =====
  typography: {
    fontFamily: {
      sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif",
      mono: "'SF Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: 11,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // ===== Spacing =====
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },

  // ===== Border Radius =====
  radii: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  // ===== Shadows =====
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)',
  },

  // ===== Transitions =====
  transitions: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // ===== Z-Index =====
  zIndex: {
    dropdown: 100,
    sticky: 200,
    modal: 300,
    tooltip: 400,
  },
};

/**
 * 组件清单
 */
const ppassComponents = {
  // ===== Atoms 原子组件 =====
  Button: {
    variants: ['primary', 'secondary', 'ghost', 'danger'],
    sizes: ['sm', 'md', 'lg'],
  },
  Input: {
    states: ['default', 'focus', 'error', 'disabled'],
  },
  Badge: {
    variants: ['success', 'warning', 'danger', 'info'],
  },
  Icon: {},

  // ===== Molecules 分子组件 =====
  Card: {},
  FileItem: {},
  DeviceItem: {},

  // ===== Organisms 有机组件 =====
  Header: {},
  Sidebar: {},
  FileGrid: {},
  DeviceList: {},
  ConnectionPanel: {},
  QRCode: {},
};

/**
 * 测试用例清单
 */
const ppassTestCases = {
  // ===== 功能测试 =====
  功能: {
    '1.1': '存储端：选择模式后显示设备ID',
    '1.2': '存储端：生成二维码',
    '1.3': '存储端：选择文件夹后显示文件夹名称',
    '1.4': '存储端：显示已连接设备列表',
    '1.5': '访问端：输入设备ID后能发起连接',
    '1.6': '访问端：连接成功后显示文件列表',
    '1.7': '访问端：刷新按钮能更新文件列表',
    '1.8': '两端连接后，一端操作另一端能收到通知',
  },
  // ===== UI测试 =====
  UI: {
    '2.1': '页面加载无白屏/闪烁',
    '2.2': '深色主题正确显示',
    '2.3': '响应式布局（移动端适配）',
    '2.4': '状态指示器正确显示',
    '2.5': '二维码清晰可扫描',
  },
  // ===== 边界测试 =====
  边界: {
    '3.1': '选择空文件夹时的显示',
    '3.2': '连接失败时的错误提示',
    '3.3': '网络断开时的状态显示',
    '3.4': '设备ID复制功能正常',
  },
};

// 导出供主程序使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ppassDesignSystem, ppassComponents, ppassTestCases };
}
