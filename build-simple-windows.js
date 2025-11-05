const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 开始构建简化版 Windows 便携式应用...')

// 检查必要文件
const requiredFiles = [
  'package.json',
  'vite.config.js',
  'electron/main.js',
  'src/',
  'backend/'
]

console.log('🔍 检查项目文件...')
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.error(`❌ 缺少必要文件: ${file}`)
    process.exit(1)
  }
}
console.log('✅ 项目文件检查完成')

// 清理旧的构建文件
function cleanupOldBuilds() {
  console.log('🧹 清理旧的构建文件...')
  const buildDirs = ['dist', 'release', 'out']
  
  buildDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir)
    if (fs.existsSync(dirPath)) {
      try {
        // 使用简单的删除方法，避免权限问题
        const deleteFolderRecursive = (path) => {
          if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file, index) => {
              const curPath = path + '/' + file
              if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath)
              } else {
                fs.unlinkSync(curPath)
              }
            })
            fs.rmdirSync(path)
          }
        }
        
        deleteFolderRecursive(dirPath)
        console.log(`   ✅ 已清理: ${dir}`)
      } catch (err) {
        console.warn(`   ⚠️  清理 ${dir} 时出错: ${err.message}`)
      }
    }
  })
  
  console.log('✅ 清理完成')
}

// 确保electron-builder配置完全禁用签名
function updateBuilderConfig() {
  console.log('⚙️ 更新构建配置以避免权限问题...')
  
  const configPath = path.join(__dirname, 'electron-builder.config.js')
  if (fs.existsSync(configPath)) {
    const minimalConfig = `module.exports = {
  appId: 'com.billiard.membership.system',
  productName: '台球厅会员管理系统',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'package.json'
  ],
  extraResources: [
    {
      from: 'backend',
      to: 'backend'
    }
  ],
  win: {
    target: 'portable',
    sign: false,
    signingHashAlgorithms: []
  },
  nsis: {
    oneClick: true,
    installPrivileges: 'currentUser'
  },
  electronLanguages: ['zh-CN', 'en-US'],
  // 完全禁用所有可能导致权限问题的选项
  signAndEditExecutable: false,
  notarize: false,
  mac: null,
  linux: null
}`
    
    fs.writeFileSync(configPath, minimalConfig, 'utf-8')
    console.log('✅ 构建配置已更新为最小化版本')
  }
}

