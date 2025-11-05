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
          :class="['table-item', `table-${table.status}`, { 'table-selected': selectedTableId === table.table_id }]"
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

    <!-- 右侧明细列表区 -->
    <div class="details-section">
      <h3>桌台使用明细</h3>
      <div class="details-list">
        <div class="detail-item" v-for="item in activeItems" :key="item.id">
          <div class="detail-main">
            <span class="table-number">{{ item.table_no }}</span>
            <span class="status" :class="`status-${item.status}`">{{ getStatusText(item.status) }}</span>
            <span class="user">{{ item.user }}</span>
            <span class="time">{{ item.time_info }}</span>
          </div>
          <div class="detail-actions">
            <button 
              v-if="item.status === 'using'" 
              class="btn btn-primary" 
              @click="handleCloseTable(item)"
            >
              结台
            </button>
            <button 
              v-if="item.status === 'idle'" 
              class="btn btn-success" 
              @click="handleOpenTable(item)"
            >
              开台
            </button>
            <button 
              v-if="item.status === 'idle'" 
              class="btn btn-warning" 
              @click="handleReservation(item)"
            >
              预订
            </button>
          </div>
        </div>
      </div>
    </div>

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
        <el-form-item label="会员姓名/手机号" required>
          <el-input 
            v-model="openTableForm.member_name" 
            placeholder="输入会员姓名或手机号"
            @input="searchMembers"
          />
          <div v-if="memberSearchResults.length > 0" class="search-results">
            <div 
              v-for="member in memberSearchResults" 
              :key="member.member_id"
              class="search-result-item"
              @click="selectMember(member)"
            >
              {{ member.name }} ({{ member.phone }}) - 余额: {{ member.balance }}
            </div>
          </div>
        </el-form-item>
        <el-form-item label="会员ID" v-if="openTableForm.member_id">
          <el-input v-model="openTableForm.member_id" disabled />
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
      title="结台"
      width="500px"
    >
      <el-form :model="closeTableForm" label-width="100px">
        <el-form-item label="桌号">
          <el-input v-model="closeTableForm.table_no" disabled />
        </el-form-item>
        <el-form-item label="使用人">
          <el-input v-model="closeTableForm.member_name" disabled />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-input v-model="closeTableForm.start_time" disabled />
        </el-form-item>
        <el-form-item label="使用时长(分钟)">
          <el-input v-model.number="closeTableForm.billing_minutes" />
        </el-form-item>
        <el-form-item label="总费用">
          <el-input v-model="closeTableForm.total_amount" disabled />
        </el-form-item>
        <el-form-item label="支付方式" required>
          <el-radio-group v-model="closeTableForm.payment_method">
            <el-radio :label="'member_card'">会员卡</el-radio>
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
          <el-button type="primary" @click="confirmCloseTable">确认结台</el-button>
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
import { ref, computed, onMounted, watch } from 'vue';
import { getTableStatus, openTable, closeTable, createReservation } from '@/services/api';
import { getUserInfo } from '@/stores/user';
import { ElMessage } from 'element-plus';

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
    
    // 弹窗状态
    const openTableDialogVisible = ref(false);
    const closeTableDialogVisible = ref(false);
    const reservationDialogVisible = ref(false);
    
    // 表单数据
    const openTableForm = ref({
      table_id: '',
      table_no: '',
      member_id: '',
      member_name: '',
      operator: currentUser.value,
      notes: ''
    });
    
    const closeTableForm = ref({
      usage_id: '',
      table_no: '',
      member_name: '',
      start_time: '',
      billing_minutes: 60,
      total_amount: 0,
      payment_method: 'cash',
      operator: currentUser.value
    });
    
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
    
    // 活跃项目列表（使用中或已预订）
    const activeItems = computed(() => {
      const items = [];
      
      tables.value.forEach(table => {
        if (table.status === 'using' && table.usage_info) {
          items.push({
            id: `usage-${table.table_id}`,
            table_no: table.table_no,
            status: 'using',
            user: table.usage_info.member_name,
            time_info: formatTime(table.usage_info.start_time),
            table_id: table.table_id
          });
        } else if (table.status === 'reserved' && table.reservation_info) {
          items.push({
            id: `reservation-${table.table_id}`,
            table_no: table.table_no,
            status: 'reserved',
            user: table.reservation_info.contact_name,
            time_info: formatTimeRange(table.reservation_info),
            table_id: table.table_id
          });
        }
      });
      
      return items;
    });
    
    // 收银台样式
    const cashierStyle = {
      position: 'absolute',
      left: '50px',
      bottom: '50px',
      width: '120px',
      height: '80px'
    };
    
    // 获取球桌样式
    const getTableStyle = (table) => {
      return {
        position: 'absolute',
        left: `${table.position.x}px`,
        top: `${table.position.y}px`,
        width: `${table.size.width}px`,
        height: `${table.size.height}px`,
        transform: `rotate(${table.rotation}deg)`
      };
    };
    
    // 格式化时间
    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
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
    
    // 加载球桌状态
    const loadTableStatus = async () => {
      try {
        const response = await getTableStatus();
        if (response.success) {
          tables.value = response.data;
        }
      } catch (error) {
        ElMessage.error('获取球桌状态失败');
      }
    };
    
    // 选择球桌
    const selectTable = (table) => {
      selectedTableId.value = table.table_id;
      
      if (table.status === 'idle') {
        // 空闲球桌可以开台或预订
        handleOpenTable(table);
      } else if (table.status === 'using') {
        // 使用中的球桌可以结台
        handleCloseTable(table);
      }
    };
    
    // 处理开台
    const handleOpenTable = (table) => {
      openTableForm.value = {
        table_id: table.table_id,
        table_no: table.table_no,
        member_id: '',
        member_name: '',
        operator: currentUser.value,
        notes: ''
      };
      openTableDialogVisible.value = true;
    };
    
    // 处理结台
    const handleCloseTable = (table) => {
      if (table.status === 'using' && table.usage_info) {
        const now = new Date();
        const start = new Date(table.usage_info.start_time);
        const durationMinutes = Math.floor((now - start) / (1000 * 60));
        const billingMinutes = Math.ceil(durationMinutes / 60) * 60;
        
        closeTableForm.value = {
          usage_id: '', // 需要从API获取
          table_no: table.table_no,
          member_name: table.usage_info.member_name,
          start_time: formatTime(table.usage_info.start_time),
          billing_minutes,
          total_amount: 60, // 默认价格，需要从API获取球桌价格
          payment_method: 'cash',
          operator: currentUser.value
        };
        closeTableDialogVisible.value = true;
      }
    };
    
    // 处理预订
    const handleReservation = (table) => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      reservationForm.value = {
        table_id: table.table_id,
        table_no: table.table_no,
        contact_name: '',
        contact_phone: '',
        start_time: now,
        end_time: oneHourLater,
        operator: currentUser.value,
        notes: ''
      };
      reservationDialogVisible.value = true;
    };
    
    // 搜索会员
    const searchMembers = async () => {
      // 这里需要调用会员搜索API
      // 暂时模拟数据
      if (openTableForm.value.member_name) {
        memberSearchResults.value = [
          { member_id: '1', name: '张三', phone: '13800138001', balance: 500 }
        ];
      } else {
        memberSearchResults.value = [];
      }
    };
    
    // 选择会员
    const selectMember = (member) => {
      openTableForm.value.member_id = member.member_id;
      openTableForm.value.member_name = member.name;
      memberSearchResults.value = [];
    };
    
    // 确认开台
    const confirmOpenTable = async () => {
      try {
        const response = await openTable(openTableForm.value);
        if (response.success) {
          ElMessage.success(response.message);
          openTableDialogVisible.value = false;
          resetOpenTableForm();
          loadTableStatus();
        }
      } catch (error) {
        ElMessage.error('开台失败');
      }
    };
    
    // 确认结台
    const confirmCloseTable = async () => {
      try {
        const response = await closeTable(closeTableForm.value);
        if (response.success) {
          ElMessage.success(response.message);
          closeTableDialogVisible.value = false;
          loadTableStatus();
        }
      } catch (error) {
        ElMessage.error('结台失败');
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
      memberSearchResults.value = [];
    };
    
    // 处理筛选变化
    const handleFilterChange = () => {
      // 筛选逻辑已通过computed实现
    };
    
    // 定时刷新数据
    let refreshTimer = null;
    
    // 生命周期
    onMounted(() => {
      loadTableStatus();
      // 每30秒刷新一次数据
      refreshTimer = setInterval(loadTableStatus, 30000);
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
      openTableDialogVisible,
      closeTableDialogVisible,
      reservationDialogVisible,
      openTableForm,
      closeTableForm,
      reservationForm,
      filteredTables,
      activeItems,
      cashierStyle,
      getTableStyle,
      formatTime,
      formatTimeRange,
      getStatusText,
      selectTable,
      handleOpenTable,
      handleCloseTable,
      handleReservation,
      searchMembers,
      selectMember,
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

.details-section {
  height: 300px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 15px;
  display: flex;
  flex-direction: column;
}

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