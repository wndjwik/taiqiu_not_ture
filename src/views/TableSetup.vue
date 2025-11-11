<template>
  <div class="table-setup-container">
    <!-- 顶部操作区 -->
    <div class="top-actions">
      <h2>球桌管理</h2>
      <el-button type="primary" @click="showAddTableForm">添加球桌</el-button>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        v-loading="loading"
        :data="tables"
        style="width: 100%"
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="table_no" label="桌号" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <span :class="['status-badge', `status-${row.status}`]">
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="price_per_hour" label="每小时价格(元)" width="150" />
        <!-- 移除是否启用列，因为现在使用物理删除 -->
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editTable(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDeleteTableClick(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 布局预览区 -->
    <div class="layout-section">
      <div class="layout-header">
        <h3>球桌布局预览</h3>
        <div class="layout-controls">
          <el-button size="small" type="primary" @click="saveLayout">保存布局</el-button>
        </div>
      </div>
      <div class="layout-preview" ref="layoutPreviewRef">
        <!-- 收银台 -->
        <div 
          class="cashier-desk" 
          :style="cashierStyle"
          @mousedown="startDragging($event, 'cashier')"
        >
          <div class="cashier-label">收银台</div>
        </div>
        
        <!-- 球桌 -->
        <div 
          v-for="table in activeTables" 
          :key="table.table_id"
          :class="['table-item', { 'table-dragging': draggingItem === table.table_id }]"
          :style="getTableStyle(table)"
          @mousedown="startDragging($event, table.table_id)"
        >
          <div class="table-number">{{ table.table_no }}</div>
          <div class="table-actions">
            <el-button 
              size="mini" 
              icon="el-icon-refresh-right" 
              @click.stop="rotateTable(table)"
            ></el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑球桌弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '添加球桌' : '编辑球桌'"
      width="500px"
      @close="resetForm"
    >
      <div style="margin-bottom: 10px; color: #67c23a;">
        {{ dialogMode === 'create' ? '当前模式: 添加球桌' : '当前模式: 编辑球桌' }}
      </div>
      <el-form
        ref="tableFormRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        status-icon
      >
        <el-form-item label="桌号" prop="table_no">
          <el-input v-model="formData.table_no" placeholder="请输入桌号" />
        </el-form-item>
        <el-form-item label="每小时价格" prop="price_per_hour">
          <el-input-number
            v-model="formData.price_per_hour"
            :min="0"
            :step="1"
            placeholder="请输入价格"
          />
        </el-form-item>
        <el-form-item label="宽度(px)" prop="size_width">
          <el-input-number
            v-model="formData.size_width"
            :min="50"
            :step="10"
            placeholder="请输入宽度"
          />
        </el-form-item>
        <el-form-item label="高度(px)" prop="size_height">
          <el-input-number
            v-model="formData.size_height"
            :min="50"
            :step="10"
            placeholder="请输入高度"
          />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="formData.is_active" />
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
      title="删除确认"
      width="400px"
    >
      <p>确定要删除选中的 {{ selectedCount }} 个球桌吗？</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete">确认删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { tableAPI, configAPI } from '@/services/api';

export default {
  name: 'TableSetup',
  setup() {
    // 状态管理
    const loading = ref(false);
    const tables = ref([]);
    const selectedTables = ref([]);
    const selectedCount = computed(() => selectedTables.value.length);
    
    // 对话框
    const dialogVisible = ref(false);
    const dialogMode = ref('create'); // 'create' or 'edit'
    const confirmDialogVisible = ref(false);
    
    // 布局相关
    const layoutPreviewRef = ref(null);
    const draggingItem = ref(null);
    const dragOffset = reactive({ x: 0, y: 0 });
    
    // 收银台位置
    const cashierPosition = reactive({ x: 50, y: 50 });
    const cashierStyle = computed(() => ({
      position: 'absolute',
      left: `${cashierPosition.x}px`,
      top: `${cashierPosition.y}px`,
      width: '120px',
      height: '80px'
    }));
    
    // 表单数据
    const formData = reactive({
      table_id: '',
      table_no: '',
      price_per_hour: 60,
      position_x: 0,
      position_y: 0,
      rotation: 0,
      size_width: 100,
      size_height: 200,
      is_active: true
    });
    
    const tableFormRef = ref(null);
    
    // 表单验证规则
    const formRules = reactive({
      table_no: [{ required: true, message: '请输入桌号', trigger: 'blur' }],
      price_per_hour: [{ required: true, message: '请输入价格', trigger: 'blur' }]
    });
    
    console.log('初始化表单数据:', formData);
    
    // 计算属性：显示所有球桌
    const activeTables = computed(() => {
      return tables.value;
    });
    
    // 获取状态文本
    const getStatusText = (status) => {
      const statusMap = {
        idle: '空闲',
        using: '使用中',
        reserved: '已预订'
      };
      return statusMap[status] || '未知';
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
    
    // 加载球桌数据
    const loadTables = async () => {
      loading.value = true;
      try {
        console.log('开始获取球桌信息...');
        const response = await tableAPI.getAllTables();
        console.log('获取球桌信息响应:', response);
        if (response.success) {
          tables.value = response.data || [];
          console.log('球桌数据:', tables.value);
          // 初始化位置
          tables.value.forEach((table, index) => {
            if (!table.position_x || !table.position_y) {
              table.position_x = 200 + (index % 4) * 150;
              table.position_y = 100 + Math.floor(index / 4) * 250;
            }
            if (!table.size_width || !table.size_height) {
              table.size_width = 100;
              table.size_height = 200;
            }
            if (table.rotation === undefined) {
              table.rotation = 0;
            }
          });
        }
      } catch (error) {
        console.error('获取球桌信息失败:', error);
        console.log('错误详情:', error.response || error.message);
        ElMessage.error('获取球桌数据失败');
      } finally {
        loading.value = false;
      }
    };
    
    // 处理选择变化
    const handleSelectionChange = (selection) => {
      selectedTables.value = selection;
    };
    
    // 显示添加表单
    const showAddTableForm = () => {
      console.log('showAddTableForm 被调用');
      dialogMode.value = 'create';
      resetForm();
      dialogVisible.value = true;
      console.log('打开添加对话框后表单数据:', formData);
    };
    
    // 编辑球桌
    const editTable = (row) => {
      console.log('editTable 被调用，编辑球桌:', row);
      dialogMode.value = 'edit';
      formData.table_id = row.table_id;
      formData.table_no = row.table_no;
      formData.price_per_hour = row.price_per_hour;
      formData.size_width = row.size_width || 100;
      formData.size_height = row.size_height || 200;
      // 移除is_active相关设置，因为现在使用物理删除
      dialogVisible.value = true;
      console.log('编辑模式表单数据:', formData);
    };
    
    // 重置表单
    const resetForm = () => {
      console.log('resetForm 被调用');
      if (tableFormRef.value) {
        tableFormRef.value.resetFields();
        console.log('执行了resetFields');
      }
      // 重置表单数据为初始值
      Object.assign(formData, {
        table_id: '',
        table_no: '',
        price_per_hour: 60,
        size_width: 100,
        size_height: 200
      });
    };
    
    // 提交表单
    const submitForm = async () => {
      console.log('submitForm 函数被调用');
      
      // 直接尝试提交，不依赖表单验证
      console.log('表单数据:', formData);
      // 确保所有必填字段都有值
      if (!formData.table_no) {
        ElMessage.error('请输入球桌号');
        return;
      }
      let response;
      try {
        if (dialogMode.value === 'create') {
          // 计算新位置
          const lastTable = tables.value[tables.value.length - 1];
          let newX = 100;
          let newY = 100;
          if (lastTable) {
            newX = lastTable.position_x + 150;
            newY = lastTable.position_y;
            if (newX > 600) {
              newX = 100;
              newY += 250;
            }
          }
          
          // 移除is_active字段，因为现在使用物理删除
          const { is_active, ...filteredData } = formData;
          const newTableData = {
            ...filteredData,
            position_x: newX,
            position_y: newY,
            rotation: 0
          };
          
          console.log('准备调用tableAPI.addTable API，数据:', newTableData);
          response = await tableAPI.addTable(newTableData);
          console.log('tableAPI.addTable API调用结果:', response);
        } else {
          // 更新模式
          console.log('准备调用tableAPI.updateTable API，ID:', formData.table_id);
          response = await tableAPI.updateTable(formData.table_id, {
            table_no: formData.table_no,
            price_per_hour: formData.price_per_hour,
            size_width: formData.size_width,
            size_height: formData.size_height
          });
          console.log('tableAPI.updateTable API调用结果:', response);
        }
        
        console.log('API响应success状态:', response.success);
        if (response.success) {
          ElMessage.success(response.message);
          dialogVisible.value = false;
          loadTables();
        } else {
          console.log('API调用成功但返回失败状态:', response.message);
          ElMessage.error(response.message || (dialogMode.value === 'create' ? '添加球桌失败' : '更新球桌失败'));
        }
      } catch (error) {
        console.error('API调用异常:', error);
        ElMessage.error(dialogMode.value === 'create' ? '添加球桌失败' : '更新球桌失败');
      }
    };
    
    // 处理删除球桌点击事件
    const handleDeleteTableClick = (row) => {
      console.log('标记要删除的球桌:', row);
      selectedTables.value = [row];
      confirmDialogVisible.value = true;
    };
    
    // 确认删除
    const confirmDelete = async () => {
      try {
        console.log('开始删除球桌:', selectedTables.value);
        // 逐个删除球桌（因为API只支持删除单个球桌）
        let allSuccess = true;
        
        for (const table of selectedTables.value) {
          console.log('正在删除球桌ID:', table.table_id);
          try {
            const response = await tableAPI.deleteTable(table.table_id);
            console.log('删除球桌响应:', response);
            if (!response.success) {
              ElMessage.error(`删除球桌${table.table_no}失败: ${response.message || '未知错误'}`);
              allSuccess = false;
            }
          } catch (err) {
            console.error('删除球桌异常:', err);
            ElMessage.error(`删除球桌${table.table_no}时发生异常`);
            allSuccess = false;
          }
        }
        
        if (allSuccess) {
          ElMessage.success('所有球桌删除成功');
          confirmDialogVisible.value = false;
          selectedTables.value = [];
          loadTables();
        }
      } catch (error) {
        console.error('确认删除过程发生错误:', error);
        ElMessage.error('删除球桌失败');
      }
    };
    
    // 移除更新球桌状态函数，因为现在使用物理删除
    
    // 开始拖拽
    const startDragging = (event, itemId) => {
      event.preventDefault();
      draggingItem.value = itemId;
      
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      dragOffset.x = event.clientX - rect.left;
      dragOffset.y = event.clientY - rect.top;
      
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    };
    
    // 处理拖拽移动
    const handleDragMove = (event) => {
      if (!draggingItem.value || !layoutPreviewRef.value) return;
      
      const container = layoutPreviewRef.value;
      const containerRect = container.getBoundingClientRect();
      
      let x = event.clientX - containerRect.left - dragOffset.x;
      let y = event.clientY - containerRect.top - dragOffset.y;
      
      // 限制在容器内
      x = Math.max(0, Math.min(x, containerRect.width - 100));
      y = Math.max(0, Math.min(y, containerRect.height - 100));
      
      if (draggingItem.value === 'cashier') {
        cashierPosition.x = x;
        cashierPosition.y = y;
      } else {
        const table = tables.value.find(t => t.table_id === draggingItem.value);
        if (table) {
          table.position_x = x;
          table.position_y = y;
        }
      }
    };
    
    // 结束拖拽
    const handleDragEnd = () => {
      draggingItem.value = null;
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
    
    // 旋转球桌
    const rotateTable = (table) => {
      table.rotation = (table.rotation + 90) % 360;
      
      // 交换宽度和高度
      const temp = table.size_width;
      table.size_width = table.size_height;
      table.size_height = temp;
    };
    
    // 保存布局
    const saveLayout = async () => {
      try {
        console.log('开始保存布局，球桌数量:', tables.value.length);
        const layoutData = {
          tables_info: tables.value.map(table => ({
            table_id: table.table_id,
            position: {
              x: table.position_x,
              y: table.position_y
            },
            rotation: table.rotation,
            size: {
              width: table.size_width,
              height: table.size_height
            }
          })),
          // 添加收银台位置信息
          cashier_position: {
            x: cashierPosition.x,
            y: cashierPosition.y
          }
        };
        
        console.log('布局数据准备完成，准备发送请求:', JSON.stringify(layoutData));
        const response = await configAPI.updateTableLayoutWithCashier(layoutData);
        
        console.log('保存布局响应:', response);
        
        if (response.success) {
          ElMessage.success('布局保存成功');
          // 同时保存到本地存储作为备份
          try {
            localStorage.setItem('cashierPosition', JSON.stringify(cashierPosition));
            console.log('收银台位置已备份到本地存储');
          } catch (error) {
            console.error('备份收银台位置到本地存储失败:', error);
          }
        } else {
          console.error('保存布局失败，服务器返回错误:', response.message);
          ElMessage.error('保存布局失败: ' + (response.message || '未知错误'));
          // 发生错误时，至少保存到本地存储
          try {
            localStorage.setItem('cashierPosition', JSON.stringify(cashierPosition));
            console.log('错误情况下，收银台位置已保存到本地存储');
          } catch (localError) {
            console.error('保存收银台位置到本地存储失败:', localError);
          }
        }
      } catch (error) {
        console.error('保存布局异常:', error);
        console.error('错误详情:', error.message, error.stack);
        ElMessage.error('保存布局失败');
        
        // 发生错误时，至少保存到本地存储
        try {
          localStorage.setItem('cashierPosition', JSON.stringify(cashierPosition));
          console.log('错误情况下，收银台位置已保存到本地存储');
        } catch (localError) {
          console.error('保存收银台位置到本地存储失败:', localError);
        }
      }
    };
    
    // 生命周期
    onMounted(async () => {
      await loadTables();
      await loadCashierPosition();
    });
    
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
    
    return {
      loading,
      tables,
      selectedTables,
      selectedCount,
      dialogVisible,
      dialogMode,
      confirmDialogVisible,
      formData,
      tableFormRef,
      formRules,
      layoutPreviewRef,
      draggingItem,
      cashierStyle,
      activeTables,
      getStatusText,
      getTableStyle,
      handleSelectionChange,
      showAddTableForm,
      editTable,
      resetForm,
      submitForm,
      handleDeleteTableClick,
      confirmDelete,
      startDragging,
      rotateTable,
      saveLayout
    };
  }
};
</script>

<style scoped>
.table-setup-container {
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

.table-section {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.layout-section {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.layout-header h3 {
  margin: 0;
  color: #303133;
}

.layout-preview {
  position: relative;
  width: 100%;
  height: 600px;
  background-image: linear-gradient(#e0e0e0 1px, transparent 1px),
                     linear-gradient(90deg, #e0e0e0 1px, transparent 1px);
  background-size: 50px 50px;
  background-color: #f9f9f9;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: auto;
}

.cashier-desk {
  background-color: #409eff;
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: move;
  user-select: none;
}

.cashier-label {
  font-weight: bold;
  font-size: 16px;
}

.table-item {
  background-color: #67c23a;
  border: 2px solid #409eff;
  border-radius: 8px;
  cursor: move;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.table-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.table-item.table-dragging {
  opacity: 0.8;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.table-number {
  color: white;
  font-weight: bold;
  font-size: 18px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.table-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.table-item:hover .table-actions {
  opacity: 1;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-idle {
  background-color: #f0f9ff;
  color: #67c23a;
}

.status-using {
  background-color: #fef0f0;
  color: #f56c6c;
}

.status-reserved {
  background-color: #fdf6ec;
  color: #e6a23c;
}
</style>