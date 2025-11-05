<template>
  <div class="reservations-container">
    <!-- 顶部操作区 -->
    <div class="top-actions">
      <h2>球桌预订管理</h2>
      <el-button type="primary" @click="showCreateForm">新增预订</el-button>
    </div>

    <!-- 搜索筛选区 -->
    <div class="search-section">
      <div class="search-filters">
        <div class="filter-item">
          <el-input
            v-model="searchParams.contact_name"
            placeholder="联系人姓名"
            class="filter-input"
          />
        </div>
        <div class="filter-item">
          <el-input
            v-model="searchParams.contact_phone"
            placeholder="联系电话"
            class="filter-input"
          />
        </div>
        <div class="filter-item">
          <el-select
            v-model="searchParams.table_no"
            placeholder="选择桌号"
            class="filter-input"
            filterable
          >
            <el-option
              v-for="table in tables"
              :key="table.table_no"
              :label="table.table_no"
              :value="table.table_no"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <el-select
            v-model="searchParams.status"
            placeholder="预订状态"
            class="filter-input"
          >
            <el-option label="全部" value="" />
            <el-option label="待使用" value="pending" />
            <el-option label="已到店" value="arrived" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </div>
        <div class="filter-item">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="filter-input"
          />
        </div>
      </div>
      <div class="search-buttons">
        <el-button type="primary" @click="searchReservations">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        v-loading="loading"
        :data="reservationsData"
        style="width: 100%"
        border
      >
        <el-table-column prop="reservation_id" label="预订ID" width="120" />
        <el-table-column prop="table_no" label="桌号" width="100" />
        <el-table-column prop="contact_name" label="联系人" width="120" />
        <el-table-column prop="contact_phone" label="联系电话" width="150" />
        <el-table-column label="预订时间" width="250">
          <template #default="{ row }">
            {{ formatDateTimeRange(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration_hours" label="时长(小时)" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <span :class="['status-badge', `status-${row.status}`]">
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作员" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="150" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="markArrived(row)"
            >
              标记到店
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="danger"
              size="small"
              @click="cancelReservation(row)"
            >
              取消预订
            </el-button>
            <el-button
              v-if="row.status === 'arrived'"
              type="info"
              size="small"
              @click="completeReservation(row)"
            >
              完成
            </el-button>
            <el-button
              v-if="['pending', 'arrived'].includes(row.status)"
              type="text"
              size="small"
              @click="editReservation(row)"
            >
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增/编辑预订弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增预订' : '编辑预订'"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="reservationFormRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-form-item label="桌号" prop="table_id">
          <el-select v-model="formData.table_id" placeholder="选择桌号" filterable>
            <el-option
              v-for="table in availableTables"
              :key="table.table_id"
              :label="table.table_no"
              :value="table.table_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人" prop="contact_name">
          <el-input v-model="formData.contact_name" placeholder="请输入联系人姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contact_phone">
          <el-input v-model="formData.contact_phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-date-picker
            v-model="formData.start_time"
            type="datetime"
            placeholder="选择开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-date-picker
            v-model="formData.end_time"
            type="datetime"
            placeholder="选择结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="操作员">
          <el-input v-model="formData.operator" :value="currentUser" disabled />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            type="textarea"
            v-model="formData.notes"
            placeholder="请输入备注信息"
            rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 确认对话框 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="操作确认"
      width="400px"
    >
      <p>{{ confirmMessage }}</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmAction">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getReservations,
  createReservation,
  updateReservation,
  cancelReservation,
  markReservationArrived,
  completeReservation,
  getAvailableTables
} from '@/services/api';
import { getUserInfo } from '@/stores/user';

export default {
  name: 'TableReservations',
  setup() {
    // 状态管理
    const loading = ref(false);
    const reservations = ref([]);
    const tables = ref([]);
    const currentUser = ref(getUserInfo()?.name || '管理员');
    
    // 搜索参数
    const searchParams = reactive({
      contact_name: '',
      contact_phone: '',
      table_no: '',
      status: '',
      start_date: '',
      end_date: ''
    });
    
    const dateRange = ref([]);
    
    // 分页
    const pagination = reactive({
      currentPage: 1,
      pageSize: 10,
      total: 0
    });
    
    // 对话框
    const dialogVisible = ref(false);
    const dialogMode = ref('create'); // 'create' or 'edit'
    const confirmDialogVisible = ref(false);
    const confirmMessage = ref('');
    const currentAction = ref('');
    const currentReservation = ref(null);
    
    // 表单数据
    const formData = reactive({
      reservation_id: '',
      table_id: '',
      table_no: '',
      contact_name: '',
      contact_phone: '',
      start_time: '',
      end_time: '',
      duration_hours: 0,
      operator: currentUser.value,
      status: 'pending',
      notes: ''
    });
    
    const reservationFormRef = ref(null);
    
    // 表单验证规则
    const formRules = reactive({
      table_id: [{ required: true, message: '请选择桌号', trigger: 'change' }],
      contact_name: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
      contact_phone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
      ],
      start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
      end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
    });
    
    // 计算属性
    const reservationsData = computed(() => {
      // 计算分页数据
      const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      return reservations.value.slice(startIndex, endIndex);
    });
    
    // 获取可用球桌
    const availableTables = computed(() => {
      // 过滤出可用球桌（空闲或未被预订的球桌）
      return tables.value.filter(table => table.is_active && (table.status === 'idle' || !table.status));
    });
    
    // 格式化时间
    const formatDateTime = (dateTime) => {
      if (!dateTime) return '';
      const date = new Date(dateTime);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    // 格式化时间范围
    const formatDateTimeRange = (startTime, endTime) => {
      if (!startTime || !endTime) return '';
      return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
    };
    
    // 获取状态文本
    const getStatusText = (status) => {
      const statusMap = {
        pending: '待使用',
        arrived: '已到店',
        completed: '已完成',
        cancelled: '已取消',
        expired: '已过期'
      };
      return statusMap[status] || status;
    };
    
    // 加载球桌数据
    const loadTables = async () => {
      try {
        // 这里应该调用API获取球桌列表
        // 暂时模拟数据
        tables.value = [
          { table_id: '1', table_no: '桌台1', is_active: true, status: 'idle' },
          { table_id: '2', table_no: '桌台2', is_active: true, status: 'idle' },
          { table_id: '3', table_no: '桌台3', is_active: true, status: 'reserved' },
          { table_id: '4', table_no: '桌台4', is_active: true, status: 'idle' },
          { table_id: '5', table_no: '桌台5', is_active: false, status: 'idle' }
        ];
      } catch (error) {
        ElMessage.error('获取球桌数据失败');
      }
    };
    
    // 加载预订数据
    const loadReservations = async () => {
      loading.value = true;
      try {
        // 构建查询参数
        const params = {
          ...searchParams,
          page: pagination.currentPage,
          page_size: pagination.pageSize
        };
        
        if (dateRange.value.length === 2) {
          params.start_date = dateRange.value[0];
          params.end_date = dateRange.value[1];
        }
        
        const response = await getReservations(params);
        if (response.success) {
          reservations.value = response.data.items || [];
          pagination.total = response.data.total || 0;
        }
      } catch (error) {
        ElMessage.error('获取预订数据失败');
      } finally {
        loading.value = false;
      }
    };
    
    // 搜索预订
    const searchReservations = () => {
      pagination.currentPage = 1;
      loadReservations();
    };
    
    // 重置筛选条件
    const resetFilters = () => {
      Object.keys(searchParams).forEach(key => {
        searchParams[key] = '';
      });
      dateRange.value = [];
      pagination.currentPage = 1;
      loadReservations();
    };
    
    // 显示创建表单
    const showCreateForm = () => {
      dialogMode.value = 'create';
      resetForm();
      dialogVisible.value = true;
    };
    
    // 编辑预订
    const editReservation = (row) => {
      dialogMode.value = 'edit';
      formData.reservation_id = row.reservation_id;
      formData.table_id = row.table_id;
      formData.contact_name = row.contact_name;
      formData.contact_phone = row.contact_phone;
      formData.start_time = row.start_time;
      formData.end_time = row.end_time;
      formData.notes = row.notes || '';
      dialogVisible.value = true;
    };
    
    // 重置表单
    const resetForm = () => {
      if (reservationFormRef.value) {
        reservationFormRef.value.resetFields();
      }
      formData.reservation_id = '';
      formData.table_id = '';
      formData.contact_name = '';
      formData.contact_phone = '';
      formData.start_time = '';
      formData.end_time = '';
      formData.duration_hours = 0;
      formData.operator = currentUser.value;
      formData.status = 'pending';
      formData.notes = '';
    };
    
    // 提交表单
    const submitForm = async () => {
      if (reservationFormRef.value) {
        await reservationFormRef.value.validate(async (valid) => {
          if (valid) {
            // 计算时长
            const startDate = new Date(formData.start_time);
            const endDate = new Date(formData.end_time);
            const durationHours = (endDate - startDate) / (1000 * 60 * 60);
            
            if (durationHours <= 0) {
              ElMessage.warning('结束时间必须晚于开始时间');
              return;
            }
            
            formData.duration_hours = Math.round(durationHours * 10) / 10; // 保留一位小数
            
            try {
              let response;
              if (dialogMode.value === 'create') {
                response = await createReservation(formData);
              } else {
                response = await updateReservation(formData);
              }
              
              if (response.success) {
                ElMessage.success(response.message);
                dialogVisible.value = false;
                loadReservations();
              }
            } catch (error) {
              ElMessage.error(dialogMode.value === 'create' ? '创建预订失败' : '更新预订失败');
            }
          }
        });
      }
    };
    
    // 标记到店
    const markArrived = (row) => {
      confirmMessage.value = `确定要将预订 ${row.reservation_id} 标记为已到店吗？`;
      currentAction.value = 'arrived';
      currentReservation.value = row;
      confirmDialogVisible.value = true;
    };
    
    // 取消预订
    const cancelReservation = (row) => {
      confirmMessage.value = `确定要取消预订 ${row.reservation_id} 吗？`;
      currentAction.value = 'cancel';
      currentReservation.value = row;
      confirmDialogVisible.value = true;
    };
    
    // 完成预订
    const completeReservation = (row) => {
      confirmMessage.value = `确定要将预订 ${row.reservation_id} 标记为已完成吗？`;
      currentAction.value = 'complete';
      currentReservation.value = row;
      confirmDialogVisible.value = true;
    };
    
    // 确认操作
    const confirmAction = async () => {
      try {
        let response;
        const id = currentReservation.value.reservation_id;
        
        switch (currentAction.value) {
          case 'arrived':
            response = await markReservationArrived(id);
            break;
          case 'cancel':
            response = await cancelReservation(id);
            break;
          case 'complete':
            response = await completeReservation(id);
            break;
        }
        
        if (response && response.success) {
          ElMessage.success(response.message);
          loadReservations();
        }
      } catch (error) {
        ElMessage.error('操作失败');
      } finally {
        confirmDialogVisible.value = false;
      }
    };
    
    // 分页处理
    const handleSizeChange = (size) => {
      pagination.pageSize = size;
      loadReservations();
    };
    
    const handleCurrentChange = (current) => {
      pagination.currentPage = current;
      loadReservations();
    };
    
    // 生命周期
    onMounted(() => {
      loadTables();
      loadReservations();
    });
    
    return {
      loading,
      reservations,
      tables,
      currentUser,
      searchParams,
      dateRange,
      pagination,
      dialogVisible,
      dialogMode,
      confirmDialogVisible,
      confirmMessage,
      formData,
      reservationFormRef,
      formRules,
      reservationsData,
      availableTables,
      formatDateTime,
      formatDateTimeRange,
      getStatusText,
      searchReservations,
      resetFilters,
      showCreateForm,
      editReservation,
      resetForm,
      submitForm,
      markArrived,
      cancelReservation,
      completeReservation,
      confirmAction,
      handleSizeChange,
      handleCurrentChange
    };
  }
};
</script>

<style scoped>
.reservations-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.top-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background-color: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.top-actions h2 {
  margin: 0;
  color: #303133;
}

.search-section {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.search-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
}

.filter-item {
  display: flex;
  align-items: center;
}

.filter-input {
  width: 200px;
}

.search-buttons {
  display: flex;
  gap: 10px;
}

.table-section {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.pagination-section {
  display: flex;
  justify-content: flex-end;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-pending {
  background-color: #f0f9ff;
  color: #409eff;
}

.status-arrived {
  background-color: #f0f9ff;
  color: #67c23a;
}

.status-completed {
  background-color: #f0f9ff;
  color: #909399;
}

.status-cancelled {
  background-color: #fef0f0;
  color: #f56c6c;
}

.status-expired {
  background-color: #fef0f0;
  color: #e6a23c;
}
</style>