import { createRouter, createWebHashHistory } from 'vue-router'
import { checkLoginStatus, getUserInfo } from '@/stores/user.js'
// 直接导入组件，不使用懒加载
import Login from '@/views/Login.vue'
import Home from '@/views/Home.vue'
import Members from '@/views/Members.vue'
import RechargeRecords from '@/views/RechargeRecords.vue'
import ConsumeRecords from '@/views/ConsumeRecords.vue'
import Settings from '@/views/Settings.vue'
import Employees from '@/views/Employees.vue'
import TableManagement from '@/views/TableManagement.vue'
import TableReservations from '@/views/TableReservations.vue'
import TableSetup from '@/views/TableSetup.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/members',
    name: 'Members',
    component: Members,
    meta: { requiresAuth: true }
  },
  {
    path: '/recharge-records',
    name: 'RechargeRecords',
    component: RechargeRecords,
    meta: { requiresAuth: true }
  },
  {
    path: '/consume-records',
    name: 'ConsumeRecords',
    component: ConsumeRecords,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/employees',
    name: 'Employees',
    component: Employees,
    meta: { requiresAuth: true }
  },
  {
    path: '/tables',
    name: 'TableManagement',
    component: TableManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/table-reservations',
    name: 'TableReservations',
    component: TableReservations,
    meta: { requiresAuth: true }
  },
  {
    path: '/table-setup',
    name: 'TableSetup',
    component: TableSetup,
    meta: { requiresAuth: true }
  },
  // 临时添加重定向路由，确保员工管理页面可以访问
  {
    path: '/employees-test',
    redirect: '/employees'
  },
  // 404页面重定向到登录页
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 导航守卫，控制访问权限
router.beforeEach((to, from, next) => {
  console.log(`导航到: ${to.path}, 从: ${from.path}`);
  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    console.log(`尝试访问受保护页面: ${to.path}`);
    // 检查登录状态
    if (checkLoginStatus()) {
      console.log('已登录，允许访问');
      // 暂时屏蔽管理员权限检查，允许所有登录用户访问员工管理页面
      next()
    } else {
      // 未登录或登录已过期则跳转到登录页
      console.log('未登录或登录已过期，跳转到登录页');
      next('/login')
    }
  } else {
    // 不需要登录的页面直接访问
    console.log('不需要登录的页面，直接访问');
    next()
  }
})

export default router