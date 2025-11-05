// 认证中间件
const defineAuthMiddleware = function(req, res, next) {
  // 简单的认证实现，开发环境可以直接通过
  console.log('Auth middleware called');
  // 这里可以添加实际的认证逻辑，如验证token等
  next();
};

module.exports = defineAuthMiddleware;