// 使用electron-packager进行简单打包
function buildWithElectronPackager() {
  console.log('📦 使用electron-packager构建便携式应用...')
  
  // 确保dist目录已构建
  if (!fs.existsSync(path.join(__dirname, 'dist')) || 
      fs.readdirSync(path.join(__dirname, 'dist')).length === 0) {
    console.log('   📋 先构建前端应用...')
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname })
      console.log('   ✅ 前端构建完成')
    } catch (err) {
      throw new Error('前端构建失败: ' + err.message)
    }
  }
  
  // 创建输出目录
  const outputDir = path.join(__dirname, 'release-simple')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // 执行electron-packager命令，使用最小化选项
  try {
    console.log('   📦 打包Electron应用...')
    const result = spawnSync(
      'npx', 
      [
        'electron-packager',
        '.',
        '台球厅会员管理系统',
        '--platform=win32',
        '--arch=x64',
        '--out=release-simple',
        '--overwrite',
        '--no-prune',
        '--ignore=^/node_modules',
        '--ignore=^/.git',
        '--ignore=^/release',
        '--ignore=^/release-simple',
        '--icon=electron/assets/icon.png',
        '--no-sign'
      ],
      { 
        stdio: 'inherit', 
        cwd: __dirname 
      }
    )
    
    if (result.status !== 0) {
      throw new Error('electron-packager执行失败')
    }
    
    console.log('   ✅ 打包完成')
    
    // 复制backend目录到打包后的应用目录
    const appDirs = fs.readdirSync(outputDir).filter(dir => 
      dir.startsWith('台球厅会员管理系统-win32')
    )
    
    if (appDirs.length > 0) {
      const appDir = path.join(outputDir, appDirs[0])
      console.log(`   📋 复制后端文件到 ${appDir}...`)
      
      // 复制backend目录
      const backendSrc = path.join(__dirname, 'backend')
      const backendDest = path.join(appDir, 'resources', 'backend')
      
      // 确保目标目录存在
      if (!fs.existsSync(path.dirname(backendDest))) {
        fs.mkdirSync(path.dirname(backendDest), { recursive: true })
      }
      
      // 使用简单的复制方法
      const copyFolderRecursive = (src, dest) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true })
        }
        
        fs.readdirSync(src).forEach(file => {
          const srcPath = path.join(src, file)
          const destPath = path.join(dest, file)
          
          if (fs.lstatSync(srcPath).isDirectory()) {
            copyFolderRecursive(srcPath, destPath)
          } else {
            fs.copyFileSync(srcPath, destPath)
          }
        })
      }
      
      copyFolderRecursive(backendSrc, backendDest)
      console.log('   ✅ 后端文件复制完成')
      
      // 创建启动脚本
      const startScript = `@echo off
cd %~dp0\resources\backend
start "Backend Server" node src/app.js
cd %~dp0
echo 正在启动台球厅会员管理系统...
echo 后端服务已启动
start "台球厅会员管理系统" 台球厅会员管理系统.exe
exit`
      
      const startScriptPath = path.join(appDir, 'start.bat')
      fs.writeFileSync(startScriptPath, startScript, 'utf-8')
      console.log(`   ✅ 创建启动脚本: ${startScriptPath}`)
      
      return appDir
    } else {
      throw new Error('未找到打包后的应用目录')
    }
    
  } catch (err) {
    console.error('   ❌ 打包失败:', err.message)
    throw err
  }
}

// 压缩打包结果为ZIP文件（可选）
function compressBuild(appDir) {
  if (!appDir || !fs.existsSync(appDir)) {
    console.warn('⚠️ 跳过压缩步骤，未找到应用目录')
    return
  }
  
  console.log('🗜️  压缩应用为ZIP文件...')
  
  try {
    // 使用简单的方法创建ZIP（通过PowerShell命令）
    const zipPath = path.join(__dirname, 'release-simple', '台球厅会员管理系统-portable.zip')
    const psCommand = `Compress-Archive -Path "${appDir}\*" -DestinationPath "${zipPath}" -Force`
    
    console.log('   📋 执行压缩命令...')
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' })
    console.log(`   ✅ 压缩完成: ${zipPath}`)
    
    return zipPath
  } catch (err) {
    console.warn('⚠️ 压缩失败:', err.message)
    console.warn('   跳过压缩步骤，应用已构建完成')
  }
}

// 主构建函数
async function build() {
  try {
    // 清理旧文件
    cleanupOldBuilds()
    
    // 更新构建配置
    updateBuilderConfig()
    
    // 使用electron-packager构建
    const appDir = buildWithElectronPackager()
    
    // 压缩构建结果
    const zipPath = compressBuild(appDir)
    
    console.log('\n🎉 Windows便携式应用构建完成！')
    console.log(`📍 应用目录: ${appDir}`)
    if (zipPath) {
      console.log(`📍 压缩文件: ${zipPath}`)
    }
    
    console.log('\n📋 使用说明:')
    console.log('   1. 直接运行应用目录中的 start.bat 脚本启动系统')
    console.log('   2. 或手动先启动后端服务，再启动主应用程序')
    console.log('   3. 此版本无需管理员权限，可在 Windows 11 上直接使用')
    
  } catch (error) {
    console.error('\n❌ 构建失败:', error.message)
    console.error('\n📋 故障排除建议:')
    console.error('   1. 尝试使用管理员权限运行命令提示符')
    console.error('   2. 确保Node.js版本兼容 (建议16或18)')
    console.error('   3. 检查杀毒软件是否阻止了文件操作')
    console.error('   4. 尝试手动清理electron-builder缓存: C:\\Users\\用户名\\AppData\\Local\\electron-builder\\Cache')
    process.exit(1)
  }
}

// 执行构建
build()
