<template>
  <div class="table-management-container">
    <!-- 顶部筛选区 -->
    <div class="filter-section">
      <div class="filter-group">
        <label>状态筛选：</label>
        <select v-model="statusFilter" @change="handleFilterChange">
          <option value="">全部</option>
          <option value="idle">空闲</option>
          <option value="using">使用中</option>
          <option value="reserved">已预订</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>桌号搜索：</label>
        <input 
          type="text" 
          v-model="tableNoSearch" 
          placeholder="输入桌号关键词" 
          @input="handleFilterChange"
        />
      </div>
      
      <div class="filter-group">
        <label>营业日期：</label>
        <input type="date" v-model="businessDate" @change="handleFilterChange" />
      </div>
    </div>

    <!-- 中间可视化区 -->
    <div class="visualization-section">
      <div class="table-layout">
        <!-- 收银台 -->
        <div class="cashier-desk" :style="cashierStyle">
            <div class="cashier-label">收银台</div>
          </div>
          
          <!-- 球桌 -->
          <div 
            v-for="table in filteredTables" 
            :key="table.table_id"
            :class="['table-item', `table-${table.status}`, { 'table-selected': selectedTableId === table.table_id, 'paused': table.status === 'using' && pausedTables.has(table.table_id) }]"
            :style="getTableStyle(table)"
            @click="selectTable(table)"
            @mouseenter="hoveredTableId = table.table_id"
            @mouseleave="hoveredTableId = null"
          >
            <div class="table-number">{{ table.table_no }}</div>
            <div v-if="hoveredTableId === table.table_id" class="table-info">
              <div v-if="table.status === 'idle'">点击开台</div>
              <div v-else-if="table.status === 'using'">
                <div>使用人: {{ table.usage_info?.member_name }}</div>
                <div>开始时间: {{ formatTime(table.usage_info?.start_time) }}</div>
              </div>
              <div v-else-if="table.status === 'reserved'">
                <div>联系人: {{ table.reservation_info?.contact_name }}</div>
                <div>预订时段: {{ formatTimeRange(table.reservation_info) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- 球台详情弹窗 -->
    <el-dialog
      v-model="tableDetailDialogVisible"
      :title="currentDialogTitle"
      width="600px"
      :before-close="closeTableDetail"
    >
      <!-- 弹窗内容 -->
      <div v-if="selectedTable" class="table-dialog-content">
        <!-- 使用中状态 -->
        <template v-if="selectedTable.status === 'using'">
          <div class="detail-item">
            <div class="detail-header">
              <h4>{{ selectedTable.table_no }} 桌台使用详情</h4>
              <span class="status" :class="getStatusClass(selectedTable)">{{ getStatusText(selectedTable.status) }}</span>
            </div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">会员ID:</span>
                <span class="detail-value">{{ safeGet(() => selectedTable.usage_info.member_id) || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">会员姓名:</span>
                <span class="detail-value">{{ safeGet(() => selectedTable.usage_info.member_name) || '散客' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">开始时间:</span>
                <span class="detail-value">{{ formatTime(safeGet(() => selectedTable.usage_info.start_time)) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">使用时长:</span>
                <span class="detail-value">{{ calculateDisplayDuration() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">当前费用:</span>
                <span class="detail-value">{{ calculateDisplayFee() }}</span>
              </div>
              <div v-if="pausedTables.has(selectedTable.table_id)" class="detail-row">
                <span class="detail-label">状态:</span>
                <span class="detail-value status-paused">已暂停计费</span>
              </div>
              <div v-if="safeGet(() => selectedTable.usage_info.notes)" class="detail-row">
                <span class="detail-label">备注:</span>
                <span class="detail-value">{{ selectedTable.usage_info.notes }}</span>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 已预订状态 -->
        <template v-else-if="selectedTable.status === 'reserved'">
          <div class="detail-item">
            <h4>{{ selectedTable.table_no }} 桌台预订详情</h4>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">联系人:</span>
                <span class="detail-value">{{ safeGet(() => selectedTable.reservation_info.contact_name) || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">联系电话:</span>
                <span class="detail-value">{{ safeGet(() => selectedTable.reservation_info.contact_phone) || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">预订时段:</span>
                <span class="detail-value">{{ formatTimeRange(safeGet(() => selectedTable.reservation_info)) }}</span>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 空闲状态 -->
        <template v-else>
          <div class="detail-item">
            <h4>{{ selectedTable.table_no }} 桌台信息</h4>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">状态:</span>
                <span class="detail-value">{{ getStatusText(selectedTable.status) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">类型:</span>
                <span class="detail-value">{{ selectedTable.table_type || '标准球台' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">位置:</span>
                <span class="detail-value">{{ selectedTable.location || '主区域' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">价格:</span>
                <span class="detail-value">¥{{ selectedTable.price_per_hour }}/小时</span>
              </div>
            </div>
          </div>
        </template>
      </div>
      
      <!-- 无选择状态 -->
      <div v-else class="no-selection">
        <p>请点击球台查看详情</p>
      </div>
      
      <!-- 弹窗底部按钮 -->
      <template #footer>
        <div class="detail-actions">
          <!-- 使用中状态按钮 -->
          <template v-if="selectedTable && selectedTable.status === 'using'">
            <el-button 
              type="primary" 
              size="small" 
              @click="handlePauseBilling"
              :disabled="pausedTables.has(selectedTable.table_id)"
            >
              暂停计费
            </el-button>
            <el-button 
              type="success" 
              size="small" 
              @click="handleContinueBilling"
              :disabled="!pausedTables.has(selectedTable.table_id)"
            >
              继续计费
            </el-button>
            <el-button type="info" size="small" @click="handleExtendTime">续时</el-button>
            <el-button type="warning" size="small" @click="handleTransferTable">转台</el-button>
            <el-button type="danger" size="small" @click="handleCloseTable">结账</el-button>
          </template>
          
          <!-- 其他状态按钮 -->
          <template v-else-if="selectedTable">
            <el-button 
              type="primary" 
              size="small" 
              @click="handleOpenTable"
              :disabled="selectedTable.status !== 'idle'"
            >
              开台
            </el-button>
            <el-button 
              type="info" 
              size="small" 
              @click="handleReservation"
              :disabled="selectedTable.status !== 'idle'"
            >
              预订
            </el-button>
          </template>
          
          <el-button size="small" @click="closeTableDetail">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 开台弹窗 -->
    <el-dialog
      v-model="openTableDialogVisible"
      title="开台"
      width="500px"
      @close="resetOpenTableForm"
    >
      <el-form :model="openTableForm" label-width="100px">
        <el-form-item label="桌号">
          <el-input v-model="openTableForm.table_no" disabled />
        </el-form-item>
        <el-form-item label="操作员">
          <el-input v-model="openTableForm.operator" :value="currentUser" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input type="textarea" v-model="openTableForm.notes" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="openTableDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmOpenTable">确认开台</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 结台弹窗 -->
    <el-dialog
      v-model="closeTableDialogVisible"
      title="结账"
      width="500px"
    >
      <el-form :model="closeTableForm" label-width="100px">
        <el-form-item label="桌号">
          <el-input v-model="closeTableForm.table_no" disabled />
        </el-form-item>
        <el-form-item label="客户类型" required>
          <el-radio-group v-model="closeTableForm.customer_type">
            <el-radio :label="'scattered'" @click="switchToScatteredCustomer">散客</el-radio>
            <el-radio :label="'member'">会员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="会员姓名/手机号" v-if="closeTableForm.customer_type === 'member'" required>
          <el-input 
            v-model="closeTableForm.member_name" 
            placeholder="输入会员姓名或手机号"
            @input="searchCloseTableMembers"
          />
          <div v-if="closeTableMemberSearchResults.length > 0" class="search-results">
            <div 
              v-for="member in closeTableMemberSearchResults" 
              :key="member.member_id"
              class="search-result-item"
              @click="selectCloseTableMember(member)"
            >
              {{ member.name }} ({{ member.phone }}) - 余额: {{ member.balance }}
            </div>
          </div>
        </el-form-item>
        <el-form-item label="会员ID" v-if="closeTableForm.member_id">
          <el-input v-model="closeTableForm.member_id" disabled />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-input v-model="closeTableForm.start_time" disabled />
        </el-form-item>
        <el-form-item label="使用时长(分钟)">
          <el-input v-model.number="closeTableForm.billing_minutes" @input="updateCloseTableFee" />
        </el-form-item>
        <el-form-item label="总费用">
          <el-input :value="'¥' + closeTableForm.total_amount + ' 元'" disabled />
        </el-form-item>
        <el-form-item label="支付方式" required>
          <el-radio-group v-model="closeTableForm.payment_method">
            <el-radio :label="'member_card'" v-if="closeTableForm.customer_type === 'member'">会员卡</el-radio>
            <el-radio :label="'cash'">现金</el-radio>
            <el-radio :label="'wechat'">微信</el-radio>
            <el-radio :label="'alipay'">支付宝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="操作员">
          <el-input v-model="closeTableForm.operator" :value="currentUser" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeTableDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCloseTable">确认结账</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 转台弹窗 -->
    <el-dialog
      v-model="transferTableDialogVisible"
      title="转台"
      width="500px"
    >
      <el-form :model="transferTableForm" label-width="100px">
        <el-form-item label="原桌号">
          <el-input v-model="transferTableForm.source_table_no" disabled />
        </el-form-item>
        <el-form-item label="目标桌号" required>
          <el-select v-model="transferTableForm.target_table_id" placeholder="请选择目标球桌">
            <el-option
              v-for="table in availableTables"
              :key="table.table_id"
              :label="table.table_no"
              :value="table.table_id"
            >
              {{ table.table_no }} ({{ table.price_per_hour }}元/小时)
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="操作员">
          <el-input v-model="transferTableForm.operator" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="transferTableDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmTransferTable">确认转台</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 预订弹窗 -->
    <el-dialog
      v-model="reservationDialogVisible"
      title="预订"
      width="500px"
    >
      <el-form :model="reservationForm" label-width="100px">
        <el-form-item label="桌号">
          <el-input v-model="reservationForm.table_no" disabled />
        </el-form-item>
        <el-form-item label="联系人" required>
          <el-input v-model="reservationForm.contact_name" />
        </el-form-item>
        <el-form-item label="联系电话" required>
          <el-input v-model="reservationForm.contact_phone" />
        </el-form-item>
        <el-form-item label="开始时间" required>
          <el-date-picker 
            v-model="reservationForm.start_time" 
            type="datetime" 
            placeholder="选择开始时间" 
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" required>
          <el-date-picker 
            v-model="reservationForm.end_time" 
            type="datetime" 
            placeholder="选择结束时间" 
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="操作员">
          <el-input v-model="reservationForm.operator" :value="currentUser" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input type="textarea" v-model="reservationForm.notes" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reservationDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmReservation">确认预订</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, reactive, nextTick } from 'vue';
import { getTableStatus, openTable, closeTable, createReservation, configAPI, testApiConnection, memberAPI, transferTable } from '@/services/api';
import { getUserInfo } from '@/stores/user';
import { ElMessage } from 'element-plus';
import { checkEnvironment, memberIPC } from '@/services/ipc-api';

// 智能API选择器
const useAPI = () => {
  const env = checkEnvironment();
  return {
    memberAPI: env.isElectron && env.hasElectronAPI ? memberIPC : memberAPI
  };
};
const api = useAPI().memberAPI;

export default {
  name: 'TableManagement',
  setup() {
    // 状态管理
    const tables = ref([]);
    const statusFilter = ref('');
    const tableNoSearch = ref('');
    const businessDate = ref(new Date().toISOString().split('T')[0]);
    const selectedTableId = ref(null);
    const hoveredTableId = ref(null);
    const currentUser = ref(getUserInfo()?.name || '管理员');
    const memberSearchResults = ref([]);
    const closeTableMemberSearchResults = ref([]);
    const pausedTables = ref(new Set()); // 用于记录暂停计费的桌台
    
    // 选中的球桌
    const selectedTable = ref(null);
    
    // 收银台位置
    const cashierPosition = reactive({ x: 50, y: 50 });
    const cashierStyle = computed(() => ({
      position: 'absolute',
      left: `${cashierPosition.x}px`,
      top: `${cashierPosition.y}px`,
      width: '120px',
      height: '80px'
    }));
    
    // 弹窗状态
    const openTableDialogVisible = ref(false);
    const closeTableDialogVisible = ref(false);
    const reservationDialogVisible = ref(false);
    const tableDetailDialogVisible = ref(false);
    
    // 表单数据
    const openTableForm = ref({
      table_id: '',
      table_no: '',
      operator: currentUser.value,
      notes: ''
    });
    
    const closeTableForm = ref({
      usage_id: '',
      table_no: '',
      member_name: '',
      start_time: '',
      billing_minutes: 60,
      duration_minutes: 60, // 添加duration_minutes属性的初始化
      total_amount: 0,
      payment_method: 'cash',
      operator: currentUser.value
    });

    // 转台表单数据
    const transferTableForm = ref({
      usage_id: '',
      source_table_id: '',
      source_table_no: '',
      target_table_id: '',
      operator: currentUser.value
    });

    // 转台弹窗可见性
    const transferTableDialogVisible = ref(false);

    // 可用球桌列表
    const availableTables = ref([]);
    
    const reservationForm = ref({
      table_id: '',
      table_no: '',
      contact_name: '',
      contact_phone: '',
      start_time: '',
      end_time: '',
      operator: currentUser.value,
      notes: ''
    });
    
    // 筛选后的球桌
    const filteredTables = computed(() => {
      return tables.value.filter(table => {
        const statusMatch = !statusFilter.value || table.status === statusFilter.value;
        const noMatch = !tableNoSearch.value || table.table_no.includes(tableNoSearch.value);
        return statusMatch && noMatch;
      });
    });
    
    // 计算使用时长（返回总分钟数）
    const calculateDuration = (startTime) => {
      if (!startTime) return 0;
      
      const start = new Date(startTime);
      const now = new Date();
      const durationMinutes = Math.floor((now - start) / (1000 * 60));
      return durationMinutes;
    };
    
    // 计算费用（返回费用数值）
    const calculateFee = (startTime) => {
      if (!startTime || !selectedTable.value) return 0;
      
      const start = new Date(startTime);
      const now = new Date();
      const durationMinutes = Math.floor((now - start) / (1000 * 60));
      const hourlyRate = selectedTable.value.price_per_hour || 60; // 使用数据库中的球桌价格，默认60元/小时
      
      // 使用实际分钟数计算费用，保持与结账弹窗计算逻辑一致
      const totalFee = (durationMinutes / 60) * hourlyRate;
      return totalFee.toFixed(2);
    };
    
    // 从数据库加载收银台位置
    const loadCashierPosition = async () => {
      try {
        const response = await configAPI.getCashierPosition();
        if (response.success && response.data) {
          cashierPosition.x = response.data.x;
          cashierPosition.y = response.data.y;
          console.log('从数据库加载收银台位置:', response.data);
        }
      } catch (error) {
        console.error('加载收银台位置失败:', error);
        // 尝试从本地存储恢复作为备份
        try {
          const savedCashierPos = localStorage.getItem('cashierPosition');
          if (savedCashierPos) {
            const parsedPos = JSON.parse(savedCashierPos);
            cashierPosition.x = parsedPos.x;
            cashierPosition.y = parsedPos.y;
            console.log('从本地存储恢复收银台位置:', parsedPos);
          }
        } catch (localError) {
          console.error('从本地存储恢复收银台位置失败:', localError);
        }
      }
    };
    
    // 获取球桌样式
    const getTableStyle = (table) => {
      return {
        position: 'absolute',
        left: `${table.position_x || 0}px`,
        top: `${table.position_y || 0}px`,
        width: `${table.size_width || 100}px`,
        height: `${table.size_height || 200}px`,
        transform: `rotate(${table.rotation || 0}deg)`
      };
    };
    
    // 格式化时长
    const formatDuration = (minutes) => {
      if (!minutes || minutes < 0) return '0分钟';
      
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours > 0) {
        return `${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分钟' : ''}`;
      }
      return `${remainingMinutes}分钟`;
    };
    
    // 格式化时间
    const formatTime = (timeStr) => {
      if (!timeStr) return '未设置';
      try {
        const date = new Date(timeStr);
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return '无效时间';
        }
        return date.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return '时间格式错误';
      }
    };
    
    // 格式化时间范围
    const formatTimeRange = (reservation) => {
      if (!reservation) return '';
      return `${formatTime(reservation.start_time)} - ${formatTime(reservation.end_time)}`;
    };
    
    // 获取状态文本
    const getStatusText = (status) => {
      const statusMap = {
        idle: '空闲',
        using: '使用中',
        reserved: '已预订'
      };
      return statusMap[status] || status;
    };
    
    // 安全获取嵌套属性的工具函数
    const safeGet = (fn) => {
      try {
        return fn();
      } catch (e) {
        return null;
      }
    };
    
    // 弹窗标题计算属性
    const currentDialogTitle = computed(() => {
      return selectedTable.value ? `${selectedTable.value.table_no} 桌台信息` : '桌台信息';
    });
    
    // 根据状态获取样式类
    const getStatusClass = (table) => {
      switch (table.status) {
        case 'using':
          return 'status-using';
        case 'reserved':
          return 'status-reserved';
        case 'idle':
          return 'status-idle';
        default:
          return '';
      }
    };
    
    // 加载球桌状态
    const loadTableStatus = async () => {
      try {
        const response = await getTableStatus();
        if (response.success && Array.isArray(response.data)) {
          // 处理后端返回的数据格式，将嵌套的position和size对象展开为顶层属性
          const processedTables = response.data.map(table => ({
            ...table,
            position_x: table.position?.x,
            position_y: table.position?.y,
            size_width: table.size?.width,
            size_height: table.size?.height
          }));
          
          // 检查每个球桌是否包含必要的位置和大小属性
          const invalidTables = processedTables.filter(table => 
            table.position_x === undefined || table.position_x === null ||
            table.position_y === undefined || table.position_y === null ||
            table.size_width === undefined || table.size_width === null ||
            table.size_height === undefined || table.size_height === null
          );
          
          if (invalidTables.length > 0) {
            // 获取缺少数据的球桌编号列表
            const invalidTableNumbers = invalidTables.map(table => table.table_no || '未知桌号').join(', ');
            console.error('球桌数据缺失必要的位置或大小属性:', invalidTables);
            ElMessage.error(`错误：发现${invalidTables.length}个球桌缺少必要的位置或大小数据，桌号：${invalidTableNumbers}`);
            tables.value = []; // 清空数据，不显示有问题的球桌
          } else {
            tables.value = processedTables;
            console.log('球桌数据已加载并处理:', tables.value);
          }
        } else {
          console.error('获取球桌状态失败：返回数据格式不正确');
          ElMessage.error('获取球桌状态失败：数据格式不正确');
          tables.value = [];
        }
      } catch (error) {
        console.error('获取球桌状态发生错误:', error);
        ElMessage.error(`获取球桌状态失败：${error.message || '未知错误'}`);
        tables.value = []; // 出错时清空数据，不显示默认球桌
      }
    };
    
    // 选择球桌
    const selectTable = (table) => {
      selectedTableId.value = table.table_id;
      selectedTable.value = { ...table }; // 创建副本，避免引用问题
      tableDetailDialogVisible.value = true;
    };
    
    // 关闭桌台详情弹窗
    const closeTableDetail = () => {
      tableDetailDialogVisible.value = false;
      // 延迟清空选中状态，避免动画过程中的闪烁
      setTimeout(() => {
        selectedTable.value = null;
        selectedTableId.value = null;
      }, 300);
    };
    
    // 计算显示使用时长
    const calculateDisplayDuration = () => {
      if (!selectedTable.value || !safeGet(() => selectedTable.value.usage_info.start_time)) {
        return '0分钟';
      }
      const duration = calculateDuration(selectedTable.value.usage_info.start_time);
      return formatDuration(duration);
    };
    
    // 计算显示费用
    const calculateDisplayFee = () => {
      if (!selectedTable.value || !safeGet(() => selectedTable.value.usage_info.start_time)) {
        return '¥0.00';
      }
      const fee = calculateFee(selectedTable.value.usage_info.start_time);
      return `¥${fee}`;
    };
    
    // 处理开台
    const handleOpenTable = () => {
      if (!selectedTable.value) return;
      
      tableDetailDialogVisible.value = false; // 关闭详情弹窗
      openTableForm.value = {
        table_id: selectedTable.value.table_id,
        table_no: selectedTable.value.table_no,
        operator: currentUser.value,
        notes: ''
      };
      openTableDialogVisible.value = true;
    };
    
    // 计算结账费用（根据分钟数实时计算）
    const calculateCloseTableFee = (billingMinutes) => {
      if (!selectedTable.value) return 0;
      
      const hourlyRate = selectedTable.value.price_per_hour || 60;
      const totalFee = (billingMinutes / 60) * hourlyRate;
      return totalFee.toFixed(2);
    };
    
    // 更新结账费用（当用户修改使用时长时调用）
    const updateCloseTableFee = () => {
      if (!closeTableForm.value.billing_minutes || closeTableForm.value.billing_minutes < 0) {
        closeTableForm.value.total_amount = 0;
        return;
      }
      
      const calculatedFee = parseFloat(calculateCloseTableFee(closeTableForm.value.billing_minutes));
      closeTableForm.value.total_amount = calculatedFee;
    };
    
    // 处理结台
    const handleCloseTable = function() {
      if (!selectedTable.value || selectedTable.value.status !== 'using') {
        return;
      }

      // 确保usage_info存在
      if (!selectedTable.value.usage_info) {
        selectedTable.value.usage_info = {};
      }

      tableDetailDialogVisible.value = false;
      const now = new Date();
      const startTime = selectedTable.value.usage_info.start_time || now.toISOString();
      const start = new Date(startTime);
      const durationMinutes = Math.floor((now - start) / (1000 * 60));
      const billingMinutes = Math.ceil(durationMinutes / 60) * 60;
      const calculatedFee = parseFloat(calculateCloseTableFee(billingMinutes));

      const isMember = selectedTable.value.usage_info.member_id && selectedTable.value.usage_info.member_id !== '00000000';
      closeTableForm.value = {};
      closeTableForm.value.usage_id = selectedTable.value.usage_info.usage_id || '';
      closeTableForm.value.duration_minutes = durationMinutes;
      closeTableForm.value.billing_minutes = billingMinutes;
      closeTableForm.value.total_amount = calculatedFee;
      closeTableForm.value.table_no = selectedTable.value.table_no;
      closeTableForm.value.member_id = selectedTable.value.usage_info.member_id || '00000000';
      closeTableForm.value.member_name = selectedTable.value.usage_info.member_name || '';
      closeTableForm.value.start_time = selectedTable.value.usage_info.start_time;
      closeTableForm.value.customer_type = isMember ? 'member' : 'scattered';
      closeTableForm.value.payment_method = isMember ? 'member_card' : 'cash';
      closeTableForm.value.operator = currentUser.value || '';

      closeTableDialogVisible.value = true;
    };
    
    // 处理预订
    const handleReservation = () => {
      if (!selectedTable.value) return;
      
      tableDetailDialogVisible.value = false; // 关闭详情弹窗
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      reservationForm.value = {
        table_id: selectedTable.value.table_id,
        table_no: selectedTable.value.table_no,
        contact_name: '',
        contact_phone: '',
        start_time: now,
        end_time: oneHourLater,
        operator: currentUser.value,
        notes: ''
      };
      reservationDialogVisible.value = true;
    };
    
    // 搜索会员（开台用）
    const searchMembers = async () => {
      try {
        if (!openTableForm.value.member_name.trim()) {
          memberSearchResults.value = [];
          return;
        }
        
        // 从API获取所有会员数据，然后在前端进行过滤
        const response = await api.getAllMembers();
        const allMembers = response.data || [];
        const searchKeyword = openTableForm.value.member_name.toLowerCase().trim();
        
        // 过滤会员：根据姓名或手机号模糊匹配
        memberSearchResults.value = allMembers.filter(member => {
          const nameMatch = member.name && member.name.toLowerCase().includes(searchKeyword);
          const phoneMatch = member.phone && member.phone.includes(searchKeyword);
          return nameMatch || phoneMatch;
        }).map(member => ({
          member_id: member.member_id,
          name: member.name,
          phone: member.phone,
          balance: parseFloat(member.balance || 0)
        }));
      } catch (error) {
        console.error('搜索会员失败:', error);
        ElMessage.error('搜索会员失败: ' + error.message);
        memberSearchResults.value = [];
      }
    };
    
    // 搜索会员（结账用）
    const searchCloseTableMembers = async () => {
      try {
        if (!closeTableForm.value.member_name.trim()) {
          closeTableMemberSearchResults.value = [];
          return;
        }
        
        // 从API获取所有会员数据，然后在前端进行过滤
        const response = await api.getAllMembers();
        const allMembers = response.data || [];
        const searchKeyword = closeTableForm.value.member_name.toLowerCase().trim();
        
        // 过滤会员：根据姓名或手机号模糊匹配
        closeTableMemberSearchResults.value = allMembers.filter(member => {
          const nameMatch = member.name && member.name.toLowerCase().includes(searchKeyword);
          const phoneMatch = member.phone && member.phone.includes(searchKeyword);
          return nameMatch || phoneMatch;
        }).map(member => ({
          member_id: member.member_id,
          name: member.name,
          phone: member.phone,
          balance: parseFloat(member.balance || 0)
        }));
      } catch (error) {
        console.error('搜索会员失败:', error);
        ElMessage.error('搜索会员失败: ' + error.message);
        closeTableMemberSearchResults.value = [];
      }
    };
    
    // 选择结账会员
    const selectCloseTableMember = (member) => {
      closeTableForm.value.member_id = member.member_id;
      closeTableForm.value.member_name = member.name;
      closeTableForm.value.customer_type = 'member';
      closeTableMemberSearchResults.value = [];
    };
    
    // 暂停计费
    const handlePauseBilling = async () => {
      if (!selectedTable.value) return;
      
      try {
        // 实际应调用API暂停计费
        pausedTables.value.add(selectedTable.value.table_id);
        ElMessage.success('已暂停计费');
        console.log('暂停计费:', selectedTable.value.table_no);
      } catch (error) {
        ElMessage.error('暂停计费失败');
      }
    };
    
    // 继续计费
    const handleContinueBilling = async () => {
      if (!selectedTable.value) return;
      
      try {
        // 实际应调用API继续计费
        pausedTables.value.delete(selectedTable.value.table_id);
        ElMessage.success('已继续计费');
        console.log('继续计费:', selectedTable.value.table_no);
      } catch (error) {
        ElMessage.error('继续计费失败');
      }
    };
    
    // 续时
    const handleExtendTime = async () => {
      if (!selectedTable.value) return;
      
      try {
        // 实际应调用API续时
        ElMessage.success('续时操作暂未实现');
        console.log('续时:', selectedTable.value.table_no);
        tableDetailDialogVisible.value = false; // 关闭详情弹窗
      } catch (error) {
        ElMessage.error('续时失败');
      }
    };
    
    // 转台
    const handleTransferTable = () => {
      console.log('转台按钮点击，selectedTable:', selectedTable.value);
      
      // 简化条件检查，先确保有选中的球桌且状态为使用中
      if (!selectedTable.value) {
        console.log('没有选中球桌');
        ElMessage.warning('请先选择一个球桌');
        return;
      }
      
      if (selectedTable.value.status !== 'using') {
        console.log('球桌状态不是使用中，当前状态:', selectedTable.value.status);
        ElMessage.warning('只有使用中的球桌才能转台');
        return;
      }
      
      // 确保usage_info存在，如果不存在则创建
      if (!selectedTable.value.usage_info) {
        console.log('创建默认usage_info');
        selectedTable.value.usage_info = {
          usage_id: `temp_${Date.now()}`,
          start_time: new Date().toISOString()
        };
      }
      
      // 关闭详情弹窗
      tableDetailDialogVisible.value = false;
      console.log('已关闭详情弹窗');
      
      // 设置转台表单数据
      transferTableForm.value = {
        usage_id: selectedTable.value.usage_info.usage_id || '',
        source_table_id: selectedTable.value.table_id,
        source_table_no: selectedTable.value.table_no,
        target_table_id: '',
        operator: currentUser.value || '系统管理员'
      };
      
      console.log('已设置转台表单数据:', transferTableForm.value);
      
      // 先加载可用球桌，然后显示弹窗
      loadAvailableTables().then(() => {
        console.log('设置转台弹窗可见');
        transferTableDialogVisible.value = true;
      }).catch(error => {
        console.error('加载可用球桌失败:', error);
        // 即使加载失败也显示弹窗，让用户看到问题
        transferTableDialogVisible.value = true;
      });
    };
    
    // 关闭转台弹窗
    // 已通过直接设置transferTableDialogVisible实现
    
    // 加载可用球桌
    const loadAvailableTables = async () => {
      return new Promise((resolve, reject) => {
        try {
          console.log('开始加载可用球桌');
          getTableStatus().then(response => {
            console.log('获取球桌状态响应:', response);
            
            if (response && response.success && Array.isArray(response.data)) {
              // 筛选出状态为idle且不是当前球桌的球桌
              availableTables.value = response.data.filter(table => 
                table.status === 'idle' && table.table_id !== selectedTable.value.table_id
              );
              console.log('可用球桌列表:', availableTables.value);
              resolve(availableTables.value);
            } else {
              console.error('获取球桌状态失败，响应格式不正确:', response);
              ElMessage.error('获取可用球桌失败：数据格式错误');
              reject(new Error('响应格式错误'));
            }
          }).catch(error => {
            console.error('加载可用球桌异常:', error);
            ElMessage.error(`加载可用球桌失败: ${error.message || '未知错误'}`);
            reject(error);
          });
        } catch (error) {
          console.error('加载可用球桌异常:', error);
          ElMessage.error(`加载可用球桌失败: ${error.message || '未知错误'}`);
          reject(error);
        }
      });
    };

    // 确认转台
    const confirmTransferTable = async () => {
      console.log('确认转台按钮点击');
      
      try {
        // 验证表单数据
        console.log('验证转台表单数据:', transferTableForm.value);
        
        if (!transferTableForm.value.target_table_id) {
          console.log('未选择目标球桌');
          ElMessage.warning('请选择目标球桌');
          return;
        }
        
        // 验证usage_id
        if (!transferTableForm.value.usage_id) {
          console.log('缺少usage_id');
          ElMessage.error('转台失败：缺少开台记录ID');
          return;
        }
        
        // 准备转台数据
        const transferData = {
          usage_id: transferTableForm.value.usage_id,
          target_table_id: transferTableForm.value.target_table_id,
          operator: transferTableForm.value.operator || '系统管理员'
        };
        
        console.log('准备转台，提交数据:', transferData);
        
        // 调用转台API
        console.log('开始调用转台API');
        const response = await transferTable(transferData);
        console.log('转台API响应:', response);
        
        if (response && response.success) {
          console.log('转台成功');
          ElMessage.success(response.message || '转台成功');
          transferTableDialogVisible.value = false;
          console.log('关闭转台弹窗，重新加载球桌状态');
          loadTableStatus(); // 重新加载球桌状态
        } else {
          const errorMsg = response?.message || '转台请求返回非成功状态';
          console.error('转台失败，服务器返回错误:', errorMsg);
          ElMessage.error(`转台失败: ${errorMsg}`);
        }
      } catch (error) {
        console.error('转台过程发生异常:', error);
        ElMessage.error(`转台失败: ${error.message || '未知错误'}`);
      }
    };
    
    // 选择会员
    const selectMember = (member) => {
      openTableForm.value.member_id = member.member_id;
      openTableForm.value.member_name = member.name;
      memberSearchResults.value = [];
    };
    
    // 切换为散客
    const switchToScatteredCustomer = () => {
      closeTableForm.value.customer_type = 'scattered';
      closeTableForm.value.member_id = '00000000';
      closeTableForm.value.member_name = '';
      closeTableForm.value.payment_method = 'cash'; // 散客默认现金支付
      closeTableMemberSearchResults.value = [];
    };
    
    // 确认开台
    const confirmOpenTable = async () => {
      try {
        // 修改：开台时无需填写用户信息
        console.log('准备开台，提交数据:', openTableForm.value);
        
        // 先测试API连接
        const isConnected = await testApiConnection();
        console.log('API连接状态:', isConnected);
        
        const response = await openTable(openTableForm.value);
        
        if (response && response.success) {
          ElMessage.success(response.message || '开台成功');
          openTableDialogVisible.value = false;
          resetOpenTableForm();
          loadTableStatus();
        } else {
          // 处理非成功响应
          const errorMsg = response?.message || '开台请求返回非成功状态';
          console.error('开台失败，服务器返回错误:', errorMsg);
          ElMessage.error(`开台失败: ${errorMsg}`);
        }
      } catch (error) {
        console.error('开台过程发生异常:', error);
        ElMessage.error(`开台失败: ${error.message || '未知错误'}`);
      }
    };
    
    // 确认结台
    const confirmCloseTable = async () => {
      try {
        // 验证表单数据
        if (!closeTableForm.value.customer_type) {
          ElMessage.warning('请选择客户类型');
          return;
        }
        
        // 如果是会员但没有选择会员信息
        if (closeTableForm.value.customer_type === 'member' && !closeTableForm.value.member_id) {
          ElMessage.warning('请选择会员');
          return;
        }
        
        // 确保散客不能使用会员卡支付
        if (closeTableForm.value.customer_type === 'scattered' && closeTableForm.value.payment_method === 'member_card') {
          ElMessage.warning('散客不能使用会员卡支付');
          closeTableForm.value.payment_method = 'cash';
          return;
        }
        
        // 传递后端需要的参数，包含会员信息
        const closeData = {
          usage_id: closeTableForm.value.usage_id,
          duration_minutes: closeTableForm.value.duration_minutes,
          billing_minutes: closeTableForm.value.billing_minutes, // 添加billing_minutes参数
          payment_method: closeTableForm.value.payment_method,
          operator: closeTableForm.value.operator,
          member_id: closeTableForm.value.member_id, // 传递会员ID
          member_name: closeTableForm.value.member_name // 传递会员名称
        };
        
        console.log('结账请求数据:', closeData);
        
        const response = await closeTable(closeData);
        if (response && response.success) {
          ElMessage.success(response.message || '结账成功');
          closeTableDialogVisible.value = false;
          loadTableStatus();
        } else {
          const errorMsg = response?.message || '结账失败';
          ElMessage.error(errorMsg);
        }
      } catch (error) {
        console.error('结账过程发生异常:', error);
        ElMessage.error('结账失败: ' + (error.message || '未知错误'));
      }
    };
    
    // 确认预订
    const confirmReservation = async () => {
      try {
        const response = await createReservation(reservationForm.value);
        if (response.success) {
          ElMessage.success(response.message);
          reservationDialogVisible.value = false;
          loadTableStatus();
        }
      } catch (error) {
        ElMessage.error('预订失败');
      }
    };
    
    // 重置开台表单
    const resetOpenTableForm = () => {
      // 只重置必要的字段，不包括会员信息
      openTableForm.value = {
        table_id: '',
        table_no: '',
        operator: currentUser.value,
        notes: ''
      };
      memberSearchResults.value = [];
    };
    
    // 处理筛选变化
    const handleFilterChange = () => {
      // 筛选逻辑已通过computed实现
    };
    
    // 生命周期
    onMounted(async () => {
      // 每次进入页面时刷新一次数据
      await loadCashierPosition();
      await loadTableStatus();
    });
    
    return {
      tables,
      statusFilter,
      tableNoSearch,
      businessDate,
      selectedTableId,
      hoveredTableId,
      currentUser,
      memberSearchResults,
      closeTableMemberSearchResults,
      openTableDialogVisible,
      closeTableDialogVisible,
      reservationDialogVisible,
      tableDetailDialogVisible,
      openTableForm,
      closeTableForm,
      reservationForm,
      filteredTables,
      selectedTable,
      pausedTables,
      cashierStyle,
      currentDialogTitle,
      getTableStyle,
      formatTime,
      formatTimeRange,
      getStatusText,
      getStatusClass,
      safeGet,
      selectTable,
      closeTableDetail,
      handleOpenTable,
      handleCloseTable,
      handleReservation,
      searchMembers,
      selectMember,
      searchCloseTableMembers,
      selectCloseTableMember,
      switchToScatteredCustomer,
      handlePauseBilling,
      handleContinueBilling,
      handleExtendTime,
      handleTransferTable,
      calculateDuration,
      calculateFee,
      formatDuration,
      calculateDisplayDuration,
      calculateDisplayFee,
      confirmOpenTable,
      confirmCloseTable,
      confirmReservation,
      resetOpenTableForm,
      handleFilterChange
    };
  }
};
</script>

<style scoped>
.table-management-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
}

/* 弹窗样式 */
.table-dialog-content {
  padding: 10px 0;
}

.detail-item {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}

.detail-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 500;
}

.status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-using {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

.status-reserved {
  background-color: #f0f9ff;
  color: #409eff;
  border: 1px solid #bae7ff;
}

.status-idle {
  background-color: #f0f9ff;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.status-paused {
  color: #909399;
  font-size: 13px;
}

.detail-content {
  margin-bottom: 8px;
}

.detail-row {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  flex: 0 0 80px;
  font-weight: 500;
  color: #606266;
  font-size: 14px;
  text-align: right;
  margin-right: 16px;
  padding-top: 4px;
}

.detail-value {
  flex: 1;
  color: #303133;
  font-size: 14px;
  word-break: break-word;
  line-height: 1.5;
}

.no-selection {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .detail-row {
    flex-direction: column;
  }
  
  .detail-label {
    flex: none;
    text-align: left;
    margin-right: 0;
    margin-bottom: 4px;
  }
}

.filter-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
  color: #606266;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.visualization-section {
  flex: 1;
  margin-bottom: 20px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

.table-layout {
  position: relative;
  width: 100%;
  height: 600px;
  background-image: linear-gradient(#e0e0e0 1px, transparent 1px),
                    linear-gradient(90deg, #e0e0e0 1px, transparent 1px);
  background-size: 50px 50px;
  background-color: #f9f9f9;
  border: 2px solid #ddd;
  border-radius: 8px;
}

.cashier-desk {
  background-color: #409eff;
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: default;
}

.cashier-label {
  font-weight: bold;
  font-size: 16px;
}

.table-item {
  background-color: #67c23a;
  border: 2px solid #409eff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-item.table-idle {
  background-color: #67c23a;
}

.table-item.table-using {
  background-color: #f56c6c;
}

.table-item.table-using.paused {
  background-color: #909399;
}

.table-item.table-reserved {
  background-color: #e6a23c;
}

.table-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.table-item.table-selected {
  border-color: #f56c6c;
  border-width: 3px;
}

.table-number {
  color: white;
  font-weight: bold;
  font-size: 18px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.table-info {
  position: absolute;
  bottom: -70px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
}

/* 详情弹窗相关样式已移至dialog组件 */

.details-section h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #303133;
}

.details-list {
  flex: 1;
  overflow-y: auto;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-empty {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.table-usage-info {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin: 15px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #606266;
}

.info-value {
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 15px 0;
}

.table-actions .btn {
  flex: 1;
  min-width: 80px;
}

.detail-main {
  display: flex;
  align-items: center;
  gap: 20px;
}

.detail-main .table-number {
  font-weight: bold;
  color: #303133;
}

.detail-main .status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-using {
  background-color: #fef0f0;
  color: #f56c6c;
}

.status-reserved {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-success {
  background-color: #67c23a;
  color: white;
}

.btn-warning {
  background-color: #e6a23c;
  color: white;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 100px;
  right: 0;
  background-color: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.search-result-item {
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.search-result-item:hover {
  background-color: #f5f7fa;
}
</style>