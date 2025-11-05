<template>
  <div class="members-container">
    <!-- 搜索和操作栏 -->
    <div class="action-bar">
      <el-row :gutter="10">
        <el-col :span="16">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索会员姓名或手机号"
            clearable
            @change="onSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="8">
          <el-button 
            type="primary" 
            @click="showAddMember"
            :icon="Plus"
          >
            新增会员
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 会员列表 -->
    <el-table 
      :data="memberList" 
      stripe
      style="width: 100%"
      @row-click="showMemberDetail"
    >
      <el-table-column prop="memberId" label="会员编号" width="120" />
      <el-table-column prop="name" label="姓名" width="120">
        <template #default="scope">
          <el-icon><User /></el-icon>
          <span style="margin-left: 8px">{{ scope.row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="gender" label="性别" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.gender === '男' ? 'primary' : 'success'" size="small">
            {{ scope.row.gender || '未设置' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="150">
        <template #default="scope">
          {{ formatPhone(scope.row.phone) }}
        </template>
      </el-table-column>
      <el-table-column prop="balance" label="余额" width="120">
        <template #default="scope">
          ¥{{ formatAmount(scope.row.balance) }}
          <el-tag 
            size="small" 
            :type="scope.row.balance > 0 ? 'success' : 'info'"
            style="margin-left: 8px"
          >
            {{ scope.row.balance > 0 ? '活跃' : '余额为0' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="注册时间" width="180">
        <template #default="scope">
          {{ formatDate(scope.row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="scope">
          <el-button 
            size="small" 
            type="danger" 
            @click.stop="deleteMember(scope.row)"
            :disabled="scope.row.balance > 0"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑会员弹窗 -->
    <el-dialog 
      v-model="showMemberForm" 
      :title="editingMember ? '编辑会员' : '新增会员'"
      width="500px"
    >
      <el-form 
        ref="memberFormRef" 
        :model="memberForm" 
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name" required>
          <el-input 
            v-model="memberForm.name" 
            placeholder="请输入会员姓名" 
          />
        </el-form-item>
        <el-form-item label="手机号" prop="phone" required>
          <el-input 
            v-model="memberForm.phone" 
            placeholder="请输入手机号" 
          />
        </el-form-item>
        <el-form-item label="初始余额" prop="balance" :disabled="editingMember !== null">
          <el-input 
            v-model="memberForm.balance" 
            placeholder="请输入初始余额" 
            type="number"
            :disabled="editingMember !== null"
          />
          <div v-if="editingMember !== null" style="color: #909399; font-size: 12px; margin-top: 5px;">
            编辑时不可修改余额，请使用充值/消费功能调整
          </div>
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="memberForm.gender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        
      </el-form>
      
      <template #footer>
        <el-button @click="closeMemberForm">取消</el-button>
        <el-button type="primary" @click="saveMember">保存</el-button>
      </template>
    </el-dialog>

    <!-- 会员详情弹窗 -->
    <el-dialog 
      v-model="showMemberDetailPopup" 
      title="会员详情"
      width="500px"
      v-if="currentMember"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="姓名">{{ currentMember.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ currentMember.gender || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ formatPhone(currentMember.phone) }}</el-descriptions-item>
        <el-descriptions-item label="余额">¥{{ formatAmount(currentMember.balance) }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ formatDate(currentMember.createTime) }}</el-descriptions-item>
        
      </el-descriptions>
      
      <template #footer>
        <el-button type="primary" @click="editMember(currentMember)">编辑会员</el-button>
        <el-button type="success" @click="showRechargeDialog(currentMember)">充值</el-button>
        <el-button type="warning" @click="showConsumeDialog(currentMember)">消费</el-button>
        <el-button @click="closeMemberDetail">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { Search, Plus, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { memberAPI, rechargeAPI, consumeAPI } from '../services/api.js'
import { memberIPC, rechargeIPC, consumeIPC, checkEnvironment } from '../services/ipc-api.js'
import { generateAndPlayBlessing } from '../services/difyService.js'
import { getUserInfo } from '../stores/user'

// 智能API选择器 - 根据环境自动选择HTTP API或IPC API
const useAPI = () => {
  const env = checkEnvironment();
  
  if (env.isElectron && env.hasElectronAPI) {
    console.log('使用IPC API进行通讯');
    return {
      memberAPI: memberIPC,
      rechargeAPI: rechargeIPC,
      consumeAPI: consumeIPC
    };
  } else {
    console.log('使用HTTP API进行通讯');
    return {
      memberAPI,
      rechargeAPI,
      consumeAPI
    };
  }
};

const { memberAPI: api, rechargeAPI: rechargeApi, consumeAPI: consumeApi } = useAPI();

const searchKeyword = ref('')
const loading = ref(false)
const finished = ref(false)
const showMemberForm = ref(false)
const showMemberDetailPopup = ref(false)
const editingMember = ref(null)
const currentMember = ref(null)

const memberList = ref([])
const memberForm = reactive({
  name: '',
  phone: '',
  balance: 0,
  gender: '' // 添加性别字段，空字符串表示未选择
})

const formatPhone = (phone) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const formatAmount = (amount) => {
  return amount.toLocaleString('zh-CN')
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const onSearch = () => {
  memberList.value = []
  finished.value = false
  loading.value = true
  loadMembers()
}

// 加载会员数据
const loadMembers = async () => {
  try {
    loading.value = true
    const response = await api.getAllMembers()
    memberList.value = response.data.map(member => ({
      id: member.member_id,
      memberId: member.member_id,
      name: member.name,
      phone: member.phone,
      balance: parseFloat(member.balance),
      createTime: member.createdAt,
      gender: member.gender || '',
      notes: member.notes || ''
    }))
    loading.value = false
    finished.value = true
  } catch (error) {
    loading.value = false
    ElMessage.error('加载会员数据失败: ' + error.message)
  }
}

const showAddMember = () => {
  editingMember.value = null
  memberForm.name = ''
  memberForm.phone = ''
  memberForm.balance = 0
  memberForm.gender = '' // 重置性别字段
  showMemberForm.value = true
}

const editMember = (member) => {
  editingMember.value = member
  memberForm.name = member.name
  memberForm.phone = member.phone
  memberForm.balance = member.balance
  memberForm.gender = member.gender || '' // 设置性别字段
  showMemberDetailPopup.value = false
  showMemberForm.value = true
}

const saveMember = async () => {
  if (!memberForm.name || !memberForm.phone) {
    ElMessage.error('请填写完整信息')
    return
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(memberForm.phone)) {
    ElMessage.error('请输入正确的手机号码')
    return
  }
  
  // 验证手机号唯一性
  const existingMember = memberList.value.find(member => 
    member.phone === memberForm.phone && 
    (!editingMember.value || member.memberId !== editingMember.value.memberId)
  )
  
  if (existingMember) {
    ElMessage.error('该手机号码已被其他会员使用')
    return
  }

  try {
    if (editingMember.value) {
        // 编辑会员 - 不包含余额字段
        await api.updateMember(editingMember.value.memberId, {
          name: memberForm.name,
          phone: memberForm.phone,
          gender: memberForm.gender
        })
        ElMessage.success('会员信息更新成功')
      } else {
        // 新增会员 - 使用时间戳生成更唯一的会员编号
        const timestamp = Date.now().toString().slice(-6); // 取时间戳最后6位
        const memberId = `800${timestamp}`
        await api.createMember({
          member_id: memberId,
          name: memberForm.name,
          phone: memberForm.phone,
          gender: memberForm.gender
        })
        ElMessage.success('会员创建成功')
      }

      // 立即重新加载会员列表，确保数据及时更新
        await loadMembers()
        
        closeMemberForm()
        // 立即关闭会员详情弹窗（不检查状态，确保总是关闭）
        closeMemberDetail()
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

const closeMemberForm = () => {
  showMemberForm.value = false
  editingMember.value = null
}

const showMemberDetail = (member) => {
  currentMember.value = member
  showMemberDetailPopup.value = true
}

const showRechargeDialog = async (member) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入充值金额', '会员充值', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /^\d+(\.\d{1,2})?$/,
      inputErrorMessage: '请输入有效的金额（如：100 或 100.50）',
    });
    
    const amount = parseFloat(value)
    if (amount > 0) {
      // 计算充值后的余额
      const afterBalance = member.balance + amount
      
      // 二次确认
      await ElMessageBox.confirm(
        `是否对会员"${member.name}"进行充值，充值后的金额为¥${afterBalance.toFixed(2)}？`,
        '确认充值',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'info',
        }
      )
      
      // 先生成语音祝福文本，不等待播放完成
      let blessingText;
      try {
        const blessingResult = await generateBlessingText({
          memberName: member.name,
          actionType: 'recharge',
          amount: amount,
          gender: member.gender
        });
        blessingText = blessingResult;
      } catch (error) {
        console.log('先生成语音文本失败，将在操作完成后重试:', error);
      }
      
      // 获取当前登录的操作员信息
      const currentUser = getUserInfo()
      const operatorName = currentUser?.name || currentUser?.username || '管理员'
      
      // 用户确认后执行充值
      await rechargeApi.recharge({
        member_id: member.memberId,
        amount: amount,
        operator: operatorName
      })
      ElMessage.success(`充值成功：¥${amount.toFixed(2)}`)
      
      // 立即重新加载会员列表以更新余额
      await loadMembers()
      
      // 关闭会员详情弹窗
      closeMemberDetail()
      
      // 生成并播放充值祝福语音
      try {
        // 使用预设的参数格式调用generateAndPlayBlessing
        generateAndPlayBlessing({
          memberName: member.name,
          actionType: 'recharge',
          amount: amount,
          gender: member.gender
        }, {
          preset: amount >= 500 ? 'energetic' : 'enthusiastic',
          rate: 1.4 // 提高语速以减少感知延迟
        }).catch(err => console.log('语音播放失败:', err));
      } catch (error) {
        console.log('播放语音祝福失败:', error);
        // 不影响主要功能
      }
    }
  } catch (error) {
    // 用户取消输入或操作，不显示错误
    if (error && error !== 'cancel' && error.message) {
      ElMessage.error('充值失败: ' + error.message)
    }
  }
}

const showConsumeDialog = async (member) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入扣款金额', '会员消费', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /^\d+(\.\d{1,2})?$/,
      inputErrorMessage: '请输入有效的金额（如：100 或 100.50）',
    });
    
    const amount = parseFloat(value)
    if (amount > 0) {
      // 检查余额是否足够
      if (amount > member.balance) {
        ElMessage.error('余额不足，无法完成消费')
        return
      }
      
      // 计算消费后的余额
      const afterBalance = member.balance - amount
      
      // 二次确认
      await ElMessageBox.confirm(
        `是否对会员"${member.name}"进行扣款，扣款后的金额为¥${afterBalance.toFixed(2)}？`,
        '确认',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'info',
        }
      )
      
      // 先生成语音祝福文本，不等待播放完成
      let blessingText;
      try {
        const blessingResult = await generateBlessingText({
          memberName: member.name,
          actionType: 'consume',
          amount: amount,
          gender: member.gender,
          balance: afterBalance
        });
        blessingText = blessingResult;
      } catch (error) {
        console.log('先生成语音文本失败，将在操作完成后重试:', error);
      }
      
      // 获取当前登录的操作员信息
      const currentUser = getUserInfo()
      const operatorName = currentUser?.name || currentUser?.username || '管理员'
      
      // 用户确认后执行消费
      await consumeApi.consume({
        member_id: member.memberId,
        amount: amount,
        operator: operatorName
      })
      ElMessage.success(`消费成功：¥${amount.toFixed(2)}`)
      
      // 立即重新加载会员列表以更新余额
      await loadMembers()
      
      // 关闭会员详情弹窗
      closeMemberDetail()
      
      // 生成并播放消费祝福语音
      try {
        // 使用预设的参数格式调用generateAndPlayBlessing
        generateAndPlayBlessing({
          memberName: member.name,
          actionType: 'consume',
          amount: amount,
          gender: member.gender,
          balance: afterBalance
        }, {
          preset: 'friendly',
          rate: 1.4 // 提高语速以减少感知延迟
        }).catch(err => console.log('语音播放失败:', err));
      } catch (error) {
        console.log('播放语音祝福失败:', error);
        // 不影响主要功能
      }
    }
  } catch (error) {
    // 用户取消输入或操作，不显示错误
    if (error && error !== 'cancel' && error.message) {
      ElMessage.error('消费失败: ' + error.message)
    }
  }
}

const closeMemberDetail = () => {
  showMemberDetailPopup.value = false
  currentMember.value = null
}

const deleteMember = async (member) => {
  if (member.balance > 0) {
    ElMessage.error('余额大于0的会员不能删除')
    return
  }

  ElMessageBox.confirm(
    `确定要删除会员"${member.name}"吗？此操作不可恢复。`,
    '确认删除',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await api.deleteMember(member.memberId)
      ElMessage.success('会员删除成功')
      // 重新加载会员列表
      loadMembers()
    } catch (error) {
      ElMessage.error('删除失败: ' + error.message)
    }
  }).catch(() => {
    // 用户取消
  })
}

// 组件挂载时加载数据并预加载语音服务
onMounted(async () => {
  await loadMembers()
  
  // 预加载语音服务，确保在用户操作前已初始化
  preloadSpeechService()
})

// 页面卸载前清理语音队列
onBeforeUnmount(() => {
  // 这里可以添加清理逻辑，如果需要
})

// 预加载语音服务
const preloadSpeechService = () => {
  // 播放一个静默语音以初始化服务
  const preloadSilence = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0; // 静默播放
      speechSynthesis.speak(utterance);
      // 立即停止，仅用于初始化
      setTimeout(() => speechSynthesis.cancel(), 10);
    }
  };
  
  preloadSilence();
};
</script>

<style scoped>
.members-container {
  padding: 20px;
}

.action-bar {
  margin-bottom: 20px;
}

.form-container {
  padding-bottom: 20px;
}

.detail-container {
  padding-bottom: 20px;
}

.member-info {
  margin-bottom: 20px;
}

.action-buttons {
  padding: 0 16px;
}

:deep(.el-descriptions__body) {
  background-color: #f5f7fa;
}

:deep(.el-descriptions__label) {
  width: 100px;
}
</style>