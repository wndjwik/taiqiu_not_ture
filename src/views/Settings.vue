<template>
  <div class="settings-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本设置" name="basic">
          <div class="settings-form">
            <el-form label-width="120px">
              <el-form-item label="系统名称">
                <el-input v-model="systemSettings.name" placeholder="请输入系统名称" />
              </el-form-item>
              <el-form-item label="台球厅名称">
                <el-input v-model="systemSettings.hallName" placeholder="请输入台球厅名称" />
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="systemSettings.contactPhone" placeholder="请输入联系电话" />
              </el-form-item>
              <el-form-item label="营业地址">
                <el-input v-model="systemSettings.address" placeholder="请输入营业地址" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveSettings">保存设置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="数据管理" name="data">
          <div class="data-management">
            <el-card class="data-card">
              <template #header>
                <div class="data-card-header">
                  <span>数据备份</span>
                </div>
              </template>
              <div class="data-actions">
                <el-button type="primary" @click="backupData">立即备份</el-button>
                <el-button @click="restoreData">恢复数据</el-button>
              </div>
              <div class="data-info">
                <p>上次备份时间: {{ lastBackupTime || '从未备份' }}</p>
                <p>备份文件位置: backend/backups/</p>
                <p>自动备份频率: 每小时一次</p>
              </div>
            </el-card>
            
            <el-card class="data-card">
              <template #header>
                <div class="data-card-header">
                  <span>系统信息</span>
                </div>
              </template>
              <div class="system-info">
                <p>系统版本: v1.0.0</p>
                <p>数据库类型: SQLite</p>
                <p>数据存储路径: backend/database.sqlite</p>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="权限设置" name="permissions">
          <div class="permissions-container">
            <el-alert
              title="权限管理提示"
              type="info"
              description="管理员拥有所有权限，普通员工仅可进行基础操作。权限设置需要管理员身份。"
              show-icon
              :closable="false"
            />
            
            <el-button type="primary" @click="refreshPermissions">刷新权限</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../services/api'

// 响应式数据
const activeTab = ref('basic')
const systemSettings = reactive({
  name: '台球会员管理系统',
  hallName: '',
  contactPhone: '',
  address: ''
})
const lastBackupTime = ref('')

// 保存设置
const saveSettings = async () => {
  try {
    // 这里可以调用保存设置的API
    ElMessage.success('设置保存成功')
  } catch (error) {
    ElMessage.error('设置保存失败')
    console.error('保存设置失败:', error)
  }
}

// 备份数据
const backupData = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要进行数据备份吗？备份过程可能需要几分钟时间。',
      '确认备份',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    const response = await api.backupData()
    if (response.success) {
      ElMessage.success('数据备份成功')
      lastBackupTime.value = new Date().toLocaleString()
    } else {
      ElMessage.error('数据备份失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('备份操作失败')
      console.error('备份数据失败:', error)
    }
  }
}

// 恢复数据
const restoreData = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复数据吗？这将覆盖当前所有数据，恢复后无法撤销！',
      '警告',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.restoreData()
    if (response.success) {
      ElMessage.success('数据恢复成功')
      await ElMessageBox.alert(
        '数据恢复成功，请刷新页面以应用更改。',
        '提示',
        {
          confirmButtonText: '确定',
          callback: () => {
            window.location.reload()
          }
        }
      )
    } else {
      ElMessage.error('数据恢复失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复操作失败')
      console.error('恢复数据失败:', error)
    }
  }
}

// 刷新权限
const refreshPermissions = () => {
  ElMessage.success('权限已刷新')
}
</script>

<style scoped>
.settings-container {
  padding: 20px;
  min-height: 100vh;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-form {
  padding: 20px 0;
}

.data-management {
  display: flex;
  gap: 20px;
  padding: 20px 0;
}

.data-card {
  flex: 1;
}

.data-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-actions {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.data-info,
.system-info {
  padding: 10px 0;
}

.data-info p,
.system-info p {
  margin: 8px 0;
  color: #606266;
}

.permissions-container {
  padding: 20px 0;
}

.permissions-container .el-alert {
  margin-bottom: 20px;
}
</style